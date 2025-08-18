@echo off
echo ======================================================
echo    SOLUCION DIRECTA PARA VERCEL
echo ======================================================
echo.
echo Ya que el build funciona localmente pero no en Vercel,
echo vamos a usar imports directos que siempre funcionan.
echo.

echo [1] Ejecutando diagnostico...
echo.
node diagnose-vercel-issue.js

echo.
echo [2] Aplicando correccion de imports...
echo.
node fix-vercel-imports-direct.js

echo.
echo [3] Verificando cambios en Git...
git status --short

echo.
echo [4] Agregando cambios...
git add .

echo.
echo [5] Creando commit...
git commit -m "Fix: Use direct imports instead of index files for Vercel"

echo.
echo ======================================================
echo    LISTO! Ahora ejecuta:
echo.
echo    git push
echo.
echo    Esto deberia resolver el problema en Vercel.
echo.
echo    SI TODAVIA FALLA:
echo    ----------------
echo    La unica solucion garantizada es:
echo.
echo    1. Ve a https://vercel.com/dashboard
echo    2. Selecciona tu proyecto: handy-sales-crm
echo    3. Ve a Settings -^> Git
echo    4. Click en "Disconnect from Git" (boton rojo)
echo    5. Espera 30 segundos
echo    6. Click en "Connect Git Repository"
echo    7. Selecciona tu repo de nuevo
echo.
echo    Esto forzara un rebuild 100% limpio.
echo ======================================================
pause
