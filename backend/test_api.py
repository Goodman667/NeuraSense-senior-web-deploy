import requests

response = requests.post(
    "http://localhost:8000/api/v1/chat",
    json={
        "user_id": "test123",
        "message": "你好，我今天考试没考好，很难过"
    }
)

print(f"Status: {response.status_code}")
print(f"Response:\n{response.json()}")
