import os
import django
from django.test import Client

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nitin_billing.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

try:
    user = User.objects.get(username='nitin123')
    client = Client()
    client.force_login(user)
    
    print("Testing /api/reports/daily-sales/ ...")
    response = client.get('/api/reports/daily-sales/')
    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        print("SUCCESS! Data received.")
    else:
        print(f"FAILED! {response.content}")
except Exception as e:
    print(f"ERROR: {e}")
