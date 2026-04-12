"""
Superset Bootstrap — Creates fully configured dashboards automatically.
Every tenant sees the same dashboards with their data filtered by RLS.
Run: docker exec handysuites_superset_dev /app/.venv/bin/python /app/bootstrap.py
"""
import requests
import json
import time
import sys
import uuid as uuid_lib

BASE = "http://localhost:8088"
ADMIN_USER = "admin"
ADMIN_PASS = "admin"

# ─── Chart Definitions ──────────────────────────────────────────
# Each chart is fully configured with SQL query to guarantee it works
CHARTS = [
    {
        "name": "Sales by Vendor",
        "viz_type": "echarts_bar",
        "dataset": "mv_ventas_vendedor",
        "query": {
            "metrics": [{"expressionType": "SQL", "sqlExpression": "SUM(total_ventas)", "label": "Total Sales"}],
            "groupby": ["vendedor_nombre"],
            "order_desc": True,
            "row_limit": 20,
            "color_scheme": "supersetColors",
        },
    },
    {
        "name": "Sales by Zone",
        "viz_type": "pie",
        "dataset": "mv_ventas_zona",
        "query": {
            "metrics": [{"expressionType": "SQL", "sqlExpression": "SUM(total_ventas)", "label": "Total Sales"}],
            "groupby": ["zona_nombre"],
            "row_limit": 20,
            "color_scheme": "supersetColors",
        },
    },
    {
        "name": "Inventory Status",
        "viz_type": "pie",
        "dataset": "mv_inventario_resumen",
        "query": {
            "metrics": [{"expressionType": "SQL", "sqlExpression": "COUNT(*)", "label": "Products"}],
            "groupby": ["estado_stock"],
            "color_scheme": "supersetColors",
        },
    },
    {
        "name": "Top Products",
        "viz_type": "echarts_bar",
        "dataset": "mv_ventas_producto",
        "query": {
            "metrics": [{"expressionType": "SQL", "sqlExpression": "SUM(cantidad_vendida)", "label": "Units Sold"}],
            "groupby": ["producto_nombre"],
            "order_desc": True,
            "row_limit": 10,
            "color_scheme": "supersetColors",
        },
    },
    {
        "name": "Client Activity",
        "viz_type": "table",
        "dataset": "mv_actividad_clientes",
        "query": {
            "metrics": [],
            "all_columns": ["cliente_nombre", "zona_nombre", "cantidad_pedidos", "total_ventas", "total_visitas"],
            "order_desc": True,
            "orderby": [["total_ventas", False]],
            "row_limit": 50,
        },
    },
    {
        "name": "Accounts Receivable",
        "viz_type": "pie",
        "dataset": "mv_cartera_vencida",
        "query": {
            "metrics": [{"expressionType": "SQL", "sqlExpression": "SUM(saldo_pendiente)", "label": "Balance"}],
            "groupby": ["bucket"],
            "color_scheme": "supersetColors",
        },
    },
]

# ─── Dashboard Layout Builder ───────────────────────────────────

def build_layout(chart_ids_names):
    """Build a Superset v2 dashboard layout with charts in 2-column grid."""
    positions = {
        "DASHBOARD_VERSION_KEY": "v2",
        "ROOT_ID": {"type": "ROOT", "id": "ROOT_ID", "children": ["GRID_ID"]},
        "GRID_ID": {"type": "GRID", "id": "GRID_ID", "children": [], "parents": ["ROOT_ID"]},
        "HEADER_ID": {"type": "HEADER", "id": "HEADER_ID", "meta": {"text": "Handy Suites Overview"}},
    }

    for i, (chart_id, chart_name) in enumerate(chart_ids_names):
        row = i // 2
        col = i % 2
        row_key = f"ROW-row-{row}"
        chart_key = f"CHART-chart-{chart_id}"

        # Create row if not exists
        if row_key not in positions:
            positions[row_key] = {
                "type": "ROW", "id": row_key, "children": [],
                "parents": ["ROOT_ID", "GRID_ID"],
                "meta": {"background": "BACKGROUND_TRANSPARENT"},
            }
            positions["GRID_ID"]["children"].append(row_key)

        # Add chart to row
        positions[chart_key] = {
            "type": "CHART", "id": chart_key, "children": [],
            "parents": ["ROOT_ID", "GRID_ID", row_key],
            "meta": {
                "chartId": chart_id,
                "width": 6,
                "height": 50,
                "sliceName": chart_name,
                "uuid": str(uuid_lib.uuid4()),
            },
        }
        positions[row_key]["children"].append(chart_key)

    return positions


# ─── API Helpers ────────────────────────────────────────────────

def login():
    r = requests.post(f"{BASE}/api/v1/security/login", json={
        "username": ADMIN_USER, "password": ADMIN_PASS, "provider": "db",
    })
    r.raise_for_status()
    return r.json()["access_token"]

def headers(token, csrf=None):
    h = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    if csrf:
        h["X-CSRFToken"] = csrf
    return h

def get_csrf(token):
    r = requests.get(f"{BASE}/api/v1/security/csrf_token/", headers=headers(token))
    return r.json()["result"]


# ─── Main ───────────────────────────────────────────────────────

