@echo off
echo ======================================================
echo    PROBANDO BUILD EN MODO PRODUCTION
echo ======================================================
echo.

echo [1] Limpiando builds anteriores...
if exist .next (
    rmdir /s /q .next
    echo    Carpeta .next eliminada
)

echo.
echo [2] Configurando NODE_ENV=production...
set NODE_ENV=production

echo.
echo [3] Ejecutando build en modo PRODUCTION...
echo.
npm run build

echo.
echo ======================================================
echo    RESULTADO DEL BUILD EN PRODUCTION
echo ======================================================
echo.
echo Si el build FALLA aqui igual que en Vercel:
echo    - El problema esta confirmado
echo    - Es un tema de resolucion de modulos en production
echo.
echo Si el build FUNCIONA aqui:
echo    - El problema es especifico de Vercel
echo    - Necesitamos ajustar la configuracion
echo.
pause
