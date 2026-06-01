import os
import django
import random
from datetime import timedelta, datetime, time

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nitin_billing.settings')
django.setup()

from hospital.models import (
    Department, Doctor, Staff, Room, Patient, 
    ConsultationRecord, MasterInvoice, InvoiceItem,
    Appointment, LabTest
)
from django.utils import timezone

def seed_hospital_full():
    print("Starting Super-Seed Operation...")

    # Clear existing data
    print("Clearing clinical records...")
    ConsultationRecord.objects.all().delete()
    Patient.objects.all().delete()
    Doctor.objects.all().delete()
    Staff.objects.all().delete()
    Department.objects.all().delete()
    Room.objects.all().delete()

    # 1. Departments
    dept_names = [
        "Cardiology", "Neurology", "Radiology", "Oncology", 
        "Pediatrics", "Emergency", "Orthopedics", "Dermatology",
        "Pathology", "General Medicine", "Surgery", "ICU",
        "Outpatient", "Psychiatry", "Urology", "Dental",
        "Physiotherapy", "Gastroenterology", "ENT", "Ophthalmology"
    ]
    
    depts = []
    print(f"Creating {len(dept_names)} Departments...")
    for name in dept_names:
        dept = Department.objects.create(name=name)
        depts.append(dept)

    # 2. Rooms (1,500 Rooms)
    print("Seeding 1,500 Rooms across 30 Floors...")
    rooms = []
    for floor in range(1, 31):
        for r_num in range(1, 51):
            room_id = f"{floor:02d}{r_num:02d}"
            
            # Zoning
            if floor <= 20:
                r_type = 'NORMAL'
                if r_num <= 5: r_type = 'PRIVATE_ROOM'
                elif r_num <= 10: r_type = 'LUXURY_SUITE'
                elif floor == 5: r_type = 'EMERGENCY'
            else:
                # Staff Floors
                if floor <= 25: r_type = 'NURSE_QUARTERS'
                elif floor <= 28: r_type = 'DOCTOR_HOUSING'
                else: r_type = 'STAFF_QUARTERS'
            
            rooms.append(Room(
                room_number=room_id,
                floor=floor,
                room_type=r_type,
                current_status='AVAILABLE'
            ))
    Room.objects.bulk_create(rooms)
    print("Rooms ready.")

    # 3. Doctors (50)
    print("Onboarding 50 Doctors...")
    doctor_names = ["Arjun", "Neha", "Vikram", "Priya", "Rahul", "Sonia", "Karan", "Anjali", "Suresh", "Meena", 
                    "Rajiv", "Kavita", "Amit", "Deepa", "Sunil", "Ritu", "Manoj", "Asha", "Vijay", "Lata"]
    last_names = ["Sharma", "Verma", "Gupta", "Malhotra", "Kapoor", "Singh", "Joshi", "Iyer", "Chopra", "Reddy"]
    
    specialties = ["Specialist", "Senior Consultant", "Head of Dept", "Junior Doctor"]
    
    doctors = []
    housing_rooms = list(Room.objects.filter(room_type='DOCTOR_HOUSING'))
    
    for i in range(50):
        name = f"{random.choice(doctor_names)} {random.choice(last_names)}"
        dept = random.choice(depts)
        spec = f"{dept.name} {random.choice(specialties)}"
        
        doc = Doctor.objects.create(
            name=name,
            specialization=spec,
            department=dept,
            contact_number=f"98{random.randint(10000000, 99999999)}",
            email=f"{name.lower().replace(' ', '.')}@hospital.com",
            consultation_fee=random.choice([500, 800, 1200, 1500, 2000]),
            opd_timings="Mon-Sat 10AM-4PM"
        )
        doctors.append(doc)
        
        if housing_rooms:
            h_room = housing_rooms.pop()
            h_room.current_status = 'OCCUPIED'
            h_room.assigned_doctor = doc
            h_room.occupant_type = 'D'
            h_room.save()

    # 4. Staff (100)
    print("Registering 100 Hospital Staff...")
    roles = ["Nurse", "Receptionist", "Security", "Lab Tech", "Pharmacist"]
    staff_list = []
    nurse_rooms = list(Room.objects.filter(room_type='NURSE_QUARTERS'))
    
    for i in range(100):
        name = f"{random.choice(doctor_names)} {random.choice(last_names)} (Staff)"
        role = random.choice(roles)
        s = Staff.objects.create(
            name=name,
            role=role,
            department=random.choice(depts),
            contact_number=f"88{random.randint(10000000, 99999999)}",
            salary=random.randint(25000, 60000),
            shift_timings="8AM - 8PM"
        )
        staff_list.append(s)
        
        if role == "Nurse" and nurse_rooms:
            nr = nurse_rooms.pop()
            nr.current_status = 'OCCUPIED'
            nr.assigned_staff = s
            nr.occupant_type = 'N'
            nr.save()

    # 5. Patients (200)
    print("Admitting 200 Patients...")
    ailments = ["Fever", "Fracture", "Headache", "Surgery Recovery", "Checkup", "Diabetes", "Hypertension", "Viral Infection"]
    patient_list = []
    clinical_rooms = list(Room.objects.filter(room_type='NORMAL'))
    
    for i in range(200):
        p_name = f"Patient {i+1001}"
        p_doc = random.choice(doctors)
        p = Patient.objects.create(
            name=p_name,
            age=random.randint(5, 80),
            gender=random.choice(['M', 'F']),
            contact_number=f"77{random.randint(10000000, 99999999)}",
            ailment=random.choice(ailments),
            assigned_doctor=p_doc
        )
        patient_list.append(p)
        
        if random.random() < 0.3 and clinical_rooms:
            c_room = clinical_rooms.pop()
            p.assigned_room = c_room
            p.save()
            c_room.current_status = 'OCCUPIED'
            c_room.occupant_type = 'P'
            c_room.save()
            
        # Create history
        for _ in range(random.randint(1, 3)):
            hist_doc = random.choice(doctors)
            ConsultationRecord.objects.create(
                patient=p,
                doctor=hist_doc,
                symptoms=f"Patient reports symptoms related to {p.ailment}.",
                diagnosis=f"Clinical diagnosis of {p.ailment}.",
                clinical_notes="Prescribed standard medicine and rest."
            )

    print("Success: Super-Seed Complete! Hospital is now fully operational.")

if __name__ == "__main__":
    seed_hospital_full()
