@echo off
echo ========================================
echo   Verificar Configuracion de Vercel
echo ========================================
echo.

:: Verificar si existe el proyecto de Vercel
if not exist ".vercel\project.json" (
    echo [ERROR] No hay proyecto de Vercel configurado
    echo.
    echo Ejecuta primero: vercel link
    echo.
    pause
    exit /b 1
)

echo [OK] Proyecto de Vercel encontrado
echo.

:: Mostrar los IDs
echo Tus IDs de Vercel son:
echo ========================================
type .vercel\project.json
echo.
echo ========================================
echo.

:: Verificar si Vercel CLI puede acceder al proyecto
echo Verificando acceso al proyecto...
vercel whoami
echo.

echo Intentando pull del proyecto...
vercel pull --yes

if %errorlevel% equ 0 (
    echo.
    echo [OK] Conexion con Vercel exitosa!
    echo.
    echo ========================================
    echo   SIGUIENTE PASO:
    echo ========================================
    echo.
    echo 1. Ve a GitHub: 
    echo    https://github.com/TU_USUARIO/handy-sales-crm/settings/secrets/actions
    echo.
    echo 2. Actualiza estos secrets con los valores exactos de arriba:
    echo    - VERCEL_ORG_ID
    echo    - VERCEL_PROJECT_ID
    echo    - VERCEL_TOKEN (si no lo tienes, crea uno nuevo)
    echo.
    echo 3. Ve a Settings -^> Actions -^> General
    echo    Selecciona: "Read and write permissions"
    echo.
) else (
    echo.
    echo [ERROR] No se pudo conectar con Vercel
    echo.
    echo Posibles soluciones:
    echo 1. Ejecuta: vercel login
    echo 2. Ejecuta: vercel link
    echo 3. Verifica que el proyecto existe en vercel.com
)

echo.
pause
