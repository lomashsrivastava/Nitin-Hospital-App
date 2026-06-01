"""
Management command to set up the initial admin user and seed demo data
Usage: python manage.py setup_initial_data
"""

from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from inventory.models import Medicine, Supplier
from billing.models import Customer
from datetime import date, timedelta
import random


class Command(BaseCommand):
    help = 'Set up initial admin user (nitin123) and seed demo inventory data'

    def handle(self, *args, **options):
        # Create admin user
        if not User.objects.filter(username='nitin123').exists():
            User.objects.create_superuser(
                username='nitin123',
                password='nitin123',
                email='nitin@billing.app',
                first_name='Nitin',
                last_name='Admin',
            )
            self.stdout.write(self.style.SUCCESS('✅ Admin user "nitin123" created'))
        else:
            self.stdout.write(self.style.WARNING('⚠️ User "nitin123" already exists'))

        # Create demo suppliers
        suppliers_data = [
            {'name': 'Sun Pharma Distributors', 'phone': '9876543210', 'gstin': '27AABCS1429B1ZB', 'contact_person': 'Rajesh Kumar'},
            {'name': 'Cipla Limited', 'phone': '9876543211', 'gstin': '27AABCC1234B1ZA', 'contact_person': 'Amit Sharma'},
            {'name': 'Dr. Reddy\'s Labs', 'phone': '9876543212', 'gstin': '27AABCD5678B1ZC', 'contact_person': 'Sanjay Gupta'},
            {'name': 'Lupin Pharma', 'phone': '9876543213', 'gstin': '27AABCL9012B1ZD', 'contact_person': 'Deepak Verma'},
            {'name': 'Mankind Pharma', 'phone': '9876543214', 'gstin': '27AABCM3456B1ZE', 'contact_person': 'Vikash Singh'},
        ]
        
        suppliers = []
        for s_data in suppliers_data:
            supplier, created = Supplier.objects.get_or_create(
                name=s_data['name'],
                defaults=s_data
            )
            suppliers.append(supplier)
            if created:
                self.stdout.write(f'  Created supplier: {supplier.name}')

        # Create demo medicines
        medicines_data = [
            {'name': 'Paracetamol 500mg', 'generic_name': 'Paracetamol', 'category': 'TABLET', 'mrp': 30, 'pp': 18, 'sp': 28, 'gst': 12, 'qty': 500, 'mfg': 'Sun Pharma'},
            {'name': 'Amoxicillin 250mg', 'generic_name': 'Amoxicillin', 'category': 'CAPSULE', 'mrp': 120, 'pp': 72, 'sp': 110, 'gst': 12, 'qty': 200, 'mfg': 'Cipla'},
            {'name': 'Cetirizine 10mg', 'generic_name': 'Cetirizine HCl', 'category': 'TABLET', 'mrp': 45, 'pp': 22, 'sp': 40, 'gst': 12, 'qty': 350, 'mfg': 'Sun Pharma'},
            {'name': 'Azithromycin 500mg', 'generic_name': 'Azithromycin', 'category': 'TABLET', 'mrp': 180, 'pp': 95, 'sp': 165, 'gst': 12, 'qty': 100, 'mfg': 'Cipla'},
            {'name': 'Omeprazole 20mg', 'generic_name': 'Omeprazole', 'category': 'CAPSULE', 'mrp': 85, 'pp': 42, 'sp': 78, 'gst': 12, 'qty': 250, 'mfg': 'Dr. Reddy\'s'},
            {'name': 'Metformin 500mg', 'generic_name': 'Metformin HCl', 'category': 'TABLET', 'mrp': 65, 'pp': 30, 'sp': 58, 'gst': 5, 'qty': 400, 'mfg': 'Lupin'},
            {'name': 'Amlodipine 5mg', 'generic_name': 'Amlodipine Besylate', 'category': 'TABLET', 'mrp': 50, 'pp': 25, 'sp': 45, 'gst': 12, 'qty': 300, 'mfg': 'Mankind'},
            {'name': 'Cough Syrup 100ml', 'generic_name': 'Dextromethorphan', 'category': 'SYRUP', 'mrp': 95, 'pp': 52, 'sp': 88, 'gst': 12, 'qty': 150, 'mfg': 'Sun Pharma'},
            {'name': 'Ibuprofen 400mg', 'generic_name': 'Ibuprofen', 'category': 'TABLET', 'mrp': 35, 'pp': 18, 'sp': 32, 'gst': 12, 'qty': 450, 'mfg': 'Cipla'},
            {'name': 'Vitamin D3 60K', 'generic_name': 'Cholecalciferol', 'category': 'CAPSULE', 'mrp': 140, 'pp': 70, 'sp': 125, 'gst': 5, 'qty': 200, 'mfg': 'Dr. Reddy\'s'},
            {'name': 'Pantoprazole 40mg', 'generic_name': 'Pantoprazole', 'category': 'TABLET', 'mrp': 110, 'pp': 55, 'sp': 100, 'gst': 12, 'qty': 180, 'mfg': 'Sun Pharma'},
            {'name': 'Betadine Ointment 20g', 'generic_name': 'Povidone Iodine', 'category': 'CREAM', 'mrp': 65, 'pp': 38, 'sp': 60, 'gst': 18, 'qty': 80, 'mfg': 'Mankind'},
            {'name': 'Eye Drops 10ml', 'generic_name': 'Ciprofloxacin', 'category': 'DROPS', 'mrp': 75, 'pp': 40, 'sp': 70, 'gst': 12, 'qty': 60, 'mfg': 'Cipla'},
            {'name': 'ORS Powder', 'generic_name': 'Oral Rehydration Salts', 'category': 'POWDER', 'mrp': 25, 'pp': 12, 'sp': 22, 'gst': 5, 'qty': 500, 'mfg': 'Mankind'},
            {'name': 'Insulin Injection', 'generic_name': 'Insulin', 'category': 'INJECTION', 'mrp': 450, 'pp': 280, 'sp': 420, 'gst': 5, 'qty': 30, 'mfg': 'Lupin'},
            {'name': 'Bandage Roll 6cm', 'generic_name': 'Cotton Bandage', 'category': 'SURGICAL', 'mrp': 40, 'pp': 20, 'sp': 35, 'gst': 18, 'qty': 100, 'mfg': 'Mankind'},
            {'name': 'Ashwagandha Tablet', 'generic_name': 'Withania Somnifera', 'category': 'AYURVEDIC', 'mrp': 250, 'pp': 120, 'sp': 230, 'gst': 12, 'qty': 90, 'mfg': 'Lupin'},
            {'name': 'Dolo 650mg', 'generic_name': 'Paracetamol', 'category': 'TABLET', 'mrp': 32, 'pp': 16, 'sp': 29, 'gst': 12, 'qty': 600, 'mfg': 'Sun Pharma'},
            {'name': 'Montelukast 10mg', 'generic_name': 'Montelukast Sodium', 'category': 'TABLET', 'mrp': 160, 'pp': 80, 'sp': 145, 'gst': 12, 'qty': 5, 'mfg': 'Cipla'},  # Low stock
            {'name': 'Expired Test Med', 'generic_name': 'Test', 'category': 'TABLET', 'mrp': 50, 'pp': 25, 'sp': 45, 'gst': 12, 'qty': 20, 'mfg': 'Test'},  # Expired
        ]

        today = date.today()
        for idx, m_data in enumerate(medicines_data):
            # Set expiry: most expire in future, last one is expired
            if m_data['name'] == 'Expired Test Med':
                expiry = today - timedelta(days=30)
            elif m_data['name'] == 'Montelukast 10mg':
                expiry = today + timedelta(days=20)  # Expiring soon
            else:
                expiry = today + timedelta(days=random.randint(180, 720))

            batch = f"BT{random.randint(10000, 99999)}"
            supplier = suppliers[idx % len(suppliers)]

            medicine, created = Medicine.objects.get_or_create(
                name=m_data['name'],
                batch_number=batch,
                defaults={
                    'generic_name': m_data['generic_name'],
                    'category': m_data['category'],
                    'manufacturer': m_data['mfg'],
                    'mrp': m_data['mrp'],
                    'purchase_price': m_data['pp'],
                    'selling_price': m_data['sp'],
                    'gst_rate': m_data['gst'],
                    'quantity': m_data['qty'],
                    'expiry_date': expiry,
                    'supplier': supplier,
                    'min_stock_level': 10,
                    'unit': 'Strip' if m_data['category'] in ['TABLET', 'CAPSULE'] else 'Pcs',
                }
            )
            if created:
                self.stdout.write(f'  Created medicine: {medicine.name}')

        # Create demo customers
        customers_data = [
            {'name': 'Rahul Sharma', 'phone': '9998887770', 'credit_balance': 500},
            {'name': 'Priya Singh', 'phone': '9998887771'},
            {'name': 'Amit Kumar', 'phone': '9998887772', 'credit_balance': 1200},
        ]
        
        for c_data in customers_data:
            customer, created = Customer.objects.get_or_create(
                phone=c_data['phone'],
                defaults=c_data
            )
            if created:
                self.stdout.write(f'  Created customer: {customer.name}')

        self.stdout.write(self.style.SUCCESS(
            f'\n✅ Setup complete!\n'
            f'   Username: nitin123\n'
            f'   Password: nitin123\n'
            f'   Medicines: {Medicine.objects.count()}\n'
            f'   Suppliers: {Supplier.objects.count()}\n'
            f'   Customers: {Customer.objects.count()}'
        ))
