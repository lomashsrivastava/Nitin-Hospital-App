"""
Billing Models - Invoice, InvoiceItem, Customer with full GST support
"""

from django.db import models
from django.conf import settings
from inventory.models import Medicine


class Customer(models.Model):
    """Customer with optional credit (udhaar) tracking"""
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20, blank=True, default='')
    email = models.EmailField(blank=True, default='')
    address = models.TextField(blank=True, default='')
    gstin = models.CharField(max_length=15, blank=True, default='', verbose_name='GSTIN')
    credit_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text='Udhaar amount')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.phone})"


class Invoice(models.Model):
    """Sales invoice with GST calculations"""
    PAYMENT_CHOICES = [
        ('CASH', 'Cash'),
        ('UPI', 'UPI'),
        ('CARD', 'Card'),
        ('CREDIT', 'Credit (Udhaar)'),
        ('MIXED', 'Mixed Payment'),
    ]

    DISCOUNT_TYPE_CHOICES = [
        ('FIXED', 'Fixed Amount'),
        ('PERCENTAGE', 'Percentage'),
    ]

    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    ]

    invoice_number = models.CharField(max_length=50, unique=True, db_index=True)
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name='invoices')
    patient = models.ForeignKey('hospital.Patient', on_delete=models.SET_NULL, null=True, blank=True, related_name='invoices')
    customer_name = models.CharField(max_length=255, blank=True, default='Walk-in Customer')
    customer_phone = models.CharField(max_length=20, blank=True, default='')
    
    # Financials
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_type = models.CharField(max_length=10, choices=DISCOUNT_TYPE_CHOICES, default='FIXED')
    discount_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    taxable_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    cgst = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name='CGST')
    sgst = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name='SGST')
    igst = models.DecimalField(max_digits=10, decimal_places=2, default=0, verbose_name='IGST')
    total_tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Payment
    payment_method = models.CharField(max_length=10, choices=PAYMENT_CHOICES, default='CASH')
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    change_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Status
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='COMPLETED')
    notes = models.TextField(blank=True, default='')
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Invoice #{self.invoice_number}"

    @staticmethod
    def generate_invoice_number():
        """Generate next invoice number: NB-YYYYMMDD-XXXX"""
        from django.utils import timezone
        today = timezone.now()
        prefix = f"{getattr(settings, 'INVOICE_PREFIX', 'NB')}-{today.strftime('%Y%m%d')}"
        last_invoice = Invoice.objects.filter(
            invoice_number__startswith=prefix
        ).order_by('-invoice_number').first()
        
        if last_invoice:
            try:
                last_num = int(last_invoice.invoice_number.split('-')[-1])
                next_num = last_num + 1
            except (ValueError, IndexError):
                next_num = 1
        else:
            next_num = 1
        
        return f"{prefix}-{next_num:04d}"


class InvoiceItem(models.Model):
    """Individual line item in an invoice"""
    invoice = models.ForeignKey(Invoice, on_delete=models.CASCADE, related_name='items')
    medicine = models.ForeignKey(Medicine, on_delete=models.SET_NULL, null=True, related_name='invoice_items')
    medicine_name = models.CharField(max_length=255)  # Store name for historical reference
    batch_number = models.CharField(max_length=100, blank=True, default='')
    
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Per-item discount
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # GST
    gst_rate = models.IntegerField(default=12)
    cgst = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    sgst = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    igst = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    total = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f"{self.medicine_name} x{self.quantity}"

    def calculate_totals(self):
        """Calculate GST and total for this item"""
        line_total = float(self.unit_price) * self.quantity
        after_discount = line_total - float(self.discount)
        
        gst = float(self.gst_rate) / 100
        self.tax_amount = round(after_discount * gst, 2)
        # Split GST into CGST and SGST (intra-state)
        self.cgst = round(self.tax_amount / 2, 2)
        self.sgst = round(self.tax_amount / 2, 2)
        self.igst = 0  # Set to tax_amount for inter-state
        self.total = round(after_discount + self.tax_amount, 2)
