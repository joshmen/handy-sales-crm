@echo off
echo ======================================================
echo    SOLUCION NUCLEAR PARA VERCEL
echo ======================================================
echo.
echo Este script solucionara TODOS los problemas de Vercel
echo.

echo [PASO 1] Diagnosticando el problema...
node diagnose-vercel-issue.js

echo.
echo [PASO 2] Configurando Git para Linux/Vercel...
git config core.ignorecase false
git config core.autocrlf true

echo.
echo [PASO 3] Limpiando COMPLETAMENTE el cache de Git...
echo.
echo ADVERTENCIA: Esto limpiara TODO el cache de Git
echo Presiona Ctrl+C para cancelar o
pause

REM Limpiar TODO el cache
git rm -r --cached .

echo.
echo [PASO 4] Re-agregando TODOS los archivos...
git add -A

echo.
echo [PASO 5] Verificando archivos criticos...
git ls-files | findstr /C:"index.ts"

echo.
echo [PASO 6] Creando commit definitivo...
git commit -m "NUCLEAR FIX: Complete cache reset for Vercel case sensitivity issues"

echo.
echo ======================================================
echo    PASOS FINALES CRITICOS:
echo.
echo    1. Ejecuta AHORA:
echo       git push --force-with-lease origin fix-deployment-issues
echo.
echo    2. Si Vercel TODAVIA falla:
echo.
echo       a) Ve a https://vercel.com/dashboard
echo       b) Selecciona: handy-sales-crm
echo       c) Settings -^> Git
echo       d) Click en "Disconnect from Git"
echo       e) Espera 30 segundos
echo       f) Click en "Connect Git Repository"
echo       g) Selecciona tu repo de nuevo
echo       h) Vercel hara un rebuild completo
echo.
echo    3. ALTERNATIVA si lo anterior no funciona:
echo.
echo       a) Crea una NUEVA branch:
echo          git checkout -b vercel-fix-final
echo          git push -u origin vercel-fix-final
echo.
echo       b) En Vercel, cambia la branch de deployment
echo          a "vercel-fix-final"
echo.
echo ======================================================
pause
