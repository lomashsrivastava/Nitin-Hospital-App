import os
import django
import random

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nitin_billing.settings')
django.setup()

from hospital.models import Room

def seed_rooms():
    print("Starting room seeding...")
    
    # Clear existing rooms to avoid unique constraint issues if re-running
    # or just start fresh if the user wants. 
    # For safe execution, I'll only add rooms that don't exist.
    
    rooms_to_create = []
    
    # Floor 0: 50 Emergency rooms
    for i in range(1, 51):
        room_num = f"G-{i:03d}"
        if not Room.objects.filter(room_number=room_num).exists():
            rooms_to_create.append(Room(
                room_number=room_num,
                room_type='EMERGENCY',
                floor=0,
                bed_count=1,
                is_occupied=False
            ))
            
    # Floors 1-29: 50 rooms each
    room_distribution = [
        ('GENERAL_WARD', 20, 5), # (type, count, beds_per_room)
        ('PRIVATE_WARD', 10, 2),
        ('PRIVATE_ROOM', 10, 1),
        ('SEMI_LUXURY', 5, 1),
        ('STAFF_ROOM', 3, 0),    # bed_count 0 for non-patient rooms
        ('NURSE_STATION', 2, 0)
    ]
    
    for floor in range(1, 30):
        print(f"Generating rooms for Floor {floor}...")
        room_idx = 1
        for rtype, count, beds in room_distribution:
            for _ in range(count):
                room_num = f"{floor:02d}-{room_idx:03d}"
                if not Room.objects.filter(room_number=room_num).exists():
                    rooms_to_create.append(Room(
                        room_number=room_num,
                        room_type=rtype,
                        floor=floor,
                        bed_count=beds,
                        is_occupied=False
                    ))
                room_idx += 1
                
    if rooms_to_create:
        print(f"Bulk creating {len(rooms_to_create)} rooms...")
        Room.objects.bulk_create(rooms_to_create)
        print("Success!")
    else:
        print("No new rooms to create.")

if __name__ == "__main__":
    seed_rooms()
