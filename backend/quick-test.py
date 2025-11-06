#!/usr/bin/env python3
import requests
import sys

print("🧪 Quick Backend Test\n")

try:
    print("Testing health endpoint...")
    response = requests.get('http://localhost:3000/health', timeout=5)
    print(f"✅ Status: {response.status_code}")
    print(f"✅ Response: {response.json()}")
    sys.exit(0)
except requests.exceptions.Timeout:
    print("❌ Request timed out - backend might be hanging")
    sys.exit(1)
except requests.exceptions.ConnectionError:
    print("❌ Could not connect - backend not running on port 3000")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
