import os
import django
from dotenv import load_dotenv

# Load env variables
load_dotenv()

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'nitin_billing.settings')
django.setup()

from hospital.models import Department, Doctor

from pymongo import MongoClient

def check():
    uri = os.getenv('MONGODB_URI')
    client = MongoClient(uri)
    print("Scanning Atlas Databases...")
    for db_name in client.list_database_names():
        if db_name in ['admin', 'local', 'config']: continue
        db = client[db_name]
        for coll_name in db.list_collection_names():
            try:
                count = db[coll_name].count_documents({'name': 'Dermatology'})
                if count > 0:
                    print(f"FOUND 'Dermatology' in Database: {db_name}, Collection: {coll_name}")
                    # List all departments in this collection
                    deps = db[coll_name].find({})
                    print(f"Departments in {db_name}.{coll_name}:")
                    for d in deps:
                        print(f" - {d.get('name')} (ID: {d.get('_id')})")
            except Exception as e:
                pass

if __name__ == "__main__":
    check()

