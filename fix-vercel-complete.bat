@echo off
echo =====================================================
echo   SOLUCION COMPLETA PARA ERRORES DE VERCEL
echo =====================================================
echo.

echo [PASO 1] Ejecutando correccion masiva de imports...
echo.
node fix-all-imports.js

echo.
echo [PASO 2] Verificando cambios...
git status --short

echo.
echo [PASO 3] Si hay cambios, agregandolos a Git...
git add .

echo.
echo [PASO 4] Creando commit...
git commit -m "Fix: Update all imports to use centralized index exports for Vercel compatibility"

echo.
echo =====================================================
echo   LISTO! Ahora ejecuta:
echo.
echo   git push
echo.
echo   Si Vercel sigue fallando:
echo   1. Ve a vercel.com/dashboard
echo   2. Selecciona tu proyecto
echo   3. Settings -^> Git -^> Disconnect
echo   4. Reconecta el repositorio
echo =====================================================
pause
