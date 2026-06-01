import os
import sys
import django

os.environ['DJANGO_SETTINGS_MODULE'] = 'nitin_billing.settings'
sys.path.insert(0, '.')
django.setup()

from hospital.models import Department

departments_list = [
    "General Medicine",
    "Internal Medicine",
    "Family Medicine",
    "General Surgery",
    "Orthopedics",
    "Cardiology",
    "Cardiac Surgery",
    "Neurology",
    "Neurosurgery",
    "Psychiatry",
    "Psychology",
    "Dermatology",
    "Cosmetology",
    "Plastic Surgery",
    "Pediatrics",
    "Neonatology",
    "Gynecology",
    "Obstetrics",
    "Oncology",
    "Radiation Oncology",
    "Gastroenterology",
    "Hepatology",
    "Nephrology",
    "Urology",
    "Endocrinology",
    "Diabetology",
    "Pulmonology",
    "Critical Care / ICU",
    "Emergency Medicine",
    "Anesthesiology",
    "Radiology",
    "Pathology",
    "Microbiology",
    "Hematology",
    "Immunology",
    "Rheumatology",
    "Infectious Diseases",
    "Geriatrics",
    "Sports Medicine",
    "Physiotherapy",
    "Rehabilitation Medicine",
    "Dentistry",
    "Oral & Maxillofacial Surgery",
    "Ophthalmology",
    "ENT (Otorhinolaryngology)",
    "Nuclear Medicine",
    "Pain Management",
    "Palliative Care",
    "Sleep Medicine",
    "Preventive Medicine"
]

existing_departments = set(Department.objects.values_list('name', flat=True))

departments_to_create = []
for dept_name in departments_list:
    if dept_name not in existing_departments:
        departments_to_create.append(Department(name=dept_name, description=f"{dept_name} Department"))

if departments_to_create:
    Department.objects.bulk_create(departments_to_create)
    print(f"Successfully added {len(departments_to_create)} new departments.")
else:
    print("All departments provided already exist in the database.")
