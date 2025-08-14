@echo off
echo ========================================
echo   Configuracion GitHub Actions + Vercel
echo ========================================
echo.

:: Verificar si Vercel CLI está instalado
vercel --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Instalando Vercel CLI...
    npm i -g vercel
)

echo [PASO 1] Conectando con Vercel...
echo.
echo Esto te pedira login en Vercel si no estas autenticado.
echo.

:: Link con proyecto de Vercel
vercel link

:: Verificar si se creó el archivo de configuración
if not exist ".vercel\project.json" (
    echo [ERROR] No se pudo conectar con Vercel
    echo Por favor, ejecuta "vercel" manualmente primero
    pause
    exit /b 1
)

echo.
echo [OK] Proyecto conectado con Vercel
echo.

:: Leer los IDs del archivo project.json
echo [PASO 2] Obteniendo IDs de Vercel...
echo.

:: Usar PowerShell para parsear JSON
for /f "delims=" %%i in ('powershell -Command "(Get-Content .vercel\project.json | ConvertFrom-Json).orgId"') do set VERCEL_ORG_ID=%%i
for /f "delims=" %%i in ('powershell -Command "(Get-Content .vercel\project.json | ConvertFrom-Json).projectId"') do set VERCEL_PROJECT_ID=%%i

echo VERCEL_ORG_ID: %VERCEL_ORG_ID%
echo VERCEL_PROJECT_ID: %VERCEL_PROJECT_ID%
echo.

:: Crear archivo con instrucciones
(
echo ========================================
echo   CONFIGURACION DE GITHUB SECRETS
echo ========================================
echo.
echo Ahora necesitas agregar estos secrets en GitHub:
echo.
echo 1. Ve a tu repositorio en GitHub
echo 2. Settings -^> Secrets and variables -^> Actions
echo 3. Agrega estos 3 secrets:
echo.
echo VERCEL_ORG_ID = %VERCEL_ORG_ID%
echo VERCEL_PROJECT_ID = %VERCEL_PROJECT_ID%
echo VERCEL_TOKEN = ^(crear en https://vercel.com/account/tokens^)
echo.
echo ========================================
echo   CREAR TOKEN DE VERCEL
echo ========================================
echo.
echo 1. Ve a: https://vercel.com/account/tokens
echo 2. Click en "Create"
echo 3. Nombre: github-actions-deployment
echo 4. Scope: Full Account
echo 5. Expiration: No Expiration
echo 6. Click "Create Token"
echo 7. COPIA el token ^(solo se muestra una vez^)
echo.
echo ========================================
echo   AGREGAR SECRETS EN GITHUB
echo ========================================
echo.
echo Para cada secret en GitHub:
echo 1. Click "New repository secret"
echo 2. Name: VERCEL_TOKEN / VERCEL_ORG_ID / VERCEL_PROJECT_ID
echo 3. Value: Pega el valor correspondiente
echo 4. Click "Add secret"
echo.
echo ========================================
) > github-secrets-config.txt

echo [OK] Archivo 'github-secrets-config.txt' creado con las instrucciones
echo.

:: Verificar si los workflows ya están committeados
git status .github/workflows --porcelain >nul 2>&1
if %errorlevel% equ 0 (
    echo [PASO 3] Agregando workflows a Git...
    git add .github/workflows/
    git commit -m "ci: Add GitHub Actions workflows for Vercel deployment"
    echo.
    echo [OK] Workflows agregados al repositorio
    echo.
    
    set /p push_changes="Deseas hacer push ahora? (s/n): "
    if /i "%push_changes%"=="s" (
        git push
        echo [OK] Cambios subidos a GitHub
    )
)

echo.
echo ========================================
echo   PROXIMOS PASOS
echo ========================================
echo.
echo 1. Abre 'github-secrets-config.txt' para ver los IDs
echo 2. Crea un token en: https://vercel.com/account/tokens
echo 3. Agrega los 3 secrets en GitHub Settings
echo 4. Haz un commit para probar:
echo    git add .
echo    git commit -m "test: GitHub Actions"
echo    git push
echo 5. Ve a GitHub -^> Actions para ver el workflow
echo.
echo ========================================
echo   URLs IMPORTANTES
echo ========================================
echo.
echo Token Vercel: https://vercel.com/account/tokens
echo GitHub Secrets: https://github.com/TU_USUARIO/handy-sales-crm/settings/secrets/actions
echo GitHub Actions: https://github.com/TU_USUARIO/handy-sales-crm/actions
echo.

pause
