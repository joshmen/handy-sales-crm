# Script para verificar y agregar archivos faltantes en Git
Write-Host "🔍 Verificando archivos en Git vs archivos locales..." -ForegroundColor Cyan
Write-Host ""

# Verificar archivos de UI
Write-Host "📁 Archivos de UI en Git:" -ForegroundColor Yellow
$gitUIFiles = git ls-files src/components/ui/ 2>$null
if ($gitUIFiles) {
    $gitUIFiles
    Write-Host "Total: $($gitUIFiles.Count) archivos" -ForegroundColor Green
} else {
    Write-Host "❌ NO HAY ARCHIVOS DE UI EN GIT!" -ForegroundColor Red
}
Write-Host ""

Write-Host "📁 Archivos de UI locales:" -ForegroundColor Yellow
$localUIFiles = Get-ChildItem -Path "src\components\ui\*.tsx", "src\components\ui\*.ts" -ErrorAction SilentlyContinue
if ($localUIFiles) {
    $localUIFiles | ForEach-Object { Write-Host $_.Name }
    Write-Host "Total: $($localUIFiles.Count) archivos" -ForegroundColor Green
}
Write-Host ""

# Verificar archivos de layout
Write-Host "📁 Archivos de Layout en Git:" -ForegroundColor Yellow
$gitLayoutFiles = git ls-files src/components/layout/ 2>$null
if ($gitLayoutFiles) {
    $gitLayoutFiles
} else {
    Write-Host "❌ NO HAY ARCHIVOS DE LAYOUT EN GIT!" -ForegroundColor Red
}
Write-Host ""

# Verificar hooks
Write-Host "📁 Archivos de Hooks en Git:" -ForegroundColor Yellow
$gitHookFiles = git ls-files src/hooks/ 2>$null
if ($gitHookFiles) {
    $gitHookFiles
} else {
    Write-Host "❌ NO HAY ARCHIVOS DE HOOKS EN GIT!" -ForegroundColor Red
}
Write-Host ""

# Archivos no trackeados
Write-Host "⚠️ Archivos NO trackeados:" -ForegroundColor Yellow
git status --porcelain | Where-Object { $_ -match "^\?\?" }
Write-Host ""

# Agregar archivos
Write-Host "✅ Agregando TODOS los archivos faltantes..." -ForegroundColor Green

git add src/components/ui/*.tsx 2>$null
git add src/components/ui/*.ts 2>$null
git add src/components/layout/*.tsx 2>$null
git add src/components/layout/*.ts 2>$null
git add src/components/layout/*.css 2>$null
git add src/hooks/*.tsx 2>$null
git add src/hooks/*.ts 2>$null
git add src/types/*.ts 2>$null
git add src/lib/*.ts 2>$null
git add src/components/common/*.tsx 2>$null
git add src/components/dashboard/*.tsx 2>$null
git add src/components/calendar/*.tsx 2>$null
git add src/components/forms/*.tsx 2>$null
git add src/components/orders/*.tsx 2>$null
git add src/components/providers/*.tsx 2>$null
git add src/components/routes/*.tsx 2>$null

Write-Host ""
Write-Host "📊 Estado actual:" -ForegroundColor Cyan
git status --short

Write-Host ""
Write-Host "✨ Para completar el fix, ejecuta:" -ForegroundColor Green
Write-Host "git commit -m 'Add all missing component and hook files to repository'" -ForegroundColor Yellow
Write-Host "git push origin fix-deployment-issues" -ForegroundColor Yellow
