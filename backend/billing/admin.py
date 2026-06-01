from django.contrib import admin
from .models import Invoice, InvoiceItem, Customer

class InvoiceItemInline(admin.TabularInline):
    model = InvoiceItem
    extra = 0
    readonly_fields = ['medicine_name', 'batch_number', 'quantity', 'unit_price', 'tax_amount', 'total']

@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'credit_balance', 'created_at']
    search_fields = ['name', 'phone']

@admin.register(Invoice)
class InvoiceAdmin(admin.ModelAdmin):
    list_display = ['invoice_number', 'customer_name', 'total', 'payment_method', 'status', 'created_at']
    list_filter = ['status', 'payment_method', 'created_at']
    search_fields = ['invoice_number', 'customer_name']
    inlines = [InvoiceItemInline]
    readonly_fields = ['invoice_number', 'subtotal', 'discount_amount', 'cgst', 'sgst', 'total_tax', 'total']
