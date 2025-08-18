@echo off
echo ============================================
echo  SOLUCION PARA PROBLEMAS DE VERCEL BUILD
echo ============================================
echo.

echo PROBLEMA IDENTIFICADO:
echo - Vercel (Linux) es case-sensitive
echo - Windows no es case-sensitive
echo - Git puede tener archivos cacheados con nombres incorrectos
echo.

echo SOLUCION:
echo 1. Re-trackear todos los archivos en Git
echo.

echo Ejecutando solucion...
echo.

REM Paso 1: Limpiar cache de Git
echo [1/5] Limpiando cache de Git...
git rm -r --cached . > nul 2>&1

REM Paso 2: Agregar todos los archivos nuevamente
echo [2/5] Re-agregando archivos...
git add .

REM Paso 3: Verificar cambios
echo [3/5] Verificando cambios...
git status --short

REM Paso 4: Crear commit
echo [4/5] Creando commit...
git commit -m "Fix: Case sensitivity issues for Vercel deployment"

echo.
echo [5/5] LISTO! Ahora ejecuta:
echo.
echo   git push
echo.
echo Esto deberia solucionar los problemas de compilacion en Vercel.
echo.
echo NOTA ADICIONAL:
echo Si el problema persiste, ve al dashboard de Vercel y:
echo 1. Ve a Settings ^> Functions
echo 2. Limpia el cache del build
echo 3. Redeploy
echo.
pause
