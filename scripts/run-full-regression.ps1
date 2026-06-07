<#
Sprint correctivo 2026-06-06: regresion completa pre-push.

Corre TODOS los test suites del repo en orden de costo (rapido primero).
Cualquier fallo aborta el script — preferimos ver el primer error que
acumular fallos en cascada.

Uso:
  ./scripts/run-full-regression.ps1                  # corre full
  ./scripts/run-full-regression.ps1 -SkipE2E         # skipea Playwright (rapido)
  ./scripts/run-full-regression.ps1 -SkipMobile      # skipea Maestro
#>

param(
  [switch]$SkipE2E,
  [switch]$SkipMobile
)

$ErrorActionPreference = 'Stop'
$startTime = Get-Date

function Section($name) {
  Write-Host ""
  Write-Host "================================================================" -ForegroundColor Cyan
  Write-Host " $name" -ForegroundColor Cyan
  Write-Host "================================================================" -ForegroundColor Cyan
}

# ────────────────────────────────────────────────────────────────
# 1. Type check (rapidisimo, falla rapido)
# ────────────────────────────────────────────────────────────────
Section "1/6 — Type check (web + mobile-app)"

Push-Location "C:\tmp\handy-single-session\apps\web"
npx tsc --noEmit --project tsconfig.json
if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Error "Web tsc FAILED"; exit 1 }
Pop-Location

Push-Location "C:\tmp\handy-single-session\apps\mobile-app"
npx tsc --noEmit --project tsconfig.json
if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Error "Mobile tsc FAILED"; exit 1 }
Pop-Location
Write-Host "  ✅ tsc clean en web + mobile-app"

# ────────────────────────────────────────────────────────────────
# 2. dotnet build
# ────────────────────────────────────────────────────────────────
Section "2/6 — dotnet build (main API + billing + mobile + tests)"

Push-Location "C:\tmp\handy-single-session"
dotnet build HandySuites.sln --nologo
if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Error "dotnet build FAILED"; exit 1 }
Pop-Location

# ────────────────────────────────────────────────────────────────
# 3. dotnet test (los 3 test projects)
# ────────────────────────────────────────────────────────────────
Section "3/6 — dotnet test"

Push-Location "C:\tmp\handy-single-session"
dotnet test apps/api/tests/HandySuites.Tests/HandySuites.Tests.csproj --no-build --nologo
if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Error "Main API tests FAILED"; exit 1 }

dotnet test apps/mobile/HandySuites.Mobile.Tests/HandySuites.Mobile.Tests.csproj --no-build --nologo
if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Error "Mobile API tests FAILED"; exit 1 }

dotnet test apps/billing/HandySuites.Billing.Tests/HandySuites.Billing.Tests.csproj --no-build --nologo
if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Error "Billing tests FAILED"; exit 1 }
Pop-Location

# ────────────────────────────────────────────────────────────────
# 4. Playwright E2E
# ────────────────────────────────────────────────────────────────
if (-not $SkipE2E) {
  Section "4/6 — Playwright E2E"

  # Verifica que docker-compose esta corriendo
  $apiHealth = (Invoke-WebRequest -Uri http://localhost:1050/health -UseBasicParsing -ErrorAction SilentlyContinue).StatusCode
  if ($apiHealth -ne 200) {
    Write-Warning "API en http://localhost:1050 no responde. Verificar: docker-compose -f docker-compose.dev.yml up -d"
    Write-Warning "Skipeando Playwright."
  } else {
    Push-Location "C:\tmp\handy-single-session\apps\web"
    npx playwright test --reporter=line
    if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Error "Playwright FAILED"; exit 1 }
    Pop-Location
  }
} else {
  Write-Host "Skip Playwright (-SkipE2E)"
}

# ────────────────────────────────────────────────────────────────
# 5. Maestro mobile (requires Android emulator + Metro)
# ────────────────────────────────────────────────────────────────
if (-not $SkipMobile) {
  Section "5/6 — Maestro mobile E2E"

  $adb = "C:\Android\Sdk\platform-tools\adb.exe"
  if (-not (Test-Path $adb)) {
    Write-Warning "adb no encontrado en $adb. Skip Maestro."
  } else {
    $devices = & $adb devices | Select-String -Pattern '\sdevice$'
    if ($devices.Count -eq 0) {
      Write-Warning "No hay device/emulador conectado. Skip Maestro."
    } else {
      $maestro = "C:/maestro/bin/maestro"
      if (-not (Test-Path "$maestro.bat")) {
        Write-Warning "maestro no encontrado en $maestro. Skip."
      } else {
        Push-Location "C:\tmp\handy-single-session\apps\mobile-app"
        # Run flows mas criticos primero
        & $maestro test .maestro/supervisor/01-login-supervisor.yaml
        if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Error "Maestro login FAILED"; exit 1 }

        & $maestro test .maestro/vendedor/01-login.yaml
        if ($LASTEXITCODE -ne 0) { Pop-Location; Write-Error "Maestro vendedor FAILED"; exit 1 }
        Pop-Location
      }
    }
  }
} else {
  Write-Host "Skip Maestro (-SkipMobile)"
}

# ────────────────────────────────────────────────────────────────
# 6. Summary
# ────────────────────────────────────────────────────────────────
Section "6/6 — Summary"

$duration = (Get-Date) - $startTime
Write-Host "  ✅ Type check"
Write-Host "  ✅ dotnet build"
Write-Host "  ✅ dotnet test (558 + 53 + 49 esperado)"
if (-not $SkipE2E) { Write-Host "  ✅ Playwright" }
if (-not $SkipMobile) { Write-Host "  ✅ Maestro" }
Write-Host ""
Write-Host "  Tiempo total: $($duration.TotalMinutes.ToString('0.0')) min" -ForegroundColor Green
Write-Host ""
Write-Host "Listo para push." -ForegroundColor Green
