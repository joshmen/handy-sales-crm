@echo off
echo =====================================================
echo   SOLUCION DEFINITIVA PARA VERCEL BUILD ERRORS
echo =====================================================
echo.

echo DIAGNOSTICO:
echo El problema es que Git en Windows ignora cambios de mayusculas
echo Vercel (Linux) SI distingue mayusculas/minusculas
echo.

echo SOLUCION PASO A PASO:
echo.

echo [1/6] Configurando Git para ser case-sensitive...
git config core.ignorecase false

echo.
echo [2/6] Verificando estado actual...
git status --short

echo.
echo [3/6] Removiendo TODOS los archivos del indice de Git (no se borran fisicamente)...
git rm -r --cached .

echo.
echo [4/6] Re-agregando todos los archivos con el case correcto...
git add .

echo.
echo [5/6] Creando commit con los cambios...
git commit -m "Fix: Force case-sensitive file tracking for Vercel deployment"

echo.
echo [6/6] IMPORTANTE - Ejecuta ahora:
echo.
echo   git push --force-with-lease
echo.
echo =====================================================
echo.
echo NOTA: El flag --force-with-lease es mas seguro que --force
echo       Solo sobrescribe si no hay cambios nuevos en el remoto
echo.
echo Si aun asi falla, ejecuta:
echo   1. En Vercel Dashboard, ve a tu proyecto
echo   2. Settings -> Git
echo   3. Disconnect from Git
echo   4. Reconnect to Git
echo   5. Esto forzara un rebuild completo sin cache
echo.
pause
