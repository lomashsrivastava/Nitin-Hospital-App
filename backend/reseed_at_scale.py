import os
import django
import random

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nitin_billing.settings')
django.setup()

from hospital.models import Room, Doctor, Staff

def reseed_building():
    print("Clearing existing rooms...")
    Room.objects.all().delete()
    
    rooms_to_create = []
    
    # 0: Emergency (50)
    for i in range(1, 51):
        rooms_to_create.append(Room(room_number=f"G-{i:03d}", room_type='EMERGENCY', floor=0, bed_count=1))

    # 1-6: General Ward (300)
    for floor in range(1, 7):
        for i in range(1, 51):
            rooms_to_create.append(Room(room_number=f"{floor:02d}-{i:03d}", room_type='GENERAL_WARD', floor=floor, bed_count=4))

    # 7-12: Private Ward (300)
    for floor in range(7, 13):
        for i in range(1, 51):
            rooms_to_create.append(Room(room_number=f"{floor:02d}-{i:03d}", room_type='PRIVATE_WARD', floor=floor, bed_count=2))

    # 13-16: Semi-Luxury (200)
    for floor in range(13, 17):
        for i in range(1, 51):
            rooms_to_create.append(Room(room_number=f"{floor:02d}-{i:03d}", room_type='SEMI_LUXURY', floor=floor, bed_count=1))

    # 17-20: Luxury Suites (200)
    for floor in range(17, 21):
        for i in range(1, 51):
            rooms_to_create.append(Room(room_number=f"{floor:02d}-{i:03d}", room_type='LUXURY_SUITE', floor=floor, bed_count=1))

    # 21-25: Nurse Quarters (250)
    for floor in range(21, 26):
        for i in range(1, 51):
            rooms_to_create.append(Room(room_number=f"{floor:02d}-{i:03d}", room_type='NURSE_QUARTERS', floor=floor, bed_count=1))

    # 26-28: Doctor Housing (150)
    for floor in range(26, 29):
        for i in range(1, 51):
            rooms_to_create.append(Room(room_number=f"{floor:02d}-{i:03d}", room_type='DOCTOR_HOUSING', floor=floor, bed_count=1))

    # 29: Security & Staff quarters (50)
    for i in range(1, 26):
        rooms_to_create.append(Room(room_number=f"29-{i:03d}", room_type='SECURITY_POST', floor=29, bed_count=1))
    for i in range(26, 51):
        rooms_to_create.append(Room(room_number=f"29-{i:03d}", room_type='STAFF_QUARTERS', floor=29, bed_count=1))

    print(f"Building {len(rooms_to_create)} rooms...")
    Room.objects.bulk_create(rooms_to_create)
    print("Building Ready!")

    # --- ALLOCATION LOGIC ---
    print("Starting Staff Allocation...")
    
    # 1. Doctors
    docs = Doctor.objects.all()
    housing_docs = Room.objects.filter(room_type='DOCTOR_HOUSING', current_status='AVAILABLE')
    for doc, room in zip(docs, housing_docs):
        room.assigned_doctor = doc
        room.current_status = 'OCCUPIED'
        room.occupant_type = 'D'
        room.save()
    print(f"Assigned {min(docs.count(), housing_docs.count())} Doctors to permanent housing.")

    # 2. Nurses
    nurses = Staff.objects.filter(role__icontains='Nurse') | Staff.objects.filter(role__icontains='GNM') | Staff.objects.filter(role__icontains='ANM')
    housing_nurses = Room.objects.filter(room_type='NURSE_QUARTERS', current_status='AVAILABLE')
    for nurse, room in zip(nurses, housing_nurses):
        room.assigned_staff = nurse
        room.current_status = 'OCCUPIED'
        room.occupant_type = 'N'
        room.save()
    print(f"Assigned {min(nurses.count(), housing_nurses.count())} Nurses to permanent quarters.")

    # 3. Security
    security = Staff.objects.filter(role__icontains='Security') | Staff.objects.filter(role__icontains='Guard')
    housing_sec = Room.objects.filter(room_type='SECURITY_POST', current_status='AVAILABLE')
    for sec, room in zip(security, housing_sec):
        room.assigned_staff = sec
        room.current_status = 'OCCUPIED'
        room.occupant_type = 'S'
        room.save()
    print(f"Assigned {min(security.count(), housing_sec.count())} Security Personnel to posts.")

    # 4. Other Staff (Remaining Quarters)
    other_staff = Staff.objects.exclude(id__in=nurses.values_list('id', flat=True)).exclude(id__in=security.values_list('id', flat=True))
    housing_staff = Room.objects.filter(room_type='STAFF_QUARTERS', current_status='AVAILABLE')
    for staff, room in zip(other_staff, housing_staff):
        room.assigned_staff = staff
        room.current_status = 'OCCUPIED'
        room.occupant_type = 'S'
        room.save()
    print(f"Assigned {min(other_staff.count(), housing_staff.count())} Supporting Staff members.")

    # Final Stats
    total_occ = Room.objects.filter(current_status='OCCUPIED').count()
    print(f"\nFINAL OCCUPANCY: {total_occ} rooms booked. {Room.objects.filter(current_status='AVAILABLE').count()} rooms remaining for patients.")

if __name__ == "__main__":
    reseed_building()
