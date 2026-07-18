#!/bin/bash
# ============================================
#  DAWN Bot — Vercel Frontend Deployment
#  Usage: bash deploy-vercel.sh
# ============================================
set -e

echo "🌅 DAWN Bot — Deploy Frontend to Vercel"
echo "========================================"

# Check Vercel CLI
if ! command -v vercel &>/dev/null; then
  echo "📦 Installing Vercel CLI..."
  npm install -g vercel
fi

# Ask for VPS backend URL
read -p "VPS Backend URL (e.g. https://123.45.67.89:3178): " VPS_URL
if [ -z "$VPS_URL" ]; then
  echo "❌ Backend URL required!"
  exit 1
fi

# Create .env for build
echo "VITE_API_URL=$VPS_URL" > client/.env.production

# Build & deploy
cd client
echo "📦 Building frontend..."
npm install
npm run build

echo "🚀 Deploying to Vercel..."
vercel --prod

cd ..
echo ""
echo "✅ Frontend deployed to Vercel!"
echo "   Set this env in Vercel Dashboard → Settings → Environment Variables:"
echo "   VITE_API_URL = $VPS_URL"
