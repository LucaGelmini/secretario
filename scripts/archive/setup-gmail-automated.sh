#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   Gmail OAuth2 Automated Setup - Secretario              ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Set gcloud path
export PATH="/tmp/google-cloud-sdk/bin:$PATH"

# Check if gcloud is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" &>/dev/null; then
    echo -e "${YELLOW}You need to authenticate with Google Cloud first.${NC}"
    echo "Opening browser for authentication..."
    gcloud auth login --brief
fi

ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -n1)
echo -e "${GREEN}✓ Authenticated as: ${ACCOUNT}${NC}"

# Step 1: Create or select project
echo ""
echo -e "${BLUE}Step 1: Project Setup${NC}"
echo "═══════════════════════════════════════════════════════════"

PROJECT_ID="secretario-$(date +%s)"
echo -e "Creating new project: ${GREEN}${PROJECT_ID}${NC}"

if gcloud projects create "$PROJECT_ID" --name="Secretario" 2>/dev/null; then
    echo -e "${GREEN}✓ Project created${NC}"
else
    echo -e "${YELLOW}⚠ Project creation failed (you may need billing enabled)${NC}"
    echo "Listing your existing projects:"
    gcloud projects list --format="table(projectId,name)"
    echo ""
    read -p "Enter an existing project ID to use: " PROJECT_ID
fi

gcloud config set project "$PROJECT_ID"
echo -e "${GREEN}✓ Using project: ${PROJECT_ID}${NC}"

# Step 2: Enable Gmail API
echo ""
echo -e "${BLUE}Step 2: Enabling Gmail API${NC}"
echo "═══════════════════════════════════════════════════════════"

gcloud services enable gmail.googleapis.com --project="$PROJECT_ID"
echo -e "${GREEN}✓ Gmail API enabled${NC}"

# Step 3: Create OAuth2 credentials
echo ""
echo -e "${BLUE}Step 3: Creating OAuth2 Credentials${NC}"
echo "═══════════════════════════════════════════════════════════"

# Note: gcloud doesn't support creating OAuth2 credentials directly via CLI
# We need to guide the user to do this manually or use the API

echo -e "${YELLOW}Unfortunately, gcloud CLI doesn't support creating OAuth2 credentials directly.${NC}"
echo ""
echo "Please follow these steps:"
echo "1. Go to: https://console.cloud.google.com/apis/credentials?project=${PROJECT_ID}"
echo "2. Click 'Configure Consent Screen'"
echo "   - User Type: External"
echo "   - App name: Secretario"
echo "   - User support email: ${ACCOUNT}"
echo "   - Developer email: ${ACCOUNT}"
echo "   - Add scope: https://www.googleapis.com/auth/gmail.readonly"
echo "   - Add test user: ${ACCOUNT}"
echo "3. Click 'Create Credentials' > 'OAuth client ID'"
echo "   - Application type: Desktop app"
echo "   - Name: Secretario Gmail Access"
echo "4. Download the JSON file"
echo ""
read -p "Press Enter once you've downloaded the credentials JSON file..."

# Ask for the JSON file path
echo ""
read -p "Enter the path to the downloaded JSON file: " JSON_PATH

if [ ! -f "$JSON_PATH" ]; then
    echo -e "${RED}✗ File not found: $JSON_PATH${NC}"
    exit 1
fi

# Extract client ID and secret from JSON
CLIENT_ID=$(grep -o '"client_id":"[^"]*' "$JSON_PATH" | cut -d'"' -f4)
CLIENT_SECRET=$(grep -o '"client_secret":"[^"]*' "$JSON_PATH" | cut -d'"' -f4)

if [ -z "$CLIENT_ID" ] || [ -z "$CLIENT_SECRET" ]; then
    echo -e "${RED}✗ Failed to extract credentials from JSON file${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Credentials extracted${NC}"
echo ""
echo "Client ID: ${CLIENT_ID}"
echo "Client Secret: ${CLIENT_SECRET}"

# Step 4: Get refresh token
echo ""
echo -e "${BLUE}Step 4: Obtaining Refresh Token${NC}"
echo "═══════════════════════════════════════════════════════════"

# Use the bun script to get the refresh token
cd "$(dirname "$0")/.."
echo "$CLIENT_ID" > /tmp/client_id.txt
echo "$CLIENT_SECRET" > /tmp/client_secret.txt

# Run the setup script non-interactively is complex, so we'll guide the user
echo ""
echo "Now run the OAuth flow script:"
echo ""
echo -e "${GREEN}~/.bun/bin/bun run scripts/setup-gmail-oauth.ts${NC}"
echo ""
echo "When prompted:"
echo "  Client ID: ${CLIENT_ID}"
echo "  Client Secret: ${CLIENT_SECRET}"
echo ""
echo "Then follow the browser authentication flow."
echo ""
echo -e "${YELLOW}After completing the script, your credentials will be ready to use!${NC}"
