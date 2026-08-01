@echo off
REM Build script for Windows (NSIS installer + portable EXE)
REM Requires: Node.js 22+, npm, Windows 10/11

echo ==========================================
echo  JoeBrowser — Windows Build
echo ==========================================
echo.

echo [1/3] Installing dependencies...
call npm ci
if errorlevel 1 (
    echo ERROR: npm ci failed. Make sure Node.js 22+ is installed.
    exit /b 1
)

echo.
echo [2/3] Typechecking + building...
call npm run build
if errorlevel 1 (
    echo ERROR: Build failed. Check the errors above.
    exit /b 1
)

echo.
echo [3/3] Packaging Windows installer + portable EXE...
call npx electron-builder --win --publish never
if errorlevel 1 (
    echo ERROR: Packaging failed. Check the errors above.
    exit /b 1
)

echo.
echo ==========================================
echo  BUILD COMPLETE
echo  Output: release\
echo ==========================================
dir /b release\*.exe 2>nul
echo.
pause
