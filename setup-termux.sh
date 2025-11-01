#!/bin/bash

# 🤖 Alphabot on Termux - Quick Setup Script
# Usage: bash setup-termux.sh

set -e

echo ""
echo "╔════════════════════════════════════════════════════╗"
echo "║  🤖 Alphabot V2 - Termux Auto-Setup               ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""

# Check if running on Termux
if [ ! -d "$HOME/storage" ]; then
    echo "⚠️  This script is optimized for Termux."
    echo "Continue anyway? (y/n)"
    read -r response
    [ "$response" != "y" ] && exit 1
fi

# Step 1: Update packages
echo "📦 Updating packages..."
pkg update -y
pkg upgrade -y

# Step 2: Install required packages
echo "📥 Installing Node.js, Git..."
pkg install -y nodejs git

# Step 3: Clone repo (if not already in it)
if [ ! -f "package.json" ]; then
    echo "📥 Cloning Alphabot repository..."
    git clone https://github.com/nhatvu2003/Alphabot-V2.git
    cd Alphabot-V2
fi

# Step 4: Install npm dependencies
echo "📚 Installing npm dependencies..."
npm install

# Step 5: Setup environment
echo "⚙️  Setting up environment..."
if [ ! -f ".env" ]; then
    cp .env.example .env
    echo "✅ Created .env file (customize if needed)"
fi

# Step 6: Check config
if [ ! -f "config/config.main.json" ]; then
    echo "⚠️  config/config.main.json not found!"
    echo "Please create it before running bot"
fi

# Step 7: Display info
echo ""
echo "╔════════════════════════════════════════════════════╗"
echo "║  ✅ Setup Complete!                               ║"
echo "╚════════════════════════════════════════════════════╝"
echo ""
echo "📱 Next Steps:"
echo "  1. Start Web UI:"
echo "     npm run ui"
echo ""
echo "  2. Open browser (same device):"
echo "     termux-open http://localhost:8080"
echo ""
echo "  3. Update Appstate:"
echo "     - Click '📄 JSON Method' or '🍪 Cookies Method'"
echo "     - Paste appstate/cookies"
echo "     - Click 'Update Appstate'"
echo ""
echo "  4. Bot auto-starts! 🚀"
echo ""
echo "💡 Tips:"
echo "  - Access from PC: http://<termux_ip>:8080"
echo "  - Find IP: hostname -I"
echo "  - Stop server: Ctrl+C"
echo "  - View guide: cat TERMUX_GUIDE.md"
echo ""
