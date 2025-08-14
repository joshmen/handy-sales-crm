@echo off
echo ========================================
echo   HandySales CRM - Setup Script
echo ========================================
echo.

echo Verificando Node.js...
node -v
if errorlevel 1 (
    echo ERROR: Node.js no esta instalado
    echo Por favor instala Node.js desde https://nodejs.org
    pause
    exit /b 1
)

echo Verificando npm...
npm -v
if errorlevel 1 (
    echo ERROR: npm no esta instalado
    pause
    exit /b 1
)

echo.
echo Instalando dependencias...
call npm install
if errorlevel 1 (
    echo ERROR: No se pudieron instalar las dependencias
    pause
    exit /b 1
)

echo.
echo Configurando variables de entorno...
if not exist .env.local (
    copy .env.example .env.local
    echo Archivo .env.local creado
    echo Por favor actualiza .env.local con tu configuracion
) else (
    echo Archivo .env.local ya existe
)

echo.
echo Ejecutando build inicial...
call npm run build
if errorlevel 1 (
    echo WARNING: El build inicial fallo
    echo Esto puede ser normal si faltan configuraciones
)

echo.
echo ========================================
echo   Setup Completado!
echo ========================================
echo.
echo Proximos pasos:
echo 1. Actualiza .env.local con tu configuracion
echo 2. Asegurate que el backend .NET este ejecutandose
echo 3. Ejecuta 'npm run dev' para iniciar el desarrollo
echo.
echo Para produccion:
echo - Conecta con Vercel
echo - Configura las variables de entorno
echo - Push a main para desplegar
echo.
pause
