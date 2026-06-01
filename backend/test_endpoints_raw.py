import urllib.request
import json
import traceback

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

# Login to get token
req = urllib.request.Request(
    'http://127.0.0.1:8000/api/auth/login/', 
    data=json.dumps({"username": "nitin123", "password": "nitin123"}).encode(),
    headers={"Content-Type": "application/json"},
    method="POST"
)
try:
    res = urllib.request.urlopen(req)
    token = json.loads(res.read())['access']
    print("Obtained token.")

    for ep in endpoints:
        print(f"Testing {ep}...")
        try:
            req_ep = urllib.request.Request(
                f'http://127.0.0.1:8000{ep}',
                headers={"Authorization": f"Bearer {token}"}
            )
            res_ep = urllib.request.urlopen(req_ep)
            print(f"SUCCESS {ep} [{res_ep.getcode()}]")
        except urllib.error.HTTPError as e:
            err_data = e.read()
            print(f"FAILED {ep} [{e.code}] -> {err_data[:500]}")
        except Exception as e:
            print(f"ERROR {ep}: {e}")

except Exception as e:
    traceback.print_exc()
