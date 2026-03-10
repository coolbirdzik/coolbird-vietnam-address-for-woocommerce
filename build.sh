#!/bin/bash
#
# Build Script - Vietnam Address Woo
# Builds frontend and creates distributable ZIP file
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

printf "${GREEN}========================================${NC}\n"
printf "${GREEN}Vietnam Address Woo${NC}\n"
printf "${GREEN}Build & Package${NC}\n"
printf "${GREEN}========================================${NC}\n"
printf "\n"

# Get plugin version from main file and strip whitespace
VERSION=$(grep -m 1 "Version:" vietnam-address-woo.php | awk '{print $3}' | tr -d '\r\n')
printf "${BLUE}Plugin version: ${VERSION}${NC}\n"
printf "\n"

# Step 1: Build Frontend
printf "${YELLOW}[1/4] Building React Frontend...${NC}\n"
if command -v node &> /dev/null; then
    cd frontend
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        printf "${YELLOW}Installing dependencies...${NC}\n"
        npm install
    fi
    
    # Build production bundles
    npm run build
    cd ..
    printf "${GREEN}✓ Frontend built successfully${NC}\n"
    printf "\n"
else
    printf "${RED}✗ Error: Node.js not found${NC}\n"
    printf "${RED}Please install Node.js to build the frontend${NC}\n"
    exit 1
fi

# Step 2: Clean up previous builds
printf "${YELLOW}[2/4] Cleaning up...${NC}\n"
rm -rf dist build-temp
rm -f vietnam-address-woo.zip vietnam-address-woo-*.zip
mkdir -p dist/vietnam-address-woo
printf "${GREEN}✓ Cleaned${NC}\n"
printf "\n"

# Step 3: Copy plugin files
printf "${YELLOW}[3/4] Copying plugin files...${NC}\n"

# Main files
cp vietnam-address-woo.php dist/vietnam-address-woo/
cp get-address.php dist/vietnam-address-woo/
cp readme.txt dist/vietnam-address-woo/
cp license.txt dist/vietnam-address-woo/

# Directories
cp -r includes dist/vietnam-address-woo/
cp -r cities dist/vietnam-address-woo/
cp -r i18n dist/vietnam-address-woo/
cp -r languages dist/vietnam-address-woo/

# Copy built frontend (assets/dist folder)
mkdir -p dist/vietnam-address-woo/assets
if [ -d "assets/dist" ]; then
    cp -r assets/dist dist/vietnam-address-woo/assets/
    printf "${GREEN}✓ React bundles included${NC}\n"
else
    printf "${RED}✗ Error: Frontend build not found${NC}\n"
    printf "${RED}Expected: assets/dist/${NC}\n"
    exit 1
fi

# Clean up unnecessary files
find dist/vietnam-address-woo -name ".DS_Store" -delete
find dist/vietnam-address-woo -name "*.log" -delete
find dist/vietnam-address-woo -name ".git*" -delete
find dist/vietnam-address-woo -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true

printf "${GREEN}✓ Files copied${NC}\n"
printf "\n"

# Step 4: Create ZIP file
printf "${YELLOW}[4/4] Creating ZIP archive...${NC}\n"
cd dist
zip -r "vietnam-address-woo-${VERSION}.zip" vietnam-address-woo -q
cd ..

# Display result
if [ -f "dist/vietnam-address-woo-${VERSION}.zip" ]; then
    FILE_SIZE=$(du -h "dist/vietnam-address-woo-${VERSION}.zip" | cut -f1)
    printf "\n"
    printf "${GREEN}========================================${NC}\n"
    printf "${GREEN}✓ BUILD SUCCESS!${NC}\n"
    printf "${GREEN}========================================${NC}\n"
    printf "\n"
    printf "File: ${GREEN}dist/vietnam-address-woo-${VERSION}.zip${NC}\n"
    printf "Size: ${GREEN}${FILE_SIZE}${NC}\n"
    printf "Version: ${GREEN}${VERSION}${NC}\n"
    printf "\n"
    printf "${BLUE}CÀI ĐẶT PLUGIN:${NC}\n"
    printf "1. Vào WordPress Admin → Plugins → Add New\n"
    printf "2. Click 'Upload Plugin'\n"
    printf "3. Chọn file zip vừa tạo\n"
    printf "4. Click 'Install Now' → 'Activate'\n"
    printf "\n"
else
    printf "${RED}✗ Build failed${NC}\n"
    exit 1
fi
