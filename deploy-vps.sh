#!/bin/bash
# ============================================
#  DAWN Bot — Full VPS Deployment
#  Usage:
#    bash deploy-vps.sh                     # basic deploy
#    bash deploy-vps.sh your-domain.com     # deploy + Nginx + SSL
# ============================================
set -e

DOMAIN=$1

echo "🌅 DAWN Bot VPS Deployment"
echo "=========================="

# Install Node.js 18+ if missing
if ! command -v node &>/dev/null; then
  echo "📦 Installing Node.js 18..."
  curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
  sudo apt install -y nodejs
fi

# Install PM2
if ! command -v pm2 &>/dev/null; then
  echo "📦 Installing PM2..."
  sudo npm install -g pm2
fi

# Install deps & build frontend
echo "📦 Installing dependencies..."
npm install
cd client && npm install && npm run build && cd ..

# Start with PM2
echo "🚀 Starting bot with PM2..."
pm2 delete dawn-bot 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u $USER --hp $HOME 2>/dev/null || true

# ---- Optional: Nginx + SSL ----
if [ -n "$DOMAIN" ]; then
  echo ""
  echo "🔒 Setting up Nginx + SSL for $DOMAIN..."
  bash setup-ssl.sh "$DOMAIN"
fi

echo ""
echo "========================================"
echo "✅ DEPLOY COMPLETE!"
echo ""
if [ -n "$DOMAIN" ]; then
  echo "   Backend:  https://$DOMAIN/api"
  echo ""
  echo "   → Vercel env: VITE_API_URL = https://$DOMAIN"
else
  IP=$(curl -s ifconfig.me 2>/dev/null || echo "YOUR_IP")
  echo "   Backend:  http://$IP:3178"
  echo ""
  echo "   ⚠️  For Vercel, run: bash setup-ssl.sh your-domain.com"
  echo "   Then set: VITE_API_URL = https://your-domain.com"
fi
echo ""
echo "   PM2 status: pm2 status"
echo "   PM2 logs:   pm2 logs dawn-bot"
echo "========================================"
