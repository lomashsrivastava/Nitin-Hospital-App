"""
Inventory Views - CRUD + search + alerts for Medicines and Suppliers
"""

from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Q, F, Sum
from datetime import timedelta
from django.conf import settings

from .models import Medicine, Supplier
from .serializers import (
    MedicineSerializer, MedicineListSerializer,
    SupplierSerializer, SupplierListSerializer
)
from authentication.views import log_activity


class SupplierViewSet(viewsets.ModelViewSet):
    """Full CRUD for suppliers"""
    queryset = Supplier.objects.filter(is_active=True)
    serializer_class = SupplierSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'phone', 'gstin', 'contact_person']
    ordering_fields = ['name', 'created_at']

    @action(detail=False, methods=['get'])
    def dropdown(self, request):
        """Get lightweight list for dropdowns"""
        suppliers = self.get_queryset()
        return Response(SupplierListSerializer(suppliers, many=True).data)

    def perform_destroy(self, instance):
        """Soft delete"""
        instance.is_active = False
        instance.save()


class MedicineViewSet(viewsets.ModelViewSet):
    """Full CRUD for medicines with search, alerts, and stock management"""
    queryset = Medicine.objects.filter(is_active=True).select_related('supplier')
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'generic_name', 'batch_number', 'barcode', 'manufacturer']
    ordering_fields = ['name', 'quantity', 'expiry_date', 'selling_price', 'created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return MedicineListSerializer
        return MedicineSerializer

    def perform_create(self, serializer):
        medicine = serializer.save()
        log_activity(self.request.user, 'ADD_MEDICINE', f'Added: {medicine.name} (Batch: {medicine.batch_number})', self.request)

    def perform_update(self, serializer):
        medicine = serializer.save()
        log_activity(self.request.user, 'UPDATE_MEDICINE', f'Updated: {medicine.name}', self.request)

    def perform_destroy(self, instance):
        """Soft delete"""
        log_activity(self.request.user, 'DELETE_MEDICINE', f'Deleted: {instance.name}', self.request)
        instance.is_active = False
        instance.save()

    @action(detail=False, methods=['get'])
    def search(self, request):
        """Smart search - instant search by name, barcode, batch, generic name"""
        query = request.query_params.get('q', '').strip()
        if len(query) < 1:
            return Response([])

        medicines = Medicine.objects.filter(
            is_active=True
        ).filter(
            Q(name__icontains=query) |
            Q(generic_name__icontains=query) |
            Q(barcode__icontains=query) |
            Q(batch_number__icontains=query) |
            Q(manufacturer__icontains=query)
        ).select_related('supplier')[:20]

        return Response(MedicineListSerializer(medicines, many=True).data)
    
    @action(detail=False, methods=['get'])
    def suggest_batches(self, request):
        """FIFO Logic: Suggest earliest expiring batches first for a given medicine name"""
        name = request.query_params.get('name', '').strip()
        if not name:
            return Response([])
        
        # Filter by exact name or generic name, only active, with stock, and not expired
        batches = Medicine.objects.filter(
            is_active=True,
            quantity__gt=0,
            expiry_date__gt=timezone.now().date()
        ).filter(
            Q(name__iexact=name) | Q(generic_name__iexact=name)
        ).order_by('expiry_date') # FIFO: earliest expiry first
        
        return Response(MedicineListSerializer(batches, many=True).data)

    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """Get medicines with low stock"""
        medicines = Medicine.objects.filter(
            is_active=True,
            quantity__lte=F('min_stock_level')
        ).select_related('supplier')
        return Response(MedicineListSerializer(medicines, many=True).data)

    @action(detail=False, methods=['get'])
    def expiring(self, request):
        """Get medicines expiring soon or already expired"""
        alert_days = int(request.query_params.get('days', settings.EXPIRY_ALERT_DAYS))
        cutoff_date = timezone.now().date() + timedelta(days=alert_days)
        
        medicines = Medicine.objects.filter(
            is_active=True,
            expiry_date__lte=cutoff_date,
            quantity__gt=0
        ).select_related('supplier').order_by('expiry_date')
        
        return Response(MedicineListSerializer(medicines, many=True).data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get inventory statistics for dashboard"""
        total = Medicine.objects.filter(is_active=True)
        low_stock_count = total.filter(quantity__lte=F('min_stock_level')).count()
        
        alert_days = settings.EXPIRY_ALERT_DAYS
        cutoff_date = timezone.now().date() + timedelta(days=alert_days)
        expiring_count = total.filter(expiry_date__lte=cutoff_date, quantity__gt=0).count()
        expired_count = total.filter(expiry_date__lte=timezone.now().date(), quantity__gt=0).count()
        
        total_value_agg = total.filter(quantity__gt=0).aggregate(
            val=Sum(F('selling_price') * F('quantity'))
        )['val'] or 0
        total_value = float(total_value_agg)
        
        return Response({
            'total_medicines': total.count(),
            'low_stock_count': low_stock_count,
            'expiring_count': expiring_count,
            'expired_count': expired_count,
            'total_stock_value': round(total_value, 2),
            'out_of_stock': total.filter(quantity=0).count(),
        })
