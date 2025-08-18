# Script PowerShell para arreglar problemas de case sensitivity
# Ejecutar con: .\fix-vercel-imports.ps1

Write-Host "🔧 Arreglando problemas de importación para Vercel..." -ForegroundColor Green

# Directorio base
$srcDir = ".\src"

# Función para arreglar imports en un archivo
function Fix-FileImports {
    param($filePath)
    
    $content = Get-Content $filePath -Raw
    $modified = $false
    
    # Arreglar import de toast - ESTE ES EL PRINCIPAL PROBLEMA
    if ($content -match "import \{ toast \} from '@/hooks/useToast'") {
        # El archivo useToast.tsx exporta tanto toast como useToast
        # No hay problema con este import, está correcto
        Write-Host "  ✓ Import de toast encontrado en: $($filePath)" -ForegroundColor Yellow
    }
    
    # Verificar si hay otros problemas de capitalización
    $patterns = @{
        "@/components/ui/card" = "@/components/ui/Card"
        "@/components/ui/button" = "@/components/ui/Button"
        "@/components/layout/layout" = "@/components/layout/Layout"
        "@/components/ui/loading" = "@/components/ui/Loading"
        "@/components/ui/modal" = "@/components/ui/Modal"
        "@/components/ui/dialog" = "@/components/ui/Dialog"
        "@/components/ui/input" = "@/components/ui/Input"
        "@/components/ui/label" = "@/components/ui/Label"
        "@/components/ui/select" = "@/components/ui/Select"
        "@/components/ui/table" = "@/components/ui/Table"
        "@/components/ui/tabs" = "@/components/ui/Tabs"
        "@/components/ui/avatar" = "@/components/ui/Avatar"
        "@/components/ui/badge" = "@/components/ui/Badge"
        "@/components/ui/separator" = "@/components/ui/Separator"
        "@/components/ui/toast" = "@/components/ui/Toast"
        "@/components/ui/toaster" = "@/components/ui/Toaster"
    }
    
    foreach ($pattern in $patterns.GetEnumerator()) {
        if ($content -match [regex]::Escape($pattern.Key)) {
            $content = $content -replace [regex]::Escape($pattern.Key), $pattern.Value
            $modified = $true
            Write-Host "  ✓ Fixed: $($pattern.Key) → $($pattern.Value) in $filePath" -ForegroundColor Green
        }
    }
    
    if ($modified) {
        Set-Content -Path $filePath -Value $content -NoNewline
        return $true
    }
    
    return $false
}

# Buscar todos los archivos .tsx y .ts
$files = Get-ChildItem -Path $srcDir -Recurse -Include *.tsx,*.ts | Where-Object { $_.FullName -notmatch "node_modules" }

Write-Host "📁 Encontrados $($files.Count) archivos para revisar..." -ForegroundColor Cyan

$fixedCount = 0

foreach ($file in $files) {
    if (Fix-FileImports -filePath $file.FullName) {
        $fixedCount++
    }
}

Write-Host ""
Write-Host "✅ Proceso completado. Se arreglaron $fixedCount archivos." -ForegroundColor Green

# Verificación específica del problema reportado
Write-Host ""
Write-Host "🔍 Verificando archivos problemáticos específicos:" -ForegroundColor Yellow

$problemFiles = @(
    ".\src\app\billing\suspended\page.tsx",
    ".\src\app\calendar\page.tsx"
)

foreach ($file in $problemFiles) {
    if (Test-Path $file) {
        Write-Host "  Revisando: $file" -ForegroundColor Cyan
        $content = Get-Content $file -Raw
        
        # Verificar imports problemáticos
        if ($content -match "@/components/ui/Card") {
            Write-Host "    ✓ Import de Card está correcto" -ForegroundColor Green
        }
        if ($content -match "@/components/ui/Button") {
            Write-Host "    ✓ Import de Button está correcto" -ForegroundColor Green
        }
        if ($content -match "@/hooks/useToast") {
            Write-Host "    ✓ Import de toast desde hooks está presente" -ForegroundColor Green
        }
        if ($content -match "@/components/layout/Layout") {
            Write-Host "    ✓ Import de Layout está correcto" -ForegroundColor Green
        }
    }
}

Write-Host ""
Write-Host "📝 SIGUIENTE PASO:" -ForegroundColor Yellow
Write-Host "1. Ejecuta: git add ." -ForegroundColor White
Write-Host "2. Ejecuta: git commit -m 'Fix case-sensitive imports for Vercel'" -ForegroundColor White
Write-Host "3. Ejecuta: git push" -ForegroundColor White
Write-Host "4. Vercel debería construir correctamente ahora" -ForegroundColor White
