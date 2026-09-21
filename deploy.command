#!/bin/bash
# ==============================================================================
# SSB Platform — One-Click Production Deployment Script for macOS
# Double-click this file in Finder, or run `npm run deploy` from the terminal.
# ==============================================================================

set -e

# ANSI Color Codes for clean output
BOLD='\033[1m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

clear
echo -e "${BOLD}${CYAN}======================================================${NC}"
echo -e "${BOLD}${CYAN}   🚀 SSB PLATFORM — PRODUCTION DEPLOYMENT (VPS)     ${NC}"
echo -e "${BOLD}${CYAN}======================================================${NC}"
echo ""

# Always operate from the script's own directory
cd "$(dirname "$0")"
PROJECT_DIR="$(pwd)"

VPS_USER="root"
VPS_HOST="88.222.214.155"
VPS_DIR="/var/www/ssb-platform"
PM2_APP_NAME="ssb-platform"

echo -e "${YELLOW}Target Server:${NC} ${VPS_USER}@${VPS_HOST}"
echo -e "${YELLOW}Target Dir:${NC}    ${VPS_DIR}"
echo -e "${YELLOW}Local Repo:${NC}    ${PROJECT_DIR}"
echo ""

# ------------------------------------------------------------------------------
# STEP 1: Verify & Push Local Changes to GitHub
# ------------------------------------------------------------------------------
echo -e "${BOLD}${CYAN}[Step 1/4] Checking local Git repository...${NC}"

# Check for uncommitted changes
if [[ -n $(git status --porcelain) ]]; then
  echo -e "${YELLOW}Uncommitted local changes detected.${NC}"
  read -p "Would you like to auto-commit and push these changes? (y/n): " confirm
  if [[ "$confirm" =~ ^[Yy]$ ]]; then
    read -p "Enter commit message (or press enter for default): " commit_msg
    if [[ -z "$commit_msg" ]]; then
      commit_msg="Update for production deployment $(date '+%Y-%m-%d %H:%M')"
    fi
    git add -A
    git commit -m "$commit_msg"
    echo -e "${GREEN}✓ Changes committed.${NC}"
  else
    echo -e "${RED}Aborting deploy. Please commit or stash your changes first.${NC}"
    read -p "Press [Enter] to exit..."
    exit 1
  fi
fi

# Push to GitHub
echo -e "Pushing local commits to GitHub (main)..."
if git push origin main; then
  echo -e "${GREEN}✓ GitHub is up to date.${NC}"
else
  echo -e "${RED}❌ Failed to push to GitHub. Please check your connection or git credentials.${NC}"
  read -p "Press [Enter] to exit..."
  exit 1
fi
echo ""

# ------------------------------------------------------------------------------
# STEP 2: Pull latest code on VPS
# ------------------------------------------------------------------------------
echo -e "${BOLD}${CYAN}[Step 2/4] Connecting to Hostinger VPS & pulling latest code...${NC}"
ssh -o StrictHostKeyChecking=accept-new "${VPS_USER}@${VPS_HOST}" "bash -se" << EOF
set -e
echo "📍 Entering ${VPS_DIR}..."
cd "${VPS_DIR}"

echo "📥 Pulling latest commits from origin/main..."
git pull origin main
echo "✓ Code pulled successfully."
EOF
echo -e "${GREEN}✓ VPS code updated.${NC}"
echo ""

# ------------------------------------------------------------------------------
# STEP 3: Build Next.js on VPS
# ------------------------------------------------------------------------------
echo -e "${BOLD}${CYAN}[Step 3/4] Building Next.js production bundle on VPS...${NC}"
ssh -o StrictHostKeyChecking=accept-new "${VPS_USER}@${VPS_HOST}" "bash -se" << EOF
set -e
cd "${VPS_DIR}"

echo "📦 Verifying dependencies..."
npm install --prefer-offline --no-audit

echo "⚡ Running production build (npm run build)..."
npm run build
echo "✓ Production build compiled successfully."
EOF
echo -e "${GREEN}✓ Production build succeeded.${NC}"
echo ""

# ------------------------------------------------------------------------------
# STEP 4: Zero-Downtime PM2 Restart
# ------------------------------------------------------------------------------
echo -e "${BOLD}${CYAN}[Step 4/4] Restarting live process with PM2...${NC}"
ssh -o StrictHostKeyChecking=accept-new "${VPS_USER}@${VPS_HOST}" "bash -se" << EOF
set -e
cd "${VPS_DIR}"

echo "🔄 Reloading PM2 process '${PM2_APP_NAME}'..."
pm2 restart "${PM2_APP_NAME}"

echo ""
echo "📊 Current PM2 Status:"
pm2 status "${PM2_APP_NAME}"
EOF
echo -e "${GREEN}✓ PM2 process restarted successfully.${NC}"
echo ""

# ------------------------------------------------------------------------------
# SUCCESS BANNER
# ------------------------------------------------------------------------------
echo -e "${BOLD}${GREEN}======================================================${NC}"
echo -e "${BOLD}${GREEN}   🎉 DEPLOYMENT COMPLETE! YOUR CHANGES ARE LIVE!    ${NC}"
echo -e "${BOLD}${GREEN}======================================================${NC}"
echo -e "Website: ${BOLD}${CYAN}https://ssbwithisv.in${NC}"
echo -e "Offline: ${BOLD}${CYAN}https://ssbwithisv.in/ssb-offline-coaching${NC}"
echo ""
read -p "Press [Enter] to close..."
