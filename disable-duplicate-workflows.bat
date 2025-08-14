@echo off
echo ========================================
echo   Deshabilitando Workflows Duplicados
echo ========================================
echo.

cd .github\workflows

echo Deshabilitando workflows duplicados...
echo.

:: Renombrar workflows para deshabilitarlos
if exist "deploy-production.yml" (
    ren "deploy-production.yml" "deploy-production.yml.disabled"
    echo [OK] deploy-production.yml deshabilitado
)

if exist "deploy-preview.yml" (
    ren "deploy-preview.yml" "deploy-preview.yml.disabled"
    echo [OK] deploy-preview.yml deshabilitado
)

if exist "vercel-simple.yml" (
    ren "vercel-simple.yml" "vercel-simple.yml.disabled"
    echo [OK] vercel-simple.yml deshabilitado
)

if exist "deploy-direct.yml" (
    ren "deploy-direct.yml" "deploy-direct.yml.disabled"
    echo [OK] deploy-direct.yml deshabilitado
)

if exist "ci.yml" (
    ren "ci.yml" "ci.yml.disabled"
    echo [OK] ci.yml deshabilitado
)

if exist "deploy.yml" (
    ren "deploy.yml" "deploy.yml.disabled"
    echo [OK] deploy.yml deshabilitado
)

echo.
echo ========================================
echo   Workflows Activos:
echo ========================================
echo.
echo - ci-cd-unified.yml (TODO EN UNO)
echo.
echo Los demas workflows han sido deshabilitados (.disabled)
echo Para reactivar alguno, quita la extension .disabled
echo.

cd ..\..

pause
