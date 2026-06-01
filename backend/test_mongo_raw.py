import os
import pymongo
from dotenv import load_dotenv

load_dotenv()

uri = os.environ.get('MONGODB_URI')
db_name = os.environ.get('DB_NAME', 'nitin_medical')

print(f"Connecting to: {uri.split('@')[-1]}") # Hide credentials in print

try:
    client = pymongo.MongoClient(uri, serverSelectionTimeoutMS=5000)
    # The ping command is cheap and does not require auth.
    client.admin.command('ping')
    print("Pinged your deployment. You successfully connected to MongoDB!")
    
    db = client[db_name]
    print(f"Accessing database: {db_name}")
    
    # Try to list collections
    collections = db.list_collection_names()
    print(f"Collections found: {collections}")
    
    # Check for user in auth_user (Django default) or authentication_user
    # Based on INSTALLED_APPS, it might be 'authentication_user' or 'auth_user'
    user_coll = db['auth_user'] if 'auth_user' in collections else db['authentication_user']
    user = user_coll.find_one({"username": "nitin123"})
    if user:
        print(f"Found user nitin123: {user.get('username')}")
    else:
        print("User nitin123 NOT found in raw database.")

except Exception as e:
    print(f"ERROR: {e}")
