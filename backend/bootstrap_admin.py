"""
One-time admin bootstrap script.
Run: python bootstrap_admin.py your@email.com
Uses the service-role key to update the profiles table directly.
"""

import sys
import os

# Load .env manually
env_path = os.path.join(os.path.dirname(__file__), ".env")
env_vars = {}
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                env_vars[k.strip()] = v.strip()

SUPABASE_URL = env_vars.get("SUPABASE_URL", "")
SERVICE_KEY = env_vars.get("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SERVICE_KEY:
    print("ERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing from .env")
    sys.exit(1)

try:
    from supabase import create_client
except ImportError:
    print("ERROR: supabase package not installed. Run: pip install supabase")
    sys.exit(1)

if len(sys.argv) < 2:
    print("Usage: python bootstrap_admin.py <email>")
    sys.exit(1)

email = sys.argv[1].strip().lower()
print(f"Promoting '{email}' to admin role...")

client = create_client(SUPABASE_URL, SERVICE_KEY)

# First check if profile exists
profile = client.table("profiles").select("id, email, role").ilike("email", email).limit(1).execute()

if not profile.data:
    print(f"ERROR: No profile found for '{email}'.")
    print("Please log in at least once with this account so a profile row is created, then re-run.")
    sys.exit(1)

user_id = profile.data[0]["id"]
current_role = profile.data[0].get("role", "user")
print(f"Found profile: id={user_id}, current role='{current_role}'")

if current_role == "admin":
    print(f"Account '{email}' is already an admin. No changes needed.")
    sys.exit(0)

# Update role to admin
result = client.table("profiles").update({"role": "admin"}).eq("id", user_id).execute()

if result.data:
    print(f"SUCCESS: '{email}' has been promoted to admin.")
    print("Please log out and log back in using 'Institution' login to access the Admin Dashboard.")
else:
    print(f"ERROR: Update returned no data. Response: {result}")
    sys.exit(1)
