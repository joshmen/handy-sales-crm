@echo off
echo ======================================================
echo    SOLUCION BASADA EN EL ARTICULO DE VERCEL
echo ======================================================
echo.
echo Problema: En production, Vercel solo instala "dependencies"
echo          No instala "devDependencies"
echo.
echo Solucion: Forzar instalacion completa con --production=false
echo.

echo [1] Actualizando vercel.json...
echo.
echo {
echo   "installCommand": "npm install --legacy-peer-deps --production=false"
echo }
echo.
echo Ya actualizado!

echo.
echo [2] Verificando dependencias...
node fix-dependencies.js

echo.
echo [3] Haciendo commit de los cambios...
git add vercel.json package.json package-lock.json
git commit -m "Fix: Force install all dependencies in Vercel production build"

echo.
echo ======================================================
echo    LISTO! Ahora ejecuta:
echo.
echo    git push
echo.
echo    Esto deberia resolver el problema definitivamente.
echo.
echo    La clave es: --production=false
echo    Esto fuerza a Vercel a instalar TODO, no solo dependencies
echo ======================================================
pause
