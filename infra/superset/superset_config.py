"""
Superset configuration for Handy Suites.
Mounted into the Superset container at /app/superset_home/superset_config.py
"""
import os

# ─── Secret Key ──────────────────────────────────────────
SECRET_KEY = os.getenv("SUPERSET_SECRET_KEY", "handysuites-superset-dev-secret-key")

# ─── Metadata Database (Superset's own tables) ──────────
SQLALCHEMY_DATABASE_URI = (
    f"postgresql://{os.getenv('DATABASE_USER', 'handy_user')}"
    f":{os.getenv('DATABASE_PASSWORD', 'handy_pass')}"
    f"@{os.getenv('DATABASE_HOST', 'postgres')}"
    f":{os.getenv('DATABASE_PORT', '5432')}"
    f"/{os.getenv('DATABASE_DB', 'superset_meta')}"
)

# ─── Feature Flags ───────────────────────────────────────
FEATURE_FLAGS = {
    "EMBEDDED_SUPERSET": True,
    "ENABLE_TEMPLATE_PROCESSING": True,
    "DASHBOARD_RBAC": True,
}

# ─── Embedded / Guest Token ─────────────────────────────
GUEST_ROLE_NAME = "Gamma"
GUEST_TOKEN_JWT_SECRET = os.getenv("SUPERSET_SECRET_KEY", SECRET_KEY)
GUEST_TOKEN_JWT_ALGO = "HS256"
GUEST_TOKEN_HEADER_NAME = "X-GuestToken"

# Allow embedding from our frontend
TALISMAN_ENABLED = False  # Disable CSP in dev (enable in prod with proper config)
HTTP_HEADERS = {
    "X-Frame-Options": "ALLOWALL",
}

# CORS — allow frontend to communicate
ENABLE_CORS = True
CORS_OPTIONS = {
    "supports_credentials": True,
    "allow_headers": ["*"],
    "resources": [r"/api/*", r"/superset/*", r"/guest_token/*"],
    "origins": [
        "http://localhost:1083",  # Next.js dev
        "http://localhost:3000",
        os.getenv("FRONTEND_URL", "http://localhost:1083"),
    ],
}

# ─── Cache (simple in-memory for dev) ────────────────────
CACHE_CONFIG = {
    "CACHE_TYPE": "SimpleCache",
    "CACHE_DEFAULT_TIMEOUT": 300,
}
DATA_CACHE_CONFIG = {
    "CACHE_TYPE": "SimpleCache",
    "CACHE_DEFAULT_TIMEOUT": 600,
}

# ─── Row Level Security ─────────────────────────────────
# RLS rules are applied via guest tokens. Each guest token includes
# a tenant_id claim that filters all queries automatically.
# This is configured per-dataset in Superset's UI or via API.

# ─── Misc ────────────────────────────────────────────────
PREVENT_UNSAFE_DB_CONNECTIONS = False  # Allow localhost PG in dev
WTF_CSRF_ENABLED = False  # Disable CSRF for API access in dev
