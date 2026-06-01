import urllib.request
import json
import traceback

req = urllib.request.Request(
    'http://127.0.0.1:8000/api/auth/login/', 
    data=json.dumps({"username": "nitin123", "password": "nitin123"}).encode(),
    headers={"Content-Type": "application/json"},
    method="POST"
)
try:
    res = urllib.request.urlopen(req)
    token = json.loads(res.read())['access']
    req_ep = urllib.request.Request(
        'http://127.0.0.1:8000/api/hospital/doctors/',
        headers={"Authorization": f"Bearer {token}"}
    )
    res_ep = urllib.request.urlopen(req_ep)
    data = res_ep.read().decode('utf-8')
    print('Status:', res_ep.getcode())
    print(data[:500])
except Exception as e:
    traceback.print_exc()
