# Port Configuration & Credentials

> Extracted from CLAUDE.md — all service ports and authentication credentials.

## Port Configuration (1000-range)

**IMPORTANT**: This project uses ports in the 1000-range to avoid conflicts with other projects.

| Service | Port | URL |
|---------|------|-----|
| **Frontend Web** | 1083 | http://localhost:1083 |
| **Main API** | 1050 | http://localhost:1050 |
| **Main API Swagger** | 1050 | http://localhost:1050/swagger |
| **Billing API** | 1051 | http://localhost:1051 |
| **Billing API Swagger** | 1051 | http://localhost:1051/swagger |
| **Mobile API** | 1052 | http://localhost:1052 |
| **Mobile API Swagger** | 1052 | http://localhost:1052/swagger |
| **AI Gateway** | 1053 | http://localhost:1053 |
| **AI Gateway Swagger** | 1053 | http://localhost:1053/swagger |
| **phpMyAdmin (optional)** | 1081 | http://localhost:1081 |
| **Seq Logging UI** | 1082 | http://localhost:1082 |
| **Seq Ingestion API** | 1341 | http://localhost:1341 |
| **MySQL** | 3306 | localhost:3306 |

### Quick Reference
```
Frontend:    http://localhost:1083
Main API:    http://localhost:1050
Billing API: http://localhost:1051
Mobile API:  http://localhost:1052
AI Gateway:  http://localhost:1053
Seq Logs:    http://localhost:1082
```

## Credentials

**MySQL Database:**
- User: `handy_user` / Password: `handy_pass`
- Root: `root` / Password: `root123`

**Application Users (password: `test123` for all):**

| Tenant | Email | Rol |
|--------|-------|-----|
| Jeyma (id=3) | admin@jeyma.com | Admin |
| Jeyma (id=3) | vendedor1@jeyma.com | Vendedor |
| Jeyma (id=3) | vendedor2@jeyma.com | Vendedor |
| Huichol (id=4) | admin@huichol.com | Admin |
| Huichol (id=4) | vendedor1@huichol.com | Vendedor |
| Huichol (id=4) | vendedor2@huichol.com | Vendedor |
| Centro (id=1) | admin@centro.com | Admin |
| Rutas Norte (id=2) | admin@rutasnorte.com | Admin |

**Recommended for testing:** `admin@jeyma.com` / `test123` (tenant with most seed data)
