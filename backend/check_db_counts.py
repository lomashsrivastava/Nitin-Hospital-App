import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nitin_billing.settings')
django.setup()

from hospital.models import Department, Doctor, Staff, Room, Patient, MasterInvoice, Appointment
from billing.models import Invoice
from inventory.models import Medicine

models = [Department, Doctor, Staff, Room, Patient, Invoice, MasterInvoice, Medicine, Appointment]

print("--- Collection Counts ---")
for model in models:
    try:
        count = model.objects.count()
        print(f"{model.__name__}: {count}")
    except Exception as e:
        print(f"{model.__name__}: ERROR {e}")
