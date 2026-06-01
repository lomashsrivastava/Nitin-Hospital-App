import os, sys, django, json, urllib.request, urllib.error
os.environ['DJANGO_SETTINGS_MODULE'] = 'nitin_billing.settings'
sys.path.insert(0, '.')
django.setup()

from hospital.models import Staff

first = Staff.objects.first()
if not first:
    print("No staff found!")
    sys.exit(1)

staff_id = str(first.pk)
print(f"Testing DELETE for Staff ID: {staff_id} ({first.name})")

# Get token
data = json.dumps({'username': 'nitin123', 'password': 'nitin123'}).encode()
req = urllib.request.Request(
    'http://127.0.0.1:8000/api/auth/login/',
    data=data,
    headers={'Content-Type': 'application/json'}
)
res = urllib.request.urlopen(req)
token = json.loads(res.read().decode())['access']
print(f"Token obtained: {token[:30]}...")

# Test DELETE
req2 = urllib.request.Request(
    f'http://127.0.0.1:8000/api/hospital/staff/{staff_id}/',
    method='DELETE',
    headers={'Authorization': f'Bearer {token}'}
)
try:
    urllib.request.urlopen(req2)
    print("DELETE OK - 204 No Content. Staff deleted successfully.")
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"DELETE FAILED: HTTP {e.code}")
    print(f"Response: {body}")
