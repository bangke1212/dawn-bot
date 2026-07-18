#!/bin/bash
# ======================================================
#  DAWN Bot — Nginx + SSL Setup (Let's Encrypt)
#  Usage: bash setup-ssl.sh your-domain.com
# ======================================================
set -e

if [ -z "$1" ]; then
  echo "❌ Usage: bash setup-ssl.sh your-domain.com"
  exit 1
fi

DOMAIN=$1
echo "🌅 DAWN Bot — SSL Setup for $DOMAIN"
echo "========================================"
echo ""
echo "⚠️  Prerequisites:"
echo "   1. Domain $DOMAIN must point to this VPS (A record)"
echo "   2. Ports 80 & 443 must be open (firewall)"
echo ""
read -p "Continue? (y/n): " CONFIRM
[ "$CONFIRM" != "y" ] && exit 0

# ---- Install Nginx ----
echo ""
echo "📦 Installing Nginx..."
sudo apt update -y
sudo apt install -y nginx

# ---- Configure Firewall ----
echo "🔓 Opening ports 80 & 443..."
sudo ufw allow 80/tcp 2>/dev/null || true
sudo ufw allow 443/tcp 2>/dev/null || true
sudo ufw allow 3178/tcp 2>/dev/null || true
sudo ufw allow OpenSSH 2>/dev/null || true

# ---- Install Certbot ----
echo "📦 Installing Certbot..."
sudo apt install -y certbot python3-certbot-nginx

# ---- Setup Nginx config ----
echo "⚙️  Setting up Nginx config..."
sudo cp nginx/dawn-bot.conf /etc/nginx/sites-available/dawn-bot
sudo sed -i "s/YOUR_DOMAIN/$DOMAIN/g" /etc/nginx/sites-available/dawn-bot

# Remove default site, enable ours
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/dawn-bot /etc/nginx/sites-enabled/dawn-bot

# Test config
sudo nginx -t

# Start Nginx (HTTP only first — needed for certbot)
sudo systemctl restart nginx

# ---- Get SSL Certificate ----
echo ""
echo "🔒 Obtaining SSL certificate for $DOMAIN..."
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect || {
  echo "⚠️  Auto-certbot failed. Try manual:"
  echo "   sudo certbot --nginx -d $DOMAIN"
}

# ---- Final restart ----
sudo systemctl restart nginx

echo ""
echo "========================================"
echo "✅ SSL SETUP COMPLETE!"
echo ""
echo "   Backend URL:  https://$DOMAIN/api"
echo "   Dashboard:    https://$DOMAIN"
echo ""
echo "   → Set this in Vercel:"
echo "     VITE_API_URL = https://$DOMAIN"
echo ""
echo "   To test:"
echo "     curl https://$DOMAIN/api/bot/state"
echo "========================================"
