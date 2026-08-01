#!/usr/bin/env bash
# JoeBrowser — One-click macOS builder (DMG + ZIP)
# Run: bash scripts/build-mac.sh

set -euo pipefail

echo "=========================================="
echo "  JoeBrowser — Building macOS Packages"
echo "=========================================="
echo ""

# Check Node.js
if ! command -v node &>/dev/null; then
    echo "[ERROR] Node.js not found! Install from https://nodejs.org/"
    echo "  brew install node   (via Homebrew)"
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
echo "[4/4] Building macOS packages (DMG + ZIP)..."
echo "This may take 3-8 minutes..."

npx electron-vite build
npx electron-builder --mac --publish never

echo ""
echo "=========================================="
echo "  BUILD SUCCESS!"
echo "=========================================="
ls -lh release/*.dmg release/*.zip 2>/dev/null || true
echo ""
echo "DMG: mount and drag JoeBrowser to Applications"
echo "ZIP: extract and move JoeBrowser.app to Applications"
echo ""
