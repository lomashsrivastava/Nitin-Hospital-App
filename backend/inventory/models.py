"""
Inventory Models - Medicine and Supplier management
"""

from django.db import models
from django.conf import settings


class Supplier(models.Model):
    """Supplier/Distributor of medicines"""
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20, blank=True, default='')
    email = models.EmailField(blank=True, default='')
    address = models.TextField(blank=True, default='')
    gstin = models.CharField(max_length=15, blank=True, default='', verbose_name='GSTIN')
    contact_person = models.CharField(max_length=255, blank=True, default='')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Medicine(models.Model):
    """Medicine/Product in inventory"""
    GST_CHOICES = [
        (0, 'Exempt (0%)'),
        (5, 'GST 5%'),
        (12, 'GST 12%'),
        (18, 'GST 18%'),
        (28, 'GST 28%'),
    ]

    CATEGORY_CHOICES = [
        ('TABLET', 'Tablet'),
        ('CAPSULE', 'Capsule'),
        ('SYRUP', 'Syrup'),
        ('INJECTION', 'Injection'),
        ('CREAM', 'Cream/Ointment'),
        ('DROPS', 'Drops'),
        ('POWDER', 'Powder'),
        ('SURGICAL', 'Surgical'),
        ('AYURVEDIC', 'Ayurvedic'),
        ('OTHER', 'Other'),
    ]

    name = models.CharField(max_length=255, db_index=True)
    generic_name = models.CharField(max_length=255, blank=True, default='')
    batch_number = models.CharField(max_length=100, db_index=True)
    barcode = models.CharField(max_length=100, blank=True, default='', db_index=True)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='TABLET')
    manufacturer = models.CharField(max_length=255, blank=True, default='')
    
    # Pricing
    mrp = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='MRP')
    purchase_price = models.DecimalField(max_digits=10, decimal_places=2)
    selling_price = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Tax
    gst_rate = models.IntegerField(choices=GST_CHOICES, default=12, verbose_name='GST Rate (%)')
    hsn_code = models.CharField(max_length=20, blank=True, default='', verbose_name='HSN Code')
    
    # Stock
    quantity = models.IntegerField(default=0)
    min_stock_level = models.IntegerField(default=10, help_text='Alert when stock falls below this')
    unit = models.CharField(max_length=50, default='Pcs', help_text='e.g., Pcs, Strip, Bottle')
    
    # Dates
    expiry_date = models.DateField()
    manufacturing_date = models.DateField(null=True, blank=True)
    
    # Relations
    supplier = models.ForeignKey(Supplier, on_delete=models.SET_NULL, null=True, blank=True, related_name='medicines')
    
    # Metadata
    description = models.TextField(blank=True, default='')
    rack_location = models.CharField(max_length=50, blank=True, default='', help_text='Storage location')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['name', 'batch_number']),
            models.Index(fields=['expiry_date']),
            models.Index(fields=['quantity']),
        ]

    def __str__(self):
        return f"{self.name} (Batch: {self.batch_number})"

    @property
    def is_low_stock(self):
        return self.quantity <= self.min_stock_level

    @property
    def is_expired(self):
        from django.utils import timezone
        return self.expiry_date <= timezone.now().date()

    @property
    def is_expiring_soon(self):
        from django.utils import timezone
        from datetime import timedelta
        alert_days = getattr(settings, 'EXPIRY_ALERT_DAYS', 90)
        return self.expiry_date <= (timezone.now().date() + timedelta(days=alert_days))

    @property
    def profit_margin(self):
        if self.purchase_price > 0:
            return float((self.selling_price - self.purchase_price) / self.purchase_price * 100)
        return 0
