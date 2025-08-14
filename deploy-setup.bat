@echo off
echo ========================================
echo   HandySales CRM - Setup de Despliegue
echo ========================================
echo.

:: Verificar si Git está instalado
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Git no está instalado. Por favor instala Git primero.
    echo Descarga desde: https://git-scm.com/download/win
    pause
    exit /b 1
)

:: Verificar si ya existe un repositorio Git
if exist .git (
    echo [INFO] Repositorio Git ya inicializado
) else (
    echo [INFO] Inicializando repositorio Git...
    git init
    echo [OK] Git inicializado
)

:: Verificar si hay cambios para commitear
git status --porcelain >nul 2>&1
if %errorlevel% equ 0 (
    echo.
    echo [INFO] Preparando archivos para commit...
    git add .
    
    echo.
    set /p commit_msg="Ingresa el mensaje del commit (o presiona Enter para usar el default): "
    if "%commit_msg%"=="" set commit_msg=Initial commit: HandySales CRM
    
    git commit -m "%commit_msg%"
    echo [OK] Commit realizado
)

:: Verificar si hay un remote configurado
git remote -v | find "origin" >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ========================================
    echo   Configuración de GitHub
    echo ========================================
    echo.
    echo Necesitas crear un repositorio en GitHub primero:
    echo 1. Ve a https://github.com/new
    echo 2. Crea un repositorio llamado 'handy-sales-crm'
    echo 3. NO inicialices con README, .gitignore o licencia
    echo.
    set /p github_username="Ingresa tu nombre de usuario de GitHub: "
    
    if not "%github_username%"=="" (
        git remote add origin https://github.com/%github_username%/handy-sales-crm.git
        echo [OK] Remote configurado
        
        echo.
        echo [INFO] Subiendo código a GitHub...
        git branch -M main
        git push -u origin main
        
        if %errorlevel% equ 0 (
            echo [OK] Código subido exitosamente a GitHub
        ) else (
            echo [ERROR] No se pudo subir el código. Verifica tus credenciales.
        )
    )
) else (
    echo [INFO] Remote ya configurado
    
    :: Push cualquier cambio pendiente
    git push
    if %errorlevel% equ 0 (
        echo [OK] Cambios sincronizados con GitHub
    )
)

echo.
echo ========================================
echo   Generando NEXTAUTH_SECRET
echo ========================================
echo.

:: Generar un secret aleatorio usando PowerShell
for /f "delims=" %%i in ('powershell -Command "[System.Convert]::ToBase64String((1..32 | ForEach-Object {Get-Random -Maximum 256}))"') do set NEXTAUTH_SECRET=%%i

echo Tu NEXTAUTH_SECRET generado es:
echo.
echo %NEXTAUTH_SECRET%
echo.
echo [IMPORTANTE] Guarda este secret de forma segura!
echo Lo necesitarás para configurar las variables de entorno en Vercel.

:: Crear archivo con las variables de entorno para Vercel
echo.
echo ========================================
echo   Creando archivo de variables
echo ========================================
echo.

(
echo # Variables de Entorno para Vercel
echo # Copia estas variables en Vercel Dashboard
echo.
echo NEXTAUTH_URL=https://tu-proyecto.vercel.app
echo NEXTAUTH_SECRET=%NEXTAUTH_SECRET%
echo NODE_ENV=production
echo NEXT_PUBLIC_ENV=production
echo.
echo # Si tienes API Backend:
echo # NEXT_PUBLIC_API_URL=https://tu-api.com/api
echo.
echo # Opcionales:
echo # CLOUDINARY_CLOUD_NAME=
echo # CLOUDINARY_API_KEY=
echo # CLOUDINARY_API_SECRET=
echo # RESEND_API_KEY=
echo # STRIPE_SECRET_KEY=
) > vercel-env-vars.txt

echo [OK] Archivo 'vercel-env-vars.txt' creado con las variables de entorno

echo.
echo ========================================
echo   Verificando Vercel CLI
echo ========================================
echo.

:: Verificar si Vercel CLI está instalado
vercel --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Vercel CLI no está instalado
    echo.
    set /p install_vercel="¿Deseas instalar Vercel CLI ahora? (s/n): "
    
    if /i "%install_vercel%"=="s" (
        echo [INFO] Instalando Vercel CLI...
        npm i -g vercel
        
        if %errorlevel% equ 0 (
            echo [OK] Vercel CLI instalado
        ) else (
            echo [ERROR] No se pudo instalar Vercel CLI
        )
    )
) else (
    echo [OK] Vercel CLI ya está instalado
)

echo.
echo ========================================
echo   Próximos Pasos
echo ========================================
echo.
echo 1. Ve a https://vercel.com y haz login
echo 2. Click en "New Project"
echo 3. Importa tu repositorio: handy-sales-crm
echo 4. Configura las variables de entorno del archivo 'vercel-env-vars.txt'
echo 5. Click en "Deploy"
echo.
echo O usa Vercel CLI ejecutando: vercel
echo.
echo ========================================
echo   ¡Setup Completado!
echo ========================================
echo.

pause
