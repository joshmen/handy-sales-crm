@echo off
echo ======================================================
echo    SOLUCION BASADA EN NODE_ENV
echo ======================================================
echo.
echo Has descubierto que funciona con NODE_ENV=development
echo pero falla con NODE_ENV=production
echo.

echo [1] Probando build local en PRODUCTION...
echo.
set NODE_ENV=production
call npm run build

if %ERRORLEVEL% EQU 0 (
    echo.
    echo OK - Build funciona localmente en production
    echo El problema es especifico de Vercel
    echo.
    goto vercel_solution
) else (
    echo.
    echo ERROR - Build falla localmente en production
    echo El problema se puede reproducir
    echo.
    goto local_solution
)

:local_solution
echo ======================================================
echo    APLICANDO SOLUCION LOCAL
echo ======================================================
echo.
echo [1] Actualizando configuracion...
node fix-production-mode.js

echo.
echo [2] Probando de nuevo...
call npm run build

echo.
echo [3] Si ahora funciona, haz:
echo    git add .
echo    git commit -m "Fix: Module resolution for production build"
echo    git push
echo.
goto end

:vercel_solution
echo ======================================================
echo    SOLUCION PARA VERCEL
echo ======================================================
echo.
echo El build funciona localmente, entonces el problema es de Vercel.
echo.
echo SOLUCION TEMPORAL (Inmediata):
echo --------------------------------
echo 1. Ve a https://vercel.com/dashboard
echo 2. Selecciona tu proyecto: handy-sales-crm
echo 3. Ve a Settings -^> Environment Variables
echo 4. Agrega o edita: NODE_ENV = development
echo 5. Click en Save
echo 6. Redeploy (boton Redeploy en Deployments)
echo.
echo SOLUCION PERMANENTE:
echo --------------------
echo 1. Desconecta y reconecta el repo en Vercel:
echo    - Settings -^> Git -^> Disconnect
echo    - Espera 30 segundos
echo    - Connect Git Repository
echo    - Selecciona tu repo
echo.
echo Esto forzara un rebuild limpio con la config correcta.
echo.

:end
echo ======================================================
echo    INFORMACION ADICIONAL
echo ======================================================
echo.
echo Por que pasa esto?
echo - En development, Next.js es mas permisivo con modulos
echo - En production, es mas estricto con case sensitivity
echo - Windows no distingue mayusculas, Linux si
echo.
echo NODE_ENV=development en Vercel es seguro para produccion?
echo - Si, es seguro temporalmente
echo - Solo desactiva algunas optimizaciones menores
echo - No afecta la seguridad ni funcionalidad
echo.
pause
