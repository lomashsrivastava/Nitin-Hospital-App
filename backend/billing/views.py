"""
Billing Views - Create invoices, list invoices, generate PDFs
"""

from rest_framework import viewsets, status, generics, serializers
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.http import HttpResponse
from decimal import Decimal

from .models import Invoice, InvoiceItem, Customer
from .serializers import (
    InvoiceSerializer, InvoiceListSerializer, InvoiceCreateSerializer,
    CustomerSerializer
)
from inventory.models import Medicine
from authentication.views import log_activity
from .pdf_generator import generate_invoice_pdf


from django.db import models as db_models


class CustomerViewSet(viewsets.ModelViewSet):
    """CRUD for customers"""
    queryset = Customer.objects.all()
    serializer_class = CustomerSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def search(self, request):
        q = request.query_params.get('q', '').strip()
        if len(q) < 1:
            return Response([])
        customers = Customer.objects.filter(
            db_models.Q(name__icontains=q) | db_models.Q(phone__icontains=q)
        )[:10]
        return Response(CustomerSerializer(customers, many=True).data)


class InvoiceViewSet(viewsets.ModelViewSet):
    """Invoice management with auto-calculation and stock updates"""
    queryset = Invoice.objects.all().select_related('customer', 'patient').prefetch_related('items')
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return InvoiceListSerializer
        return InvoiceSerializer

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Create a new invoice with items, auto-calculate GST, update stock"""
        serializer = InvoiceCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Create invoice
        invoice = Invoice(
            invoice_number=Invoice.generate_invoice_number(),
            customer_name=data.get('customer_name', 'Walk-in Customer'),
            customer_phone=data.get('customer_phone', ''),
            payment_method=data.get('payment_method', 'CASH'),
            discount_type=data.get('discount_type', 'FIXED'),
            discount_value=data.get('discount_value', 0),
            notes=data.get('notes', ''),
            status='COMPLETED',
        )

        # Link customer if provided
        customer_id = data.get('customer_id')
        if customer_id:
            try:
                invoice.customer = Customer.objects.get(id=customer_id)
            except Customer.DoesNotExist:
                pass

        # Link patient if provided
        patient_id = data.get('patient_id')
        if patient_id:
            from hospital.models import Patient
            try:
                invoice.patient = Patient.objects.get(id=patient_id)
                invoice.customer_name = invoice.patient.name
                invoice.customer_phone = invoice.patient.contact_number
            except Patient.DoesNotExist:
                pass

        invoice.save()

        # Process items
        subtotal = Decimal('0')
        total_cgst = Decimal('0')
        total_sgst = Decimal('0')
        total_igst = Decimal('0')
        total_tax = Decimal('0')

        for item_data in data['items']:
            try:
                medicine = Medicine.objects.get(id=item_data['medicine_id'])
            except Medicine.DoesNotExist:
                raise serializers.ValidationError(f"Medicine with ID {item_data['medicine_id']} not found")

            # Check stock
            qty = item_data['quantity']
            if medicine.quantity < qty:
                raise serializers.ValidationError(
                    f"Insufficient stock for {medicine.name}. Available: {medicine.quantity}"
                )

            item = InvoiceItem(
                invoice=invoice,
                medicine=medicine,
                medicine_name=medicine.name,
                batch_number=medicine.batch_number,
                quantity=qty,
                unit_price=item_data['unit_price'],
                discount=item_data.get('discount', 0),
                gst_rate=item_data.get('gst_rate', medicine.gst_rate),
            )
            item.calculate_totals()
            item.save()

            # Update stock
            medicine.quantity -= qty
            medicine.save()

            subtotal += Decimal(str(item.unit_price)) * qty
            total_cgst += Decimal(str(item.cgst))
            total_sgst += Decimal(str(item.sgst))
            total_igst += Decimal(str(item.igst))
            total_tax += Decimal(str(item.tax_amount))

        # Calculate invoice totals
        invoice.subtotal = subtotal
        
        # Apply invoice-level discount
        if invoice.discount_type == 'PERCENTAGE':
            invoice.discount_amount = round(subtotal * invoice.discount_value / 100, 2)
        else:
            invoice.discount_amount = invoice.discount_value

        invoice.taxable_amount = subtotal - invoice.discount_amount
        invoice.cgst = total_cgst
        invoice.sgst = total_sgst
        invoice.igst = total_igst
        invoice.total_tax = total_tax
        invoice.total = invoice.taxable_amount + total_tax

        # Payment
        amount_paid = data.get('amount_paid', invoice.total)
        if amount_paid is None:
            amount_paid = invoice.total
        invoice.amount_paid = amount_paid
        invoice.change_amount = max(Decimal('0'), Decimal(str(amount_paid)) - invoice.total)

        # Handle credit
        if invoice.payment_method == 'CREDIT' and invoice.customer:
            invoice.customer.credit_balance += invoice.total
            invoice.customer.save()

        invoice.save()

        # Mark prescriptions as dispensed
        prescription_ids = data.get('prescription_ids', [])
        if prescription_ids:
            from hospital.models import ConsultationPrescription
            ConsultationPrescription.objects.filter(id__in=prescription_ids).update(is_dispensed=True)

        log_activity(
            request.user, 'CREATE_INVOICE',
            f'Invoice #{invoice.invoice_number}, Total: ₹{invoice.total}',
            request
        )

        return Response(
            InvoiceSerializer(invoice).data,
            status=status.HTTP_201_CREATED
        )

    @action(detail=True, methods=['post'])
    def return_items(self, request, pk=None):
        """Return items from an invoice and restore stock"""
        invoice = self.get_object()
        items_to_return = request.data.get('items', []) # List of {item_id, quantity}
        
        if not items_to_return:
            return Response({'error': 'No items specified for return'}, status=400)
            
        with transaction.atomic():
            for ret_data in items_to_return:
                try:
                    item = invoice.items.get(id=ret_data['item_id'])
                    qty = int(ret_data['quantity'])
                    
                    if qty > item.quantity:
                        return Response({'error': f'Cannot return more than sold for {item.medicine_name}'}, status=400)
                    
                    if item.medicine:
                        item.medicine.quantity += qty
                        item.medicine.save()
                    
                    item.quantity -= qty
                    if item.quantity == 0:
                        item.delete() # Or mark as returned
                    else:
                        item.calculate_totals()
                        item.save()
                except:
                    continue
            
            # Recalculate invoice totals
            items = invoice.items.all()
            subtotal = sum(Decimal(str(i.unit_price)) * i.quantity for i in items)
            total_tax = sum(i.tax_amount for i in items)
            
            invoice.subtotal = subtotal
            if invoice.discount_type == 'PERCENTAGE':
                invoice.discount_amount = round(subtotal * invoice.discount_value / 100, 2)
            else:
                invoice.discount_amount = min(invoice.discount_value, subtotal)
            
            invoice.taxable_amount = subtotal - invoice.discount_amount
            invoice.total_tax = total_tax
            invoice.total = invoice.taxable_amount + total_tax
            invoice.save()

        log_activity(request.user, 'RETURN_INVOICE', f'Returned items for Invoice #{invoice.invoice_number}', request)
        return Response(InvoiceSerializer(invoice).data)

    @action(detail=True, methods=['get'])
    def pdf(self, request, pk=None):
        """Generate and download PDF invoice"""
        invoice = self.get_object()
        pdf_buffer = generate_invoice_pdf(invoice)
        
        response = HttpResponse(pdf_buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="Invoice_{invoice.invoice_number}.pdf"'
        return response

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel an invoice and restore stock"""
        invoice = self.get_object()
        
        if invoice.status == 'CANCELLED':
            return Response({'error': 'Invoice is already cancelled'}, status=400)

        with transaction.atomic():
            # Restore stock
            for item in invoice.items.all():
                if item.medicine:
                    item.medicine.quantity += item.quantity
                    item.medicine.save()

            # Restore credit if applicable
            if invoice.payment_method == 'CREDIT' and invoice.customer:
                invoice.customer.credit_balance -= invoice.total
                invoice.customer.save()

            invoice.status = 'CANCELLED'
            invoice.save()

        log_activity(request.user, 'CREATE_INVOICE', f'Cancelled Invoice #{invoice.invoice_number}', request)
        return Response(InvoiceSerializer(invoice).data)

    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """Get billing stats for dashboard"""
        from django.utils import timezone
        from django.db.models import Sum, Count
        from datetime import datetime, time

        today = timezone.now().date()
        today_start = timezone.make_aware(datetime.combine(today, time.min))
        today_end = timezone.make_aware(datetime.combine(today, time.max))
        
        # Today's sales - Aggregate in DB
        today_stats = Invoice.objects.filter(
            created_at__gte=today_start, created_at__lt=today_end, status='COMPLETED'
        ).aggregate(total=Sum('total'), count=Count('id'))

        # This month's sales - Aggregate in DB
        month_start = today.replace(day=1)
        month_start_dt = timezone.make_aware(datetime.combine(month_start, time.min))
        month_stats = Invoice.objects.filter(
            created_at__gte=month_start_dt, status='COMPLETED'
        ).aggregate(total=Sum('total'), count=Count('id'))

        # Recent invoices - select_related to avoid N+1
        recent = Invoice.objects.filter(status='COMPLETED').select_related('customer', 'patient')[:5]

        return Response({
            'today_sales': float(today_stats['total'] or 0),
            'today_count': today_stats['count'] or 0,
            'month_sales': float(month_stats['total'] or 0),
            'month_count': month_stats['count'] or 0,
            'recent_invoices': InvoiceListSerializer(recent, many=True).data,
        })
