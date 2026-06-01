import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nitin_billing.settings')
django.setup()

from hospital.models import Room

count = Room.objects.count()
print(f"Total Rooms: {count}")

floors = Room.objects.values_list('floor', flat=True).distinct()
print(f"Unique Floors: {sorted(list(floors))}")

for f in sorted(list(floors)):
    print(f"Floor {f}: {Room.objects.filter(floor=f).count()} rooms")
