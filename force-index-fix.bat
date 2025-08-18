@echo off
echo ======================================================
echo    SOLUCION DEFINITIVA PARA VERCEL - ARCHIVOS INDEX
echo ======================================================
echo.

echo [1] Verificando archivos index...
echo.

if exist "src\components\ui\index.ts" (
    echo OK - src\components\ui\index.ts existe
) else (
    echo ERROR - src\components\ui\index.ts NO EXISTE
)

if exist "src\components\layout\index.ts" (
    echo OK - src\components\layout\index.ts existe
) else (
    echo ERROR - src\components\layout\index.ts NO EXISTE
)

if exist "src\hooks\index.ts" (
    echo OK - src\hooks\index.ts existe
) else (
    echo ERROR - src\hooks\index.ts NO EXISTE
)

echo.
echo [2] Configurando Git para case-sensitive...
git config core.ignorecase false

echo.
echo [3] Verificando que Git reconozca los archivos...
git ls-files | findstr "index.ts"

echo.
echo [4] Forzando a Git a re-trackear los archivos index...

REM Remover del cache si existen
git rm --cached src/components/ui/index.ts 2>nul
git rm --cached src/components/layout/index.ts 2>nul
git rm --cached src/hooks/index.ts 2>nul

REM Re-agregar los archivos
git add -f src/components/ui/index.ts
git add -f src/components/layout/index.ts
git add -f src/hooks/index.ts

echo.
echo [5] Verificando cambios...
git status --short

echo.
echo [6] Creando commit forzado...
git commit -m "Force: Add index.ts files for module resolution in Vercel" --allow-empty

echo.
echo ======================================================
echo    IMPORTANTE - Ejecuta estos comandos:
echo.
echo    1. git push --force-with-lease
echo.
echo    Si sigue fallando en Vercel:
echo.
echo    2. Ve a vercel.com
echo    3. Settings -^> Git
echo    4. Disconnect
echo    5. Reconecta el repo
echo ======================================================
pause
