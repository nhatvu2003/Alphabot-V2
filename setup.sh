#!/bin/bash

# ================================================================
#   ██████╗ ██╗     ██████╗ ██╗  ██╗ █████╗ ██████╗  ██████╗ ████████╗
#  ██╔══██╗██║     ██╔══██╗██║  ██║██╔══██╗██╔══██╗██╔═══██╗╚══██╔══╝
#  ███████║██║     ██████╔╝███████║███████║██████╔╝██║   ██║   ██║   
#  ██╔══██║██║     ██╔═══╝ ██╔══██║██╔══██║██╔══██╗██║   ██║   ██║   
#  ██║  ██║███████╗██║     ██║  ██║██║  ██║██████╔╝╚██████╔╝   ██║   
#  ╚═╝  ╚═╝╚══════╝╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚═════╝  ╚═════╝    ╚═╝   
#                          V2  —  Setup Script
# ================================================================

# ── Colors ──────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# ── Config ───────────────────────────────────────────────────────
ZIP_URL="https://raw.githubusercontent.com/nvstudio2003-art/alphabot/main/panel.zip"
ZIP_FILE=".alphabot_tmp.zip"

# ── Helpers ──────────────────────────────────────────────────────
step()  { echo -e "\n${CYAN}${BOLD}[•] $1${RESET}"; }
ok()    { echo -e "${GREEN}[✔] $1${RESET}"; }
fail()  { echo -e "${RED}[✘] $1${RESET}"; exit 1; }
warn()  { echo -e "${YELLOW}[!] $1${RESET}"; }

# ── Kiểm tra dependencies ─────────────────────────────────────────
check_dep() {
    command -v "$1" &>/dev/null || fail "Thiếu: '$1'. Hãy cài đặt trước khi tiếp tục."
}

clear
echo -e "${BOLD}${CYAN}"
echo "  Alphabot V2 — Cài Đặt Tự Động"
echo -e "  ─────────────────────────────${RESET}"
echo ""

step "Kiểm tra môi trường..."
check_dep curl
check_dep unzip
check_dep node
check_dep npm
ok "Môi trường hợp lệ (Node $(node -v), npm $(npm -v))"

step "Tải source từ máy chủ..."
curl -L --progress-bar -o "$ZIP_FILE" "$ZIP_URL" || fail "Tải thất bại. Kiểm tra kết nối internet."
ok "Tải thành công"

step "Giải nén..."
if [ -d "web-gui" ]; then
    warn "Phát hiện web-gui cũ, đang xoá..."
    rm -rf "web-gui"
fi
unzip -q "$ZIP_FILE" -d . || { rm -f "$ZIP_FILE"; fail "Giải nén thất bại."; }
rm -f "$ZIP_FILE"
ok "Giải nén hoàn tất"

step "Cài đặt dependencies (npm install)..."
npm install --silent > /dev/null 2>&1 || fail "npm install thất bại. Kiểm tra lại Node.js / npm."
ok "Dependencies đã sẵn sàng"

echo ""
echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${GREEN}${BOLD}  ✅  Cài đặt hoàn tất!${RESET}"
echo -e "${GREEN}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""
echo -e "  Khởi động:  ${BOLD}npm run start${RESET}"
echo ""
