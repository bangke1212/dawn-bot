# 🌅 DAWN Full-Stack Bot

> Full-stack automation bot for **DAWN Validator Extension** — auto keep-alive + points farming with React dashboard.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-blue)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5-purple)](https://vitejs.dev)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🖥 **React Dashboard** | Modern dark UI — manage accounts, proxies, logs & stats |
| 🔄 **Auto Keep-Alive** | Periodic keep-alive to DAWN API |
| 👥 **Multi-Account** | Unlimited accounts + proxy per account |
| 🌐 **Proxy Support** | HTTP / SOCKS5 with rotation |
| 📊 **Real-time Stats** | Points, success rate, live logs |
| 📦 **Batch Import** | Import accounts & proxies in bulk |
| ☁️ **Vercel** | Frontend deployable to Vercel (free) |
| 🔒 **SSL Ready** | Nginx + Let's Encrypt auto-setup |
| 🐳 **Docker** | Optional Docker deploy |
| ⚡ **PM2** | Auto-restart, log rotation |

---

## 🏗 Architecture

```
┌──────────────────────────┐         ┌──────────────────────────┐
│     VERCEL (free)        │  HTTPS  │      VPS ($3-5/mo)       │
│                          │◄───────▶│                          │
│  React Dashboard (SPA)   │         │  Nginx (SSL reverse)     │
│  your-app.vercel.app     │         │  → Express API :3178     │
│                          │         │  → Bot Engine 24/7       │
│                          │         │  → SQLite Database       │
└──────────────────────────┘         └──────────────────────────┘
```

---

## 🚀 Quick Start (Local Dev)

```bash
git clone https://github.com/bangke1212/dawn-bot.git
cd dawn-bot
npm run install:all
npm run dev
# Open http://localhost:3178
```

---

## ☁️ Production Deployment

### Step 1: Buy Domain & VPS

- **Domain**: Namecheap / Cloudflare (~$10/year)
- **VPS**: DigitalOcean / Hetzner / Vultr (~$4-6/mo, Ubuntu 22.04)

### Step 2: Point Domain to VPS

Add DNS **A record**:
```
Type: A
Name: @  (or api)
Value: YOUR_VPS_IP
TTL: Auto
```

### Step 3: Deploy (1 Command!)

```bash
# SSH ke VPS
ssh root@YOUR_VPS_IP

# Clone & deploy WITH SSL:
git clone https://github.com/bangke1212/dawn-bot.git
cd dawn-bot
bash deploy-vps.sh your-domain.com
#                      ^^^^^^^^^^^^^^^^
#   Ini auto: install Node + PM2 + Nginx + Let's Encrypt SSL
```

### Step 4: Deploy Frontend to Vercel

1. Push repo ke GitHub (atau fork `bangke1212/dawn-bot`)
2. Buka [vercel.com](https://vercel.com) → **Import Git Repository**
3. Konfigurasi:
   ```
   Root Directory:  client
   Build Command:   npm run build
   Output Dir:      dist
   ```
4. **Environment Variables**:
   ```
   VITE_API_URL = https://your-domain.com
   ```
5. Deploy! 🎉

---

## 🔒 SSL Setup (Manual / If Needed)

Kalau `deploy-vps.sh` sudah include domain, SSL auto-setup. Kalau manual:

```bash
# 1. Pastikan domain sudah pointing ke VPS
ping your-domain.com

# 2. Jalankan script SSL
bash setup-ssl.sh your-domain.com

# 3. Test
curl https://your-domain.com/api/bot/state
```

**Apa yang dilakukan script:**
- Install Nginx + Certbot
- Konfigurasi reverse proxy (HTTPS → localhost:3178)
- Generate Let's Encrypt SSL (auto-renew tiap 90 hari)
- Buka port 80, 443, 3178 di firewall

---

## 🔑 Getting DAWN Token

1. Install [DAWN Validator Chrome Extension](https://chromewebstore.google.com/detail/dawn-validator-chrome-ext/fpdkjdnhkakefebpekbdhillbhonfjjp)
2. Register & login
3. F12 → **Network** → cari `getpoint?appid=`
4. Copy: `Authorization: Bearer <TOKEN>`
5. Paste ke dashboard

---

## 📖 Usage

1. Add account (email + token) di tab **Accounts**
2. Tambah proxy di tab **Proxies** (optional)
3. Set interval (default 500 detik)
4. Klik **▶ Start**
5. Monitor di Dashboard

---

## 🛠 VPS Management

```bash
pm2 status              # Cek status
pm2 logs dawn-bot       # Live logs
pm2 restart dawn-bot    # Restart
pm2 stop dawn-bot       # Stop

# Nginx
sudo systemctl restart nginx
sudo certbot renew --dry-run   # Cek SSL renewal
```

---

## 📁 Project Structure

```
dawn-bot/
├── server/
│   ├── index.js           # Express API
│   ├── bot.js             # Bot engine
│   └── database.js        # SQLite
├── client/
│   ├── src/App.jsx        # React dashboard
│   ├── vercel.json        # Vercel SPA config
│   └── .env.example       # VITE_API_URL template
├── nginx/
│   └── dawn-bot.conf      # Nginx + SSL config
├── deploy-vps.sh          # VPS deploy (1 cmd)
├── setup-ssl.sh           # Nginx + Let's Encrypt
├── ecosystem.config.js    # PM2 config
├── Dockerfile
└── README.md
```

---

## ⚠️ Disclaimer

This project is for **educational purposes only**. Use at your own risk.

---

## 📝 License

MIT © bangke1212
