"""
Check the running server's database configuration by making a real request.
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nitin_billing.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from django.db import connection
from django.conf import settings

print("=== Django DB Config ===")
db_settings = settings.DATABASES['default']
print(f"ENGINE:  {db_settings.get('ENGINE')}")
print(f"NAME:    {db_settings.get('NAME')}")
host_str = str(db_settings.get('CLIENT', {}).get('host', ''))
# Mask password
if '@' in host_str:
    parts = host_str.split('@')
    masked = parts[0].split(':')
    masked[-1] = '***'
    print(f"HOST:    {':'.join(masked)}@{parts[1]}")

print()
print("=== Django ORM Collection Check ===")
from hospital.models import Department, Doctor
print(f"Department count via ORM: {Department.objects.count()}")
print(f"Doctor count via ORM:     {Doctor.objects.count()}")

# Check via pymongo where they actually are
from pymongo import MongoClient
from dotenv import load_dotenv
load_dotenv()

client = MongoClient(os.getenv('MONGODB_URI'))

print()
print("=== Direct pymongo scan ===")
for db_name in client.list_database_names():
    db = client[db_name]
    for coll in db.list_collection_names():
        xcount = db[coll].count_documents({})
        if xcount > 0:
            print(f"  {db_name}.{coll}: {xcount} docs")
            sample = db[coll].find_one({})
            print(f"    Sample keys: {list(sample.keys())[:8]}")
