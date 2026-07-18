#!/bin/bash
set -e; DOMAIN=$1
echo "🌅 DAWN Bot VPS Deploy (Python)"
command -v python3 &>/dev/null || { sudo apt update -y; sudo apt install -y python3 python3-pip; }
command -v node &>/dev/null || { curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -; sudo apt install -y nodejs; }
command -v pm2 &>/dev/null || sudo npm install -g pm2
cd server-py && pip3 install -r requirements.txt && cd ..
cd client && npm install && npm run build && cd ..
pm2 delete dawn-bot 2>/dev/null || true
pm2 start ecosystem.config.js; pm2 save
pm2 startup systemd -u $USER --hp $HOME 2>/dev/null || true
[ -n "$DOMAIN" ] && bash setup-ssl.sh "$DOMAIN"
echo "✅ Done!"; [ -n "$DOMAIN" ] && echo "→ VITE_API_URL=https://$DOMAIN" || echo "→ http://$(curl -s ifconfig.me):3178"
