"""
Inventory Serializers
"""

from rest_framework import serializers
from .models import Medicine, Supplier


class SupplierSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    medicine_count = serializers.SerializerMethodField()

    class Meta:
        model = Supplier
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']


    def get_medicine_count(self, obj):
        return obj.medicines.count()


class SupplierListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for dropdowns"""
    id = serializers.CharField(read_only=True)
    class Meta:
        model = Supplier
        fields = ['id', 'name', 'phone', 'gstin']



class MedicineSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True, default='')
    is_low_stock = serializers.BooleanField(read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    is_expiring_soon = serializers.BooleanField(read_only=True)
    profit_margin = serializers.FloatField(read_only=True)

    class Meta:
        model = Medicine
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']



class MedicineListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for search/billing"""
    id = serializers.CharField(read_only=True)
    supplier_name = serializers.CharField(source='supplier.name', read_only=True, default='')

    class Meta:
        model = Medicine
        fields = [
            'id', 'name', 'generic_name', 'batch_number', 'barcode',
            'category', 'mrp', 'selling_price', 'purchase_price',
            'gst_rate', 'quantity', 'unit', 'expiry_date',
            'supplier_name', 'is_low_stock', 'is_expired'
        ]

