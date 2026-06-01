import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nitin_billing.settings')
django.setup()

from hospital.models import Doctor, Staff

doctors = Doctor.objects.all()
print(f"Total Doctors: {doctors.count()}")

staff_roles = {}
all_staff = Staff.objects.all()
for s in all_staff:
    role = s.role
    staff_roles[role] = staff_roles.get(role, 0) + 1

print("Staff by Role:")
for role, count in staff_roles.items():
    print(f"- {role}: {count}")
