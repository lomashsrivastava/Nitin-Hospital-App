import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nitin_billing.settings')
django.setup()

from hospital.models import Room

def seed_rooms():
    # Floor 1 to 10: 5 normal rooms each
    for floor in range(1, 11):
        for num in range(1, 6):
            room_number = f"{floor}{num:02d}" # outputs 101, 102, 201, 202 etc.
            Room.objects.get_or_create(
                room_number=room_number,
                defaults={
                    'room_type': 'NORMAL',
                    'floor': floor,
                    'bed_count': 1,
                    'is_occupied': False
                }
            )

    # 4 General Wards
    for i in range(1, 5):
        Room.objects.get_or_create(
            room_number=f"GW-{i}",
            defaults={
                'room_type': 'GENERAL_WARD',
                'floor': 1,
                'bed_count': 20, # General wards have multiple beds
                'is_occupied': False
            }
        )
        
    # 5 Emergency Rooms on 1st Floor
    for i in range(1, 6):
        Room.objects.get_or_create(
            room_number=f"ER-{i}",
            defaults={
                'room_type': 'EMERGENCY',
                'floor': 1,
                'bed_count': 5, # ERs usually have a few beds
                'is_occupied': False
            }
        )

    print("59 Hospital Rooms successfully generated!")

if __name__ == '__main__':
    seed_rooms()
