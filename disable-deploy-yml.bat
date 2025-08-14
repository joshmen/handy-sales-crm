@echo off
echo ========================================
echo   Deshabilitando deploy.yml
echo ========================================
echo.

cd .github\workflows

if exist "deploy.yml" (
    ren "deploy.yml" "deploy.yml.disabled"
    echo [OK] deploy.yml ha sido deshabilitado
    echo.
    echo Ahora solo tienes ci-cd-unified.yml activo
) else (
    echo [INFO] deploy.yml no encontrado o ya esta deshabilitado
)

cd ..\..

echo.
echo ========================================
echo   CONFIGURACION OPTIMA LOGRADA
echo ========================================
echo.
echo Solo 1 workflow activo: ci-cd-unified.yml
echo Esto evitara deploys duplicados
echo.

pause
