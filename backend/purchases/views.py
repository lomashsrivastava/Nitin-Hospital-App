"""
Purchases Views - Create purchases with auto stock update
"""

from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from decimal import Decimal

from .models import Purchase, PurchaseItem
from .serializers import (
    PurchaseSerializer, PurchaseListSerializer, PurchaseCreateSerializer
)
from inventory.models import Medicine, Supplier
from authentication.views import log_activity


class PurchaseViewSet(viewsets.ModelViewSet):
    """Purchase management with auto stock updates"""
    queryset = Purchase.objects.all().select_related('supplier').prefetch_related('items', 'items__medicine')
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return PurchaseListSerializer
        return PurchaseSerializer

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Create purchase and auto-update inventory stock"""
        serializer = PurchaseCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        # Create purchase
        purchase = Purchase(
            purchase_number=Purchase.generate_purchase_number(),
            supplier_name=data.get('supplier_name', ''),
            invoice_number=data.get('invoice_number', ''),
            notes=data.get('notes', ''),
        )

        # Link supplier
        supplier_id = data.get('supplier_id')
        if supplier_id:
            try:
                supplier = Supplier.objects.get(id=supplier_id)
                purchase.supplier = supplier
                purchase.supplier_name = supplier.name
            except Supplier.DoesNotExist:
                pass

        purchase.save()

        subtotal = Decimal('0')
        total_tax = Decimal('0')

        for item_data in data['items']:
            medicine = None
            medicine_id = item_data.get('medicine_id')

            if medicine_id:
                try:
                    medicine = Medicine.objects.select_for_update().get(id=medicine_id)
                    # Update existing medicine stock
                    medicine.quantity += item_data['quantity']
                    if item_data.get('unit_price'):
                        medicine.purchase_price = item_data['unit_price']
                    if item_data.get('mrp'):
                        medicine.mrp = item_data['mrp']
                    if item_data.get('selling_price'):
                        medicine.selling_price = item_data['selling_price']
                    if item_data.get('expiry_date'):
                        medicine.expiry_date = item_data['expiry_date']
                    if item_data.get('batch_number'):
                        medicine.batch_number = item_data['batch_number']
                    medicine.save()
                except Medicine.DoesNotExist:
                    medicine = None

            if not medicine and item_data.get('expiry_date'):
                # Create new medicine entry
                medicine = Medicine.objects.create(
                    name=item_data['medicine_name'],
                    batch_number=item_data.get('batch_number', ''),
                    expiry_date=item_data['expiry_date'],
                    mrp=item_data.get('mrp', item_data['unit_price']),
                    purchase_price=item_data['unit_price'],
                    selling_price=item_data.get('selling_price', item_data['unit_price']),
                    quantity=item_data['quantity'],
                    gst_rate=item_data.get('gst_rate', 12),
                    supplier=purchase.supplier,
                )

            item = PurchaseItem(
                purchase=purchase,
                medicine=medicine,
                medicine_name=item_data['medicine_name'],
                batch_number=item_data.get('batch_number', ''),
                quantity=item_data['quantity'],
                unit_price=item_data['unit_price'],
                gst_rate=item_data.get('gst_rate', 12),
                expiry_date=item_data.get('expiry_date'),
                mrp=item_data.get('mrp'),
                selling_price=item_data.get('selling_price'),
            )
            item.calculate_totals()
            item.save()

            subtotal += Decimal(str(item.unit_price)) * item.quantity
            total_tax += Decimal(str(item.tax_amount))

        purchase.subtotal = subtotal
        purchase.tax_amount = total_tax
        purchase.total = subtotal + total_tax
        purchase.save()

        log_activity(
            request.user, 'CREATE_PURCHASE',
            f'Purchase #{purchase.purchase_number}, Total: ₹{purchase.total}',
            request
        )

        return Response(
            PurchaseSerializer(purchase).data,
            status=status.HTTP_201_CREATED
        )
