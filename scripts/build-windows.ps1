# JoeBrowser - One-click Windows EXE builder (PowerShell)
# Right-click -> Run with PowerShell, or run: powershell -ExecutionPolicy Bypass -File ./scripts/build-windows.ps1

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  JoeBrowser - Building Windows EXE" -ForegroundColor White
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
try {
    $nodeVersion = node -v
    $npmVersion = npm -v
    Write-Host "[1/4] Node.js found: $nodeVersion (npm $npmVersion)" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js not found! Install from https://nodejs.org/" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "[2/4] Installing dependencies (npm ci)..." -ForegroundColor Yellow
npm ci
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] npm ci failed" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "[3/4] Typecheck & tests..." -ForegroundColor Yellow
npm run typecheck
npm run selftest
npm run test:generator

Write-Host ""
Write-Host "[4/4] Building Windows EXE (NSIS + Portable)..." -ForegroundColor Yellow
Write-Host "This may take 3-8 minutes..." -ForegroundColor Gray

npx electron-vite build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] vite build failed" -ForegroundColor Red
    exit 1
}

npx electron-builder --win --publish never
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] electron-builder failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "  BUILD SUCCESS!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Get-ChildItem -Path "release" -Filter "*.exe" | ForEach-Object {
    $sizeMB = [math]::Round($_.Length / 1MB, 1)
    Write-Host "  - $($_.Name) ($sizeMB MB)" -ForegroundColor White
}
Write-Host ""
Write-Host "Installer: JoeBrowser-Setup-*.exe  -> install with shortcuts" -ForegroundColor Cyan
Write-Host "Portable:  JoeBrowser-Portable-*.exe -> no install, USB friendly" -ForegroundColor Cyan
Write-Host ""
Write-Host "Double-click the installer to install JoeBrowser." -ForegroundColor White
Read-Host "Press Enter to open release folder"
Invoke-Item "release"
