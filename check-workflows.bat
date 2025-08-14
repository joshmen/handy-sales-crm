@echo off
echo ========================================
echo   Estado de GitHub Actions Workflows
echo ========================================
echo.

cd .github\workflows

echo WORKFLOWS ACTIVOS (.yml):
echo ------------------------
for %%f in (*.yml) do (
    echo   - %%f
)

echo.
echo WORKFLOWS DESHABILITADOS (.disabled):
echo ------------------------------------
for %%f in (*.disabled) do (
    echo   - %%f
)

echo.
echo ========================================
echo   Resumen
echo ========================================
echo.

:: Contar workflows
set count_active=0
set count_disabled=0

for %%f in (*.yml) do set /a count_active+=1
for %%f in (*.disabled) do set /a count_disabled+=1

echo Total activos: %count_active%
echo Total deshabilitados: %count_disabled%
echo.

if %count_active% GTR 1 (
    echo [ADVERTENCIA] Tienes multiples workflows activos!
    echo Esto causara multiples deploys en cada push.
    echo Considera ejecutar: disable-duplicate-workflows.bat
) else (
    echo [OK] Configuracion optima
)

cd ..\..

echo.
pause
