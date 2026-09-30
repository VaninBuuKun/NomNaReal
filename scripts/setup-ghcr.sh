#!/bin/bash
# ============================================
# Setup GitHub Container Registry (GHCR) login on VPS
# Run this ONCE on your VPS to allow pulling private images
# ============================================
set -euo pipefail

echo "🔐 Setup GHCR Authentication"
echo "================================"
echo ""
echo "You need a GitHub Personal Access Token (PAT) with 'read:packages' scope."
echo "Create one at: https://github.com/settings/tokens/new"
echo "  - Select scope: read:packages"
echo "  - Set expiration: 90 days (or no expiration)"
echo ""

read -rp "Enter your GitHub username: " GH_USERNAME
read -rsp "Enter your GitHub PAT (read:packages): " GH_TOKEN
echo ""

echo "🔑 Logging in to ghcr.io..."
echo "$GH_TOKEN" | docker login ghcr.io -u "$GH_USERNAME" --password-stdin

echo ""
echo "✅ GHCR login successful!"
echo ""
echo "Your VPS can now pull images from ghcr.io"
echo "Next: set APP_IMAGE in your .env file:"
echo ""
echo "  echo 'APP_IMAGE=ghcr.io/${GH_USERNAME}/nomnareal:latest' >> .env"
echo ""
