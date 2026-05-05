#!/bin/bash
# OPSEC_CTRL Application Setup Script
# This scripts installs dependencies, builds the application, and starts the server.

set -e # Exit on any error

echo "=================================="
echo " Starting OPSEC_CTRL Setup..."
echo "=================================="

# Check if node/npm is installed
if ! command -v npm &> /dev/null; then
    echo "[!] ERROR: npm is required but not installed."
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "[!] ERROR: node is required but not installed."
    exit 1
fi

echo "[*] Node version: $(node -v)"
echo "[*] npm version: $(npm -v)"

echo ""
echo "[*] Installing dependencies..."
npm install

echo ""
echo "[*] Building the application..."
npm run build

echo ""
echo "[*] Checking for database..."
if [ ! -f "opsec.db" ]; then
    echo "[-] Database (opsec.db) not found. It will be generated automatically upon server start by better-sqlite3."
else
    echo "[+] Database exists."
fi

echo ""
echo "[!] NOTE FOR RASPBERRY PI / LINUX USERS:"
echo "If you saw errors during 'npm install' related to 'node-gyp', 'better-sqlite3', or 'node-pty',"
echo "you may need to install build tools first. If so, press Ctrl+C, run this, and try again:"
echo "   sudo apt-get update && sudo apt-get install -y python3 make g++ build-essential"
echo ""

echo "=================================="
echo " Setup Complete!"
echo ""
echo "[!] TO RE-DEPLOY:"
echo "1. Pull the latest changes to your Pi."
echo "2. Run this updated script: chmod +x setup.sh && ./setup.sh"
echo ""
echo " Note: if you encounter 'node-gyp' errors, run:"
echo " sudo apt-get update && sudo apt-get install -y python3 make g++ build-essential"
echo "=================================="

# Ask to start automatically
read -p "Do you want to start the application now? (y/n): " START_APP
if [[ "$START_APP" =~ ^[Yy]$ ]]; then
    echo "[*] Starting server..."
    npm start
else
    echo "[*] Exiting. Run 'npm start' to start it later."
fi