def main():
    print("=" * 60)
    print("Handy Suites — Superset Bootstrap")
    print("=" * 60)

    # 1. Wait for Superset
    print("\n1. Waiting for Superset...")
    for i in range(30):
        try:
            r = requests.get(f"{BASE}/health", timeout=3)
            if r.status_code == 200:
                print("   Ready!")
                break
        except:
            pass
        time.sleep(2)
    else:
        print("   ERROR: Superset not ready")
        sys.exit(1)

    # 2. Auth
    print("\n2. Authenticating...")
    token = login()
    csrf = get_csrf(token)
    h = headers(token, csrf)

    # 3. Database connection
    print("\n3. Database connection...")
    r = requests.get(f"{BASE}/api/v1/database/", headers=headers(token))
    existing_dbs = {d["database_name"]: d["id"] for d in r.json().get("result", [])}

    if "Handy ERP" in existing_dbs:
        db_id = existing_dbs["Handy ERP"]
        print(f"   Already exists (id={db_id})")
    else:
        r = requests.post(f"{BASE}/api/v1/database/", headers=h, json={
            "database_name": "Handy ERP",
            "sqlalchemy_uri": "postgresql://handy_user:handy_pass@postgres:5432/handy_erp",
            "expose_in_sqllab": True,
            "allow_csv_upload": False,
            "extra": json.dumps({"allows_virtual_table_explore": True}),
        })
        r.raise_for_status()
        db_id = r.json()["id"]
        print(f"   Created (id={db_id})")

    # 4. Datasets
    print("\n4. Registering datasets...")
    r = requests.get(f"{BASE}/api/v1/dataset/?q=(page_size:100)", headers=headers(token))
    existing_ds = {d["table_name"]: d["id"] for d in r.json().get("result", [])}

    dataset_map = {}
    for chart_def in CHARTS:
        table = chart_def["dataset"]
        if table in existing_ds:
            dataset_map[table] = existing_ds[table]
            print(f"   {table}: exists (id={existing_ds[table]})")
        else:
            r = requests.post(f"{BASE}/api/v1/dataset/", headers=h, json={
                "database": db_id, "table_name": table, "schema": "public",
            })
            if r.status_code == 201:
                dataset_map[table] = r.json()["id"]
                print(f"   {table}: created (id={r.json()['id']})")
            else:
                print(f"   {table}: ERROR {r.status_code}")

    # Also register remaining MVs not used in charts
    for mv in ["mv_ventas_diarias", "mv_kpis_dashboard"]:
        if mv not in existing_ds:
            r = requests.post(f"{BASE}/api/v1/dataset/", headers=h, json={
                "database": db_id, "table_name": mv, "schema": "public",
            })
            if r.status_code == 201:
                print(f"   {mv}: created (id={r.json()['id']})")

    # 5. Delete old charts (clean slate)
    print("\n5. Creating charts...")
    r = requests.get(f"{BASE}/api/v1/chart/?q=(page_size:100)", headers=headers(token))
    old_charts = {c["slice_name"]: c["id"] for c in r.json().get("result", [])}

    chart_ids_names = []
    for chart_def in CHARTS:
        ds_id = dataset_map.get(chart_def["dataset"])
        if not ds_id:
            print(f"   SKIP {chart_def['name']}: no dataset")
            continue

        # Delete old chart if exists
        if chart_def["name"] in old_charts:
            requests.delete(f"{BASE}/api/v1/chart/{old_charts[chart_def['name']]}", headers=h)

        params = chart_def["query"].copy()
        params["datasource"] = f"{ds_id}__table"
        params["viz_type"] = chart_def["viz_type"]

        r = requests.post(f"{BASE}/api/v1/chart/", headers=h, json={
            "slice_name": chart_def["name"],
            "datasource_id": ds_id,
            "datasource_type": "table",
            "viz_type": chart_def["viz_type"],
            "params": json.dumps(params),
        })
        if r.status_code == 201:
            cid = r.json()["id"]
            chart_ids_names.append((cid, chart_def["name"]))
            print(f"   {chart_def['name']}: created (id={cid})")
        else:
            print(f"   {chart_def['name']}: ERROR {r.status_code} — {r.text[:150]}")

    # 6. Dashboard
    print("\n6. Creating dashboard...")
    r = requests.get(f"{BASE}/api/v1/dashboard/?q=(page_size:10)", headers=headers(token))
    old_dashes = {d["dashboard_title"]: d["id"] for d in r.json().get("result", [])}

    if "Handy Suites Overview" in old_dashes:
        dash_id = old_dashes["Handy Suites Overview"]
        # Update with new layout
        layout = build_layout(chart_ids_names)
        r = requests.put(f"{BASE}/api/v1/dashboard/{dash_id}", headers=h, json={
            "position_json": json.dumps(layout),
            "published": True,
        })
        print(f"   Updated existing (id={dash_id}): {r.status_code}")
    else:
        layout = build_layout(chart_ids_names)
        r = requests.post(f"{BASE}/api/v1/dashboard/", headers=h, json={
            "dashboard_title": "Handy Suites Overview",
            "published": True,
            "slug": "handy-overview",
            "position_json": json.dumps(layout),
        })
        if r.status_code == 201:
            dash_id = r.json()["id"]
            print(f"   Created (id={dash_id})")
        else:
            print(f"   ERROR: {r.status_code} — {r.text[:200]}")
            sys.exit(1)

    # 7. Enable embedding
    print("\n7. Enabling embedding...")
    r = requests.post(f"{BASE}/api/v1/dashboard/{dash_id}/embedded", headers=h, json={
        "allowed_domains": ["http://localhost:1083", "http://localhost:3000", "https://*.vercel.app"]
    })
    if r.status_code == 200:
        emb_uuid = r.json()["result"]["uuid"]
        print(f"   Embedded UUID: {emb_uuid}")
    else:
        print(f"   ERROR: {r.status_code}")

    print("\n" + "=" * 60)
    print("Bootstrap complete!")
    print(f"Superset admin: http://localhost:1084 (admin/admin)")
    print(f"Embedded in:    http://localhost:1083/analytics")
    print("=" * 60)


if __name__ == "__main__":
    main()
