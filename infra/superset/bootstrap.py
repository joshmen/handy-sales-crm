"""
Superset Bootstrap Script — Auto-configures datasets and dashboards.
Run after Superset starts:
  docker exec handysuites_superset_dev python /app/bootstrap.py
"""
import requests
import time
import sys

BASE = "http://localhost:8088"
ADMIN_USER = "admin"
ADMIN_PASS = "admin"

# ─── Materialized Views to register as datasets ─────────
DATASETS = [
    {"table": "mv_ventas_diarias", "name": "Daily Sales"},
    {"table": "mv_ventas_vendedor", "name": "Sales by Vendor"},
    {"table": "mv_ventas_producto", "name": "Sales by Product"},
    {"table": "mv_ventas_zona", "name": "Sales by Zone"},
    {"table": "mv_actividad_clientes", "name": "Client Activity"},
    {"table": "mv_inventario_resumen", "name": "Inventory Status"},
    {"table": "mv_cartera_vencida", "name": "Accounts Receivable Aging"},
    {"table": "mv_kpis_dashboard", "name": "Dashboard KPIs"},
]

def login():
    """Get access token from Superset."""
    r = requests.post(f"{BASE}/api/v1/security/login", json={
        "username": ADMIN_USER,
        "password": ADMIN_PASS,
        "provider": "db",
    })
    r.raise_for_status()
    return r.json()["access_token"]

def get_csrf(token):
    """Get CSRF token."""
    r = requests.get(f"{BASE}/api/v1/security/csrf_token/", headers={
        "Authorization": f"Bearer {token}",
    })
    r.raise_for_status()
    return r.json()["result"]

def headers(token, csrf=None):
    h = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    if csrf:
        h["X-CSRFToken"] = csrf
    return h

def create_database_connection(token, csrf):
    """Create connection to handy_erp PostgreSQL."""
    # Check if already exists
    r = requests.get(f"{BASE}/api/v1/database/", headers=headers(token))
    r.raise_for_status()
    for db in r.json().get("result", []):
        if db.get("database_name") == "Handy ERP":
            print(f"  Database 'Handy ERP' already exists (id={db['id']})")
            return db["id"]

    r = requests.post(f"{BASE}/api/v1/database/", headers=headers(token, csrf), json={
        "database_name": "Handy ERP",
        "sqlalchemy_uri": "postgresql://handy_user:handy_pass@postgres:5432/handy_erp",
        "expose_in_sqllab": True,
        "allow_csv_upload": False,
        "extra": '{"allows_virtual_table_explore": true}',
    })
    r.raise_for_status()
    db_id = r.json()["id"]
    print(f"  Created database connection 'Handy ERP' (id={db_id})")
    return db_id

def create_datasets(token, csrf, db_id):
    """Register materialized views as datasets."""
    # Get existing datasets
    r = requests.get(f"{BASE}/api/v1/dataset/?q=(page_size:100)", headers=headers(token))
    r.raise_for_status()
    existing = {d["table_name"] for d in r.json().get("result", [])}

    for ds in DATASETS:
        if ds["table"] in existing:
            print(f"  Dataset '{ds['table']}' already exists, skipping")
            continue

        r = requests.post(f"{BASE}/api/v1/dataset/", headers=headers(token, csrf), json={
            "database": db_id,
            "table_name": ds["table"],
            "schema": "public",
        })
        if r.status_code == 201:
            print(f"  Created dataset '{ds['name']}' ({ds['table']})")
        else:
            print(f"  Warning: Could not create dataset '{ds['table']}': {r.status_code} {r.text[:200]}")

def create_rls_rules(token, csrf):
    """Create Row Level Security rules for tenant_id filtering."""
    # Get all datasets
    r = requests.get(f"{BASE}/api/v1/dataset/?q=(page_size:100)", headers=headers(token))
    r.raise_for_status()
    datasets = r.json().get("result", [])
    mv_datasets = [d for d in datasets if d["table_name"].startswith("mv_")]

    if not mv_datasets:
        print("  No mv_ datasets found, skipping RLS")
        return

    # Check existing RLS rules
    r = requests.get(f"{BASE}/api/v1/rowlevelsecurity/?q=(page_size:100)", headers=headers(token))
    existing_names = set()
    if r.status_code == 200:
        existing_names = {rule.get("name", "") for rule in r.json().get("result", [])}

    rule_name = "Tenant Isolation"
    if rule_name in existing_names:
        print(f"  RLS rule '{rule_name}' already exists, skipping")
        return

    # Create RLS rule that uses guest token's tenant_id
    r = requests.post(f"{BASE}/api/v1/rowlevelsecurity/", headers=headers(token, csrf), json={
        "name": rule_name,
        "description": "Filter all queries by tenant_id from guest token",
        "filter_type": "Regular",
        "clause": "tenant_id = {{ current_user_id() }}",
        "tables": [{"id": d["id"]} for d in mv_datasets],
        "group_key": "tenant_id",
    })
    if r.status_code in (200, 201):
        print(f"  Created RLS rule '{rule_name}' for {len(mv_datasets)} datasets")
    else:
        print(f"  Note: RLS rule creation returned {r.status_code} — may need manual setup")
        print(f"  RLS ensures each tenant only sees their own data via guest tokens")

def main():
    print("=" * 60)
    print("Handy Suites — Superset Bootstrap")
    print("=" * 60)

    # Wait for Superset to be ready
    print("\n1. Waiting for Superset to be ready...")
    for i in range(30):
        try:
            r = requests.get(f"{BASE}/health", timeout=3)
            if r.status_code == 200:
                print("  Superset is ready!")
                break
        except:
            pass
        time.sleep(2)
    else:
        print("  ERROR: Superset not ready after 60s")
        sys.exit(1)

    # Login
    print("\n2. Logging in as admin...")
    token = login()
    csrf = get_csrf(token)
    print("  Authenticated successfully")

    # Create database connection
    print("\n3. Creating database connection to handy_erp...")
    db_id = create_database_connection(token, csrf)

    # Create datasets
    print("\n4. Registering materialized views as datasets...")
    create_datasets(token, csrf, db_id)

    # Create RLS rules
    print("\n5. Setting up Row Level Security...")
    create_rls_rules(token, csrf)

    print("\n" + "=" * 60)
    print("Bootstrap complete!")
    print(f"Access Superset at: http://localhost:1084")
    print(f"Login: admin / admin")
    print("=" * 60)

if __name__ == "__main__":
    main()
