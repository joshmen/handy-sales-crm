# PowerShell script para probar build en modo production

Write-Host "======================================================"
Write-Host "   PROBANDO BUILD EN MODO PRODUCTION"
Write-Host "======================================================"
Write-Host ""

# Limpiar builds anteriores
Write-Host "[1] Limpiando builds anteriores..."
if (Test-Path .next) {
    Remove-Item -Recurse -Force .next
    Write-Host "   .next eliminado"
}

# Configurar NODE_ENV
Write-Host ""
Write-Host "[2] Configurando NODE_ENV=production..."
$env:NODE_ENV = "production"
Write-Host "   NODE_ENV configurado a: $env:NODE_ENV"

# Ejecutar build
Write-Host ""
Write-Host "[3] Ejecutando npm run build..."
Write-Host ""

npm run build

# Verificar resultado
if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ BUILD EXITOSO EN MODO PRODUCTION" -ForegroundColor Green
    Write-Host ""
    Write-Host "Esto significa que el problema es específico de Vercel."
    Write-Host ""
    Write-Host "SOLUCIÓN:" -ForegroundColor Yellow
    Write-Host "1. En Vercel, cambia NODE_ENV a 'development' temporalmente"
    Write-Host "2. O desconecta/reconecta el repositorio en Vercel"
} else {
    Write-Host ""
    Write-Host "❌ BUILD FALLÓ EN MODO PRODUCTION" -ForegroundColor Red
    Write-Host ""
    Write-Host "El problema se puede reproducir localmente."
    Write-Host ""
    Write-Host "SOLUCIONES:" -ForegroundColor Yellow
    Write-Host "1. Ejecuta: node fix-production-mode.js"
    Write-Host "2. O usa imports directos: node fix-vercel-final.js"
    Write-Host "3. Como último recurso, cambia NODE_ENV a 'development' en Vercel"
}

Write-Host ""
Write-Host "Presiona cualquier tecla para continuar..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
