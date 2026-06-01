"""
Purchases Models - Purchase orders and items for stock entry
"""

from django.db import models
from inventory.models import Supplier, Medicine


class Purchase(models.Model):
    """Purchase order from supplier"""
    purchase_number = models.CharField(max_length=50, unique=True, db_index=True)
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, related_name='purchases')
    supplier_name = models.CharField(max_length=255, blank=True, default='')
    invoice_number = models.CharField(max_length=100, blank=True, default='', help_text='Supplier invoice number')
    
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Purchase #{self.purchase_number}"

    @staticmethod
    def generate_purchase_number():
        """Generate next purchase number: PO-YYYYMMDD-XXXX"""
        from django.utils import timezone
        today = timezone.now()
        prefix = f"PO-{today.strftime('%Y%m%d')}"
        last = Purchase.objects.filter(
            purchase_number__startswith=prefix
        ).order_by('-purchase_number').first()
        
        if last:
            try:
                last_num = int(last.purchase_number.split('-')[-1])
                next_num = last_num + 1
            except (ValueError, IndexError):
                next_num = 1
        else:
            next_num = 1
        
        return f"{prefix}-{next_num:04d}"


class PurchaseItem(models.Model):
    """Individual item in a purchase order"""
    purchase = models.ForeignKey(Purchase, on_delete=models.CASCADE, related_name='items')
    medicine = models.ForeignKey(Medicine, on_delete=models.SET_NULL, null=True, related_name='purchase_items')
    medicine_name = models.CharField(max_length=255)
    batch_number = models.CharField(max_length=100, blank=True, default='')
    
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    
    gst_rate = models.IntegerField(default=12)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    # For new medicine creation during purchase
    expiry_date = models.DateField(null=True, blank=True)
    mrp = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    selling_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f"{self.medicine_name} x{self.quantity}"

    def calculate_totals(self):
        line_total = float(self.unit_price) * self.quantity
        self.tax_amount = round(line_total * float(self.gst_rate) / 100, 2)
        self.total = round(line_total + self.tax_amount, 2)
