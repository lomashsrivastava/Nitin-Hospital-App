from django.contrib import admin
from .models import Medicine, Supplier

@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'gstin', 'is_active', 'created_at']
    search_fields = ['name', 'phone', 'gstin']
    list_filter = ['is_active']

@admin.register(Medicine)
class MedicineAdmin(admin.ModelAdmin):
    list_display = ['name', 'batch_number', 'category', 'selling_price', 'quantity', 'expiry_date']
    search_fields = ['name', 'batch_number', 'barcode']
    list_filter = ['category', 'gst_rate', 'is_active']
    list_editable = ['quantity']
