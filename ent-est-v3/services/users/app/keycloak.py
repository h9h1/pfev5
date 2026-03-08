import requests, os, unicodedata, random, string, datetime

KEYCLOAK_URL    = os.getenv('KEYCLOAK_URL', 'http://keycloak:8080')
REALM           = os.getenv('KEYCLOAK_REALM', 'est')
CLIENT_ID       = os.getenv('KC_CLIENT_ID', 'ent-backend')
CLIENT_SECRET   = os.getenv('KC_CLIENT_SECRET', 'ent_backend_secret_2024')
EMAIL_DOMAIN    = os.getenv('EMAIL_DOMAIN', 'est.ac.ma')

def get_admin_token():
    r = requests.post(
        f"{KEYCLOAK_URL}/realms/master/protocol/openid-connect/token",
        data={'grant_type':'password','client_id':'admin-cli',
              'username':'admin','password':'admin_2024'},
        timeout=10
    )
    r.raise_for_status()
    return r.json()['access_token']

def kc_headers():
    return {'Authorization': f'Bearer {get_admin_token()}',
            'Content-Type': 'application/json'}

def normalize(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s)
                   if unicodedata.category(c) != 'Mn').lower().replace(' ','.').replace('-','.')

def generate_email(first_name, last_name, existing_emails):
    base = f"{normalize(first_name)}.{normalize(last_name)}"
    email = f"{base}@{EMAIL_DOMAIN}"
    counter = 1
    while email in existing_emails:
        email = f"{base}{counter}@{EMAIL_DOMAIN}"
        counter += 1
    return email

def generate_temp_password(first_name):
    return f"{first_name.capitalize()}{datetime.datetime.now().year}{''.join(random.choices(string.digits, k=3))}"

def get_all_emails():
    headers = kc_headers()
    r = requests.get(f"{KEYCLOAK_URL}/admin/realms/{REALM}/users?max=1000", headers=headers, timeout=10)
    return [u.get('email','') for u in r.json()]

def create_kc_user(first_name, last_name, role, department, student_id, temp_password, email):
    headers = kc_headers()
    user_data = {
        "username":      email.split('@')[0],
        "email":         email,
        "firstName":     first_name,
        "lastName":      last_name,
        "enabled":       True,
        "emailVerified": True,
        "attributes":    {"department":[department], "student_id":[student_id], "role":[role]},
        "credentials":   [{"type":"password","value":temp_password,"temporary":True}]
    }
    r = requests.post(f"{KEYCLOAK_URL}/admin/realms/{REALM}/users",
        json=user_data, headers=headers, timeout=10)
    if r.status_code not in (201, 409):
        raise Exception(f"KC create user error: {r.status_code} {r.text}")
    # Get user id
    r2 = requests.get(f"{KEYCLOAK_URL}/admin/realms/{REALM}/users?username={email.split('@')[0]}",
        headers=headers, timeout=10)
    users = r2.json()
    if not users: raise Exception("User not found after creation")
    kc_user_id = users[0]['id']
    # Assign role
    role_r = requests.get(f"{KEYCLOAK_URL}/admin/realms/{REALM}/roles/{role}",
        headers=headers, timeout=10)
    if role_r.status_code == 200:
        role_data = role_r.json()
        requests.post(f"{KEYCLOAK_URL}/admin/realms/{REALM}/users/{kc_user_id}/role-mappings/realm",
            json=[role_data], headers=headers, timeout=10)
    return kc_user_id

def get_kc_users():
    headers = kc_headers()
    r = requests.get(f"{KEYCLOAK_URL}/admin/realms/{REALM}/users?max=1000", headers=headers, timeout=10)
    users = r.json()
    result = []
    for u in users:
        roles_r = requests.get(f"{KEYCLOAK_URL}/admin/realms/{REALM}/users/{u['id']}/role-mappings/realm",
            headers=headers, timeout=5)
        roles = [r['name'] for r in roles_r.json() if r['name'] in ('admin','teacher','student')]
        attrs = u.get('attributes', {})
        result.append({
            'id':          u['id'],
            'username':    u.get('username',''),
            'email':       u.get('email',''),
            'first_name':  u.get('firstName',''),
            'last_name':   u.get('lastName',''),
            'role':        roles[0] if roles else 'student',
            'department':  attrs.get('department',[''])[0],
            'student_id':  attrs.get('student_id',[''])[0],
            'is_active':   u.get('enabled', True)
        })
    return result

def toggle_kc_user(kc_user_id, enabled):
    headers = kc_headers()
    requests.put(f"{KEYCLOAK_URL}/admin/realms/{REALM}/users/{kc_user_id}",
        json={"enabled": enabled}, headers=headers, timeout=10)

def reset_kc_password(kc_user_id, new_password):
    headers = kc_headers()
    requests.put(f"{KEYCLOAK_URL}/admin/realms/{REALM}/users/{kc_user_id}/reset-password",
        json={"type":"password","value":new_password,"temporary":True},
        headers=headers, timeout=10)

def delete_kc_user(kc_user_id):
    headers = kc_headers()
    requests.delete(f"{KEYCLOAK_URL}/admin/realms/{REALM}/users/{kc_user_id}",
        headers=headers, timeout=10)

def kc_login(email, password):
    r = requests.post(
        f"{KEYCLOAK_URL}/realms/{REALM}/protocol/openid-connect/token",
        data={'grant_type':'password','client_id':'ent-frontend',
              'username': email, 'password': password},
        timeout=10
    )
    if r.status_code != 200:
        raise Exception("Identifiants incorrects")
    return r.json()
