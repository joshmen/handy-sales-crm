<#
Sprint correctivo 2026-06-06: aplica las migrations EF Core a Railway
staging y verifica que la base queda consistente.

Por que este script existe: las migrations CRITICAL del sprint pre-prod
(UniqueMobileRecordIdIndexes, UniqueIndexRefreshTokensToken,
UsuariosEmailUniqueIndex, LoginLockoutColumns) usan CREATE INDEX
CONCURRENTLY que requiere ejecucion FUERA de transaccion. EF Core
con `suppressTransaction:true` lo maneja, PERO requiere que el contexto
de conexion sea PG nativo (no SQLite que usa el ci local).

Uso:

  # Pre-requisito: cargar staging connection string en env
  $env:STAGING_PG_CONN = "Host=...;Port=5432;Database=...;Username=...;Password=..."

  # Aplicar dry-run (genera SQL sin ejecutar)
  ./scripts/apply-migrations-staging.ps1 -DryRun

  # Aplicar a staging
  ./scripts/apply-migrations-staging.ps1

  # Aplicar a prod (require explicit flag)
  ./scripts/apply-migrations-staging.ps1 -Prod
#>

param(
  [switch]$DryRun,
  [switch]$Prod
)

$ErrorActionPreference = 'Stop'

# ────────────────────────────────────────────────────────────────
# Config: connection strings
# ────────────────────────────────────────────────────────────────
if ($Prod) {
  $conn = $env:PROD_PG_CONN
  $envName = 'PRODUCTION'
  if (-not $conn) {
    Write-Error "ERROR: variable de entorno PROD_PG_CONN no esta definida."
    exit 1
  }
  Write-Host "⚠⚠⚠ APLICANDO A PRODUCCION ⚠⚠⚠" -ForegroundColor Red
  Write-Host "Presiona Enter para continuar, Ctrl+C para abortar."
  Read-Host
} else {
  $conn = $env:STAGING_PG_CONN
  $envName = 'staging'
  if (-not $conn) {
    Write-Error "ERROR: variable de entorno STAGING_PG_CONN no esta definida."
    exit 1
  }
}

# ────────────────────────────────────────────────────────────────
# Pre-flight checks
# ────────────────────────────────────────────────────────────────
Write-Host "[1/5] Verificando dotnet-ef…" -ForegroundColor Cyan
$env:PATH = "$env:PATH;$env:USERPROFILE\.dotnet\tools"
$efVersion = (dotnet-ef --version) -join ''
if (-not $efVersion) {
  Write-Error "dotnet-ef no esta instalado. Run: dotnet tool install --global dotnet-ef"
  exit 1
}
Write-Host "  $efVersion"

Write-Host "[2/5] Conectividad PG…" -ForegroundColor Cyan
# psql desde Docker container local — no requiere psql en host
$probeResult = docker exec -i handysuites_postgres_dev psql "$conn" -c "SELECT version();" 2>&1
if ($LASTEXITCODE -ne 0) {
  Write-Error "No se pudo conectar a $envName. Error:"
  Write-Host $probeResult
  exit 1
}
Write-Host "  OK"

# ────────────────────────────────────────────────────────────────
# Migration apply
# ────────────────────────────────────────────────────────────────
Write-Host "[3/5] Lista de migrations pendientes…" -ForegroundColor Cyan
$pending = dotnet-ef migrations list `
  --project libs/HandySuites.Infrastructure `
  --startup-project apps/api/src/HandySuites.Api `
  --connection $conn 2>&1
Write-Host $pending

if ($DryRun) {
  Write-Host "[4/5] DRY RUN — generando script idempotente…" -ForegroundColor Yellow
  $scriptFile = "tasks/migrations-staging-$(Get-Date -Format 'yyyyMMdd-HHmmss').sql"
  dotnet-ef migrations script --idempotent `
    --project libs/HandySuites.Infrastructure `
    --startup-project apps/api/src/HandySuites.Api `
    --output $scriptFile
  Write-Host "  Script generado: $scriptFile"
  Write-Host "[5/5] DRY RUN completo. Revisa el SQL antes de re-correr sin -DryRun." -ForegroundColor Yellow
  exit 0
}

Write-Host "[4/5] Aplicando migrations a $envName…" -ForegroundColor Cyan
dotnet-ef database update `
  --project libs/HandySuites.Infrastructure `
  --startup-project apps/api/src/HandySuites.Api `
  --connection $conn

if ($LASTEXITCODE -ne 0) {
  Write-Error "Migration apply fallo. Revisa el log arriba."
  exit 1
}

# ────────────────────────────────────────────────────────────────
# Post-apply verification
# ────────────────────────────────────────────────────────────────
Write-Host "[5/5] Verificando indices creados…" -ForegroundColor Cyan
$verifyQuery = @"
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (indexname LIKE 'IX_%mobile_record_id%'
       OR indexname = 'IX_RefreshTokens_Token'
       OR indexname = 'IX_Usuarios_email')
ORDER BY tablename, indexname;
"@

docker exec -i handysuites_postgres_dev psql "$conn" -c "$verifyQuery"

Write-Host ""
Write-Host "✅ Migrations aplicadas a $envName." -ForegroundColor Green
Write-Host ""
Write-Host "Siguiente paso:" -ForegroundColor Yellow
Write-Host "  - Validar que el login + sync mobile siguen funcionando."
Write-Host "  - Si es staging: probar 24h antes de aplicar a prod."
Write-Host "  - Si es prod: monitorear Seq por excepciones PostgresException 23505."
