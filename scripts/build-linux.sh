#!/usr/bin/env bash
# JoeBrowser — One-click Linux builder (AppImage + DEB + RPM)
# Run: bash scripts/build-linux.sh

set -euo pipefail

echo "=========================================="
echo "  JoeBrowser — Building Linux Packages"
echo "=========================================="
echo ""

# Check Node.js
if ! command -v node &>/dev/null; then
    echo "[ERROR] Node.js not found! Install from https://nodejs.org/"
    echo "  Ubuntu/Debian:  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs"
    echo "  Fedora:         sudo dnf install nodejs"
    echo "  Arch:           sudo pacman -S nodejs npm"
    exit 1
fi

NODE_VER=$(node -v)
echo "[1/4] Node.js found: $NODE_VER"

echo ""
echo "[2/4] Installing dependencies (npm ci)..."
npm ci

echo ""
echo "[3/4] Typecheck & tests..."
npm run typecheck
npm run selftest
npm run test:generator

echo ""
echo "[4/4] Building Linux packages (AppImage + DEB + RPM)..."
echo "This may take 3-8 minutes..."

npx electron-vite build
npx electron-builder --linux --publish never

echo ""
echo "=========================================="
echo "  BUILD SUCCESS!"
echo "=========================================="
ls -lh release/*.AppImage release/*.deb release/*.rpm 2>/dev/null || true
echo ""
echo "AppImage: run directly (chmod +x first)"
echo "DEB:      sudo dpkg -i JoeBrowser-*.deb"
echo "RPM:      sudo rpm -i JoeBrowser-*.rpm"
echo ""
