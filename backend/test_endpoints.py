import os
import django
from django.test import Client

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nitin_billing.settings')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

endpoints = [
    '/api/hospital/doctors/',
    '/api/hospital/staff/',
    '/api/hospital/patients/',
    '/api/hospital/appointments/',
    '/api/hospital/lab-tests/',
    '/api/hospital/departments/',
    '/api/hospital/ambulance-vehicles/',
    '/api/hospital/ambulance-dispatch/'
]

try:
    user = User.objects.get(username='nitin123')
    client = Client()
    client.force_login(user)
    
    for endpoint in endpoints:
        print(f"Testing {endpoint} ...")
        response = client.get(endpoint)
        if response.status_code == 200:
            print(f"SUCCESS {endpoint}")
        else:
            print(f"FAILED {endpoint}: Status {response.status_code}\n{response.content[:500]}\n")
except Exception as e:
    print(f"ERROR: {e}")
