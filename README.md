# 🌅 DAWN Bot — Full-Stack (Python + React)

> DAWN Validator Extension automation — **Python backend** (`python run.py`) + React dashboard.

[![Python](https://img.shields.io/badge/Python-3.10+-blue)](https://python.org)
[![React](https://img.shields.io/badge/React-18-blue)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-5-purple)](https://vitejs.dev)

---

## ✨ Features

| Feature | Description |
|---|---|
| 🐍 **Python Backend** | `python run.py` — Flask, threading, SQLite |
| 🖥 **React Dashboard** | Dark UI — accounts, proxies, logs, live stats |
| 🔄 **Auto Keep-Alive** | Periodic ping ke DAWN API |
| 👥 **Multi-Account** | Unlimited + proxy per akun |
| 🌐 **Proxy** | HTTP / SOCKS5 |
| ☁️ **Vercel Ready** | Frontend deploy ke Vercel (free) |
| 🔒 **SSL Ready** | Nginx + Let's Encrypt |
| ⚡ **PM2** | Production process manager |

---

## 🚀 Quick Start

```bash
git clone https://github.com/bangke1212/dawn-bot.git
cd dawn-bot
npm run install:all   # pip + npm
npm run dev           # Python backend + React frontend
# → http://localhost:3178
```

**Atau backend-only:**
```bash
cd server-py
pip install -r requirements.txt
python run.py
```

---

## ☁️ Production Deploy

### VPS (1 command):
```bash
git clone https://github.com/bangke1212/dawn-bot.git
cd dawn-bot
bash deploy-vps.sh                  # basic
bash deploy-vps.sh domain-kamu.com  # + SSL
```

### Vercel Frontend:
1. Import repo → [vercel.com](https://vercel.com)
2. Root Dir: `client` | Build: `npm run build` | Output: `dist`
3. Env: `VITE_API_URL = https://domain-kamu.com`
4. Deploy!

---

## 📁 Structure

```
dawn-bot/
├── server-py/          🐍 Python backend
│   ├── run.py          Main (Flask API)
│   ├── bot.py          Bot engine
│   ├── database.py     SQLite
│   └── requirements.txt
├── client/             ⚛️ React frontend
│   └── src/App.jsx
├── nginx/              🔒 SSL config
├── deploy-vps.sh       VPS deploy
└── ecosystem.config.js PM2
```

## ⚠️ Disclaimer
Educational purposes only. Use at your own risk.

MIT © bangke1212
