#!/bin/bash
# Script kiểm tra môi trường Termux cho Alphabot
clear

echo "🔍 Đang kiểm tra môi trường Termux..."
echo "=================================="

# Kiểm tra Termux environment
if [[ -n "$PREFIX" ]] && [[ "$PREFIX" == *"termux"* ]]; then
    echo "✅ Môi trường Termux được phát hiện"
else
    echo "❌ Không phải môi trường Termux!"
    echo "⚠️  Bot này chỉ được tối ưu hóa cho Termux"
    exit 1
fi

# Kiểm tra Node.js version
NODE_VERSION=$(node --version 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1)
if [[ -n "$NODE_VERSION" ]] && [[ "$NODE_VERSION" -ge 16 ]]; then
    echo "✅ Node.js phiên bản $NODE_VERSION (>= 16)"
else
    echo "❌ Node.js không được tìm thấy hoặc phiên bản cũ"
    echo "💡 Cài đặt: pkg install nodejs"
    exit 1
fi

# Kiểm tra Git
if command -v git &> /dev/null; then
    echo "✅ Git đã được cài đặt"
else
    echo "❌ Git không được tìm thấy"
    echo "💡 Cài đặt: pkg install git"
    exit 1
fi

# Kiểm tra Python (tùy chọn cho một số dependencies)
if command -v python &> /dev/null; then
    echo "✅ Python đã được cài đặt"
else
    echo "⚠️  Python không được tìm thấy (khuyến nghị)"
    echo "💡 Cài đặt: pkg install python"
fi

# Kiểm tra storage permissions
if [[ ! -d "$HOME/storage" ]]; then
    echo "⚠️  Quyền truy cập storage chưa được cấp"
    echo "💡 Chạy: termux-setup-storage"
fi

# Kiểm tra memory available
AVAILABLE_RAM=$(free -m | awk 'NR==2{printf "%.0f", $7*100/$2 }')
if [[ "$AVAILABLE_RAM" -gt 30 ]]; then
    echo "✅ RAM khả dụng: ${AVAILABLE_RAM}%"
else
    echo "⚠️  RAM thấp: ${AVAILABLE_RAM}% - Bot có thể chạy chậm"
fi

echo "=================================="
echo "✅ Kiểm tra hoàn tất! Termux ready để chạy Alphabot"
echo "💡 Để cài đặt bot, chạy: npm run setup"