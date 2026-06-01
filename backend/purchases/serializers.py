"""
Purchases Serializers
"""

from rest_framework import serializers
from .models import Purchase, PurchaseItem


class PurchaseItemSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    class Meta:
        model = PurchaseItem
        fields = '__all__'
        read_only_fields = ['purchase', 'tax_amount', 'total']



class PurchaseItemCreateSerializer(serializers.Serializer):
    medicine_id = serializers.CharField(required=False, allow_null=True)
    medicine_name = serializers.CharField(max_length=255)
    batch_number = serializers.CharField(max_length=100, default='')
    quantity = serializers.IntegerField(min_value=1)
    unit_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    gst_rate = serializers.IntegerField(default=12)
    expiry_date = serializers.DateField(required=False, allow_null=True)
    mrp = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)
    selling_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False, allow_null=True)



class PurchaseCreateSerializer(serializers.Serializer):
    supplier_id = serializers.CharField(required=False, allow_null=True)
    supplier_name = serializers.CharField(max_length=255, default='')
    invoice_number = serializers.CharField(max_length=100, default='')
    notes = serializers.CharField(required=False, default='')
    items = PurchaseItemCreateSerializer(many=True)



class PurchaseSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    items = PurchaseItemSerializer(many=True, read_only=True)
    supplier_detail_name = serializers.CharField(source='supplier.name', read_only=True, default='')

    class Meta:
        model = Purchase
        fields = '__all__'
        read_only_fields = ['purchase_number', 'subtotal', 'tax_amount', 'total', 'created_at', 'updated_at']



class PurchaseListSerializer(serializers.ModelSerializer):
    id = serializers.CharField(read_only=True)
    item_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Purchase
        fields = ['id', 'purchase_number', 'supplier_name', 'total', 'invoice_number', 'created_at', 'item_count']


    def get_item_count(self, obj):
        return obj.items.count()
