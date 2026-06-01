import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nitin_billing.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

username = "admin@nitinhospital.com"
password = "admin@nitinhospital.com"

user = User.objects.filter(username=username).first()

if not user:
    print(f"User {username} not found. Creating now...")
    User.objects.create_superuser(username=username, password=password, email=username)
    print(f"User {username} created successfully!")
else:
    print(f"User {username} found. Updating password to {password}...")
    user.set_password(password)
    user.save()
    print("Password update successful.")
