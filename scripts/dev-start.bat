@echo off
REM Script para iniciar el entorno de desarrollo de HandySales

REM Navegar al directorio raíz del proyecto
cd /d "%~dp0.."

echo ========================================
echo   HandySales - Entorno de Desarrollo
echo ========================================
echo.

REM Verificar si Docker está ejecutándose
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker no está ejecutándose
    echo Por favor inicia Docker Desktop y vuelve a intentar
    pause
    exit /b 1
)

echo [INFO] Docker está ejecutándose correctamente

REM Crear directorios necesarios si no existen
if not exist "apps\api\logs" mkdir "apps\api\logs"
if not exist "apps\api\uploads" mkdir "apps\api\uploads"
if not exist "apps\api\certificates" mkdir "apps\api\certificates"
if not exist "apps\api\facturas" mkdir "apps\api\facturas"
if not exist "apps\mobile\logs" mkdir "apps\mobile\logs"
if not exist "apps\billing\logs" mkdir "apps\billing\logs"

echo [INFO] Directorios creados/verificados

REM Eliminar contenedores anteriores si existen
echo [INFO] Limpiando contenedores anteriores...
docker-compose -f docker-compose.dev.yml down -v 2>nul

REM Construir y levantar servicios
echo [INFO] Construyendo imágenes Docker...
docker-compose -f docker-compose.dev.yml build --no-cache

echo [INFO] Iniciando servicios...
docker-compose -f docker-compose.dev.yml up -d

REM Esperar a que los servicios estén listos
echo [INFO] Esperando a que los servicios estén listos...
timeout /t 30 /nobreak

REM Verificar estado de los servicios
echo.
echo ========================================
echo   Estado de los Servicios
echo ========================================
docker-compose -f docker-compose.dev.yml ps

echo.
echo ========================================
echo   URLs de Desarrollo
echo ========================================
echo API Principal:           http://localhost:5000/swagger
echo API Movil:               http://localhost:5002/swagger
echo API Facturacion:         http://localhost:5001/swagger
echo Proxy Nginx (opcional):  http://localhost:8080
echo phpMyAdmin (opcional):   http://localhost:8081
echo.
echo Usuario de prueba:
echo Email:    admin@handysales.com
echo Password: Admin123!
echo.
echo Base de datos:
echo Host:     localhost:3306
echo User:     handy_user
echo Password: handy_pass
echo.
echo ========================================
echo   Comandos Utiles
echo ========================================
echo Ver logs API Principal:   docker logs handysales_api_main_dev -f
echo Ver logs API Movil:       docker logs handysales_api_mobile_dev -f
echo Ver logs API Facturacion: docker logs handysales_api_billing_dev -f
echo Ver logs MySQL:           docker logs handysales_mysql_dev -f
echo Detener servicios:        docker-compose -f docker-compose.dev.yml down
echo.

REM Verificar que las APIs estén respondiendo
echo [INFO] Verificando APIs...
timeout /t 5 /nobreak
curl -s http://localhost:5000/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] API Principal esta funcionando
) else (
    echo [X] API Principal no responde
)

curl -s http://localhost:5002/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] API Movil esta funcionando
) else (
    echo [X] API Movil no responde
)

curl -s http://localhost:5001/health >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] API Facturacion esta funcionando
) else (
    echo [X] API Facturacion no responde
)

echo.
echo Entorno de desarrollo listo!
echo Presiona cualquier tecla para ver los logs en tiempo real...
pause >nul

REM Mostrar logs en tiempo real
docker-compose -f docker-compose.dev.yml logs -f