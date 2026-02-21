@echo off
setlocal enabledelayedexpansion
cd /d "%~dp0.."

echo.
echo ========================================================
echo   HandySales - Pre-Push Build + Deploy Verification
echo ========================================================
echo.

set "HAS_WARNINGS=0"
set "HAS_ERRORS=0"

:: ──────────────────────────────────────────────────────────
:: STEP 1: Uncommitted .cs / .csproj files (CI won't have them)
:: ──────────────────────────────────────────────────────────
echo [1/6] Checking for uncommitted build files...
set "UNCOMMITTED="
for /f "tokens=1,2*" %%a in ('git status --porcelain 2^>nul') do (
    echo %%b | findstr /R "\.cs$ \.csproj$" >nul 2>&1
    if !errorlevel!==0 (
        if "%%a"==" M" (
            set "UNCOMMITTED=1"
            echo   [!] NOT STAGED: %%b
        )
        if "%%a"=="??" (
            echo %%b | findstr /R "Migrations\\ Entities\\ Services\\ Email\\" >nul 2>&1
            if !errorlevel!==0 (
                set "UNCOMMITTED=1"
                echo   [!] UNTRACKED: %%b
            )
        )
    )
)
if defined UNCOMMITTED (
    echo.
    echo   [WARNING] Files above are NOT committed. CI build may FAIL.
    echo   Run: git add [files] ^&^& git commit
    set "HAS_WARNINGS=1"
) else (
    echo   [OK] All build files are committed.
)
echo.

:: ──────────────────────────────────────────────────────────
:: STEP 2: Build API locally (same as CI efbundle does)
:: ──────────────────────────────────────────────────────────
echo [2/6] Building API project...
dotnet build apps\api\src\HandySales.Api\HandySales.Api.csproj -q 2>nul
if %errorlevel% neq 0 (
    echo   [FAIL] Build FAILED. CI will also fail.
    echo.
    echo   Full error output:
    dotnet build apps\api\src\HandySales.Api\HandySales.Api.csproj
    set "HAS_ERRORS=1"
    goto :SUMMARY
)
echo   [OK] Build succeeded.
echo.

:: ──────────────────────────────────────────────────────────
:: STEP 3: Detect NEW environment variables in the diff
:: ──────────────────────────────────────────────────────────
echo [3/6] Scanning for new environment variables...

:: Create temp file with env var names from diff
set "ENVFILE=%TEMP%\handy_envcheck.txt"
if exist "%ENVFILE%" del "%ENVFILE%"

:: Backend: Environment.GetEnvironmentVariable("XXX")
for /f "tokens=*" %%L in ('git diff origin/main...HEAD -- "*.cs" 2^>nul ^| findstr /R "GetEnvironmentVariable" ^| findstr "^\+"') do (
    echo   [BACKEND] %%L >> "%ENVFILE%"
)

:: Frontend: process.env.XXX
for /f "tokens=*" %%L in ('git diff origin/main...HEAD -- "*.ts" "*.tsx" 2^>nul ^| findstr "process\.env\." ^| findstr "^\+"') do (
    echo   [FRONTEND] %%L >> "%ENVFILE%"
)

:: Backend: config["XXX"] or config.GetValue
for /f "tokens=*" %%L in ('git diff origin/main...HEAD -- "*.cs" 2^>nul ^| findstr /R "config\[" ^| findstr "^\+"') do (
    echo   [CONFIG] %%L >> "%ENVFILE%"
)

if exist "%ENVFILE%" (
    echo.
    echo   [ACTION REQUIRED] New env var references found in this push:
    echo   ────────────────────────────────────────────────────
    type "%ENVFILE%"
    echo   ────────────────────────────────────────────────────
    echo.
    echo   Check .env.production.template for the full list.
    echo   Add missing vars to Railway/Vercel dashboards BEFORE deploying.
    echo.
    echo   Railway:  https://railway.app/dashboard
    echo   Vercel:   https://vercel.com/dashboard
    echo.
    set "HAS_WARNINGS=1"
    del "%ENVFILE%"
) else (
    echo   [OK] No new environment variables detected.
)
echo.

:: ──────────────────────────────────────────────────────────
:: STEP 4: Detect new EF Core migrations
:: ──────────────────────────────────────────────────────────
echo [4/6] Checking for new EF Core migrations...
set "HAS_MIGRATIONS=0"
for /f "tokens=*" %%F in ('git diff --name-only origin/main...HEAD 2^>nul ^| findstr /R "Migrations.*\.cs$"') do (
    echo   [MIGRATION] %%F
    set "HAS_MIGRATIONS=1"
)
if !HAS_MIGRATIONS!==1 (
    echo.
    echo   [INFO] Migrations above will auto-apply via CI/CD efbundle.
    echo   Requires GitHub Secret: PRODUCTION_DB_CONNECTION_STRING
    echo.
) else (
    echo   [OK] No new migrations.
)
echo.

:: ──────────────────────────────────────────────────────────
:: STEP 5: Check .env.production.template was updated
:: ──────────────────────────────────────────────────────────
echo [5/6] Checking .env.production.template...
git diff --name-only origin/main...HEAD | findstr ".env.production.template" >nul 2>&1
if %errorlevel%==0 (
    echo   [OK] Template was updated in this push.
) else (
    if !HAS_WARNINGS!==1 (
        echo   [WARNING] New env vars detected but .env.production.template NOT updated.
        echo   Consider adding new variables to the template for documentation.
    ) else (
        echo   [OK] No template update needed.
    )
)
echo.

:: ──────────────────────────────────────────────────────────
:: STEP 6: SUMMARY + PUSH
:: ──────────────────────────────────────────────────────────
:SUMMARY
echo ========================================================
echo   SUMMARY
echo ========================================================
echo.
echo   Branch:
git branch --show-current
echo.
echo   Commits to push:
git log --oneline origin/main..HEAD 2>nul
if %errorlevel% neq 0 (
    echo   [OK] Already up to date with origin.
    goto :END
)
echo.

if !HAS_ERRORS!==1 (
    echo   [BLOCKED] Fix build errors before pushing.
    echo.
    goto :END
)

if !HAS_WARNINGS!==1 (
    echo   [WARNINGS FOUND] Review warnings above before pushing.
    echo.
)

echo ========================================================
set /p PUSH="  Push to origin/main? (y/n): "
if /i "!PUSH!"=="y" (
    echo.
    echo   Pushing...
    git push origin main
    if !errorlevel!==0 (
        echo.
        echo   [DONE] Push successful.
        echo.
        echo   Monitor CI/CD:
        echo   https://github.com/joshmen/handy-sales-crm/actions
        echo.
        echo   Check Railway deploy:
        echo   https://railway.app/dashboard
        echo.
    ) else (
        echo   [FAIL] Push failed. Check git output above.
    )
) else (
    echo   Push cancelled.
)

:END
echo.
endlocal
