import requests
import json

# Backend URL
BASE_URL = "http://localhost:8000/api"

def test_full_auth_flow():
    # 1. Login
    login_url = f"{BASE_URL}/auth/login/"
    creds = {"username": "nitin123", "password": "nitin123"}
    
    print(f"POST {login_url} ...")
    try:
        res = requests.post(login_url, json=creds)
        print(f"Status: {res.status_code}")
        if res.status_code != 200:
            print(f"Error Response: {res.text}")
            return
        
        data = res.json()
        access_token = data.get('access')
        print(f"Login Success! Access Token obtained (truncated): {access_token[:20]}...")
        
        # 2. Access Profile
        profile_url = f"{BASE_URL}/auth/profile/"
        headers = {"Authorization": f"Bearer {access_token}"}
        
        print(f"GET {profile_url} ...")
        res_profile = requests.get(profile_url, headers=headers)
        print(f"Status: {res_profile.status_code}")
        
        if res_profile.status_code == 200:
            print(f"Profile Data: {res_profile.json()}")
        else:
            print(f"Profile Error: {res_profile.text}")

    except Exception as e:
        print(f"EXCEPTION: {e}")

if __name__ == "__main__":
    test_full_auth_flow()
