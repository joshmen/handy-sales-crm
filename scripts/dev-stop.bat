@echo off
REM Script para detener el entorno de desarrollo de HandySales

echo ========================================
echo   Deteniendo HandySales Development
echo ========================================
echo.

REM Detener y eliminar contenedores
echo [INFO] Deteniendo servicios...
docker-compose -f docker-compose.dev.yml down

echo [INFO] Eliminando volúmenes (opcional)...
set /p clean="¿Quieres eliminar los datos de la base de datos? (S/N): "
if /i "%clean%"=="S" (
    docker-compose -f docker-compose.dev.yml down -v
    echo [INFO] Datos eliminados
) else (
    echo [INFO] Datos conservados
)

REM Mostrar estado final
echo.
echo Estado final:
docker-compose -f docker-compose.dev.yml ps

echo.
echo [INFO] Entorno de desarrollo detenido
pause