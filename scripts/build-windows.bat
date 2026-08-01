@echo off
REM JoeBrowser - One-click Windows EXE builder
REM Double-click this file on Windows 10/11 to build the .exe installer.

echo ==========================================
echo   JoeBrowser - Building Windows EXE
echo ==========================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
  echo [ERROR] Node.js not found!
  echo Please install Node.js 20+ from https://nodejs.org/
  echo Then run this file again.
  pause
  exit /b 1
)

echo [1/4] Checking Node version...
node -v
npm -v

echo.
echo [2/4] Installing dependencies (npm ci)...
call npm ci
if %ERRORLEVEL% NEQ 0 (
  echo [ERROR] npm ci failed.
  pause
  exit /b 1
)

echo.
echo [3/4] Running typechecks and tests...
call npm run typecheck
if %ERRORLEVEL% NEQ 0 (
  echo [WARN] Typecheck failed, continuing...
)
call npm run selftest
call npm run test:generator

echo.
echo [4/4] Building Windows EXE (NSIS installer + Portable)...
echo This may take 3-8 minutes depending on your PC.
call npx electron-vite build
if %ERRORLEVEL% NEQ 0 (
  echo [ERROR] Build failed.
  pause
  exit /b 1
)
call npx electron-builder --win --publish never
if %ERRORLEVEL% NEQ 0 (
  echo [ERROR] electron-builder failed.
  pause
  exit /b 1
)

echo.
echo ==========================================
echo   BUILD SUCCESS!
echo ==========================================
echo Your EXE files are in the /release folder:
dir /B release\*.exe
echo.
echo Installer:  JoeBrowser-Setup-*.exe
echo Portable:   JoeBrowser-Portable-*.exe
echo.
echo You can double-click the installer to install JoeBrowser.
echo.
pause
