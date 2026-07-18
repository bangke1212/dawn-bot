const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./database');
const bot = require('./bot');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const app = express();
const PORT = process.env.PORT || 3178;

app.use(cors());
app.use(express.json());

// Serve client build in production
const clientBuild = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientBuild)) {
  app.use(express.static(clientBuild));
}

// ==================== API ROUTES ====================

// --- Bot Control ---
app.get('/api/bot/state', (req, res) => {
  const state = bot.getBotState();
  const stats = db.getStats();
  const accountCount = db.getAccounts().length;
  res.json({ ...state, totalAccounts: accountCount, sessionStats: stats });
});

app.post('/api/bot/start', (req, res) => {
  const interval = req.body.interval || 500;
  const started = bot.startBot(interval);
  res.json({ success: started, message: started ? `Bot started (${interval}s interval)` : 'Bot already running' });
});

app.post('/api/bot/stop', (req, res) => {
  const stopped = bot.stopBot();
  res.json({ success: stopped, message: stopped ? 'Bot stopped' : 'Bot not running' });
});

app.post('/api/bot/run-once', async (req, res) => {
  await bot.runBotCycle();
  const state = bot.getBotState();
  res.json({ success: true, message: 'Manual cycle completed', ...state });
});

// --- Accounts ---
app.get('/api/accounts', (req, res) => {
  const accounts = db.getAccounts();
  res.json(accounts);
});

app.post('/api/accounts', (req, res) => {
  const { email, token, proxy } = req.body;
  if (!email || !token) return res.status(400).json({ error: 'Email and token required' });
  try {
    db.addAccount(email, token, proxy || '');
    res.json({ success: true, message: `Account ${email} added` });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/accounts/:email', (req, res) => {
  db.deleteAccount(req.params.email);
  res.json({ success: true });
});

app.patch('/api/accounts/:email', (req, res) => {
  const { status, proxy } = req.body;
  const data = {};
  if (status) data.status = status;
  if (proxy !== undefined) data.proxy = proxy;
  db.updateAccount(req.params.email, data);
  res.json({ success: true });
});

app.post('/api/accounts/import', (req, res) => {
  const { accounts } = req.body;
  if (!Array.isArray(accounts)) return res.status(400).json({ error: 'accounts array required' });
  let added = 0, skipped = 0;
  for (const acc of accounts) {
    try {
      db.addAccount(acc.email, acc.token, acc.proxy || '');
      added++;
    } catch { skipped++; }
  }
  res.json({ success: true, added, skipped });
});

// --- Proxies ---
app.get('/api/proxies', (req, res) => {
  res.json(db.getProxies());
});

app.post('/api/proxies', (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'Proxy URL required' });
  try {
    db.addProxy(url);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/api/proxies/import', (req, res) => {
  const { proxies } = req.body;
  if (!Array.isArray(proxies)) return res.status(400).json({ error: 'proxies array required' });
  let added = 0;
  for (const url of proxies) {
    try { db.addProxy(url); added++; } catch {}
  }
  res.json({ success: true, added });
});

app.delete('/api/proxies/:id', (req, res) => {
  db.deleteProxy(req.params.id);
  res.json({ success: true });
});

// --- Logs ---
app.get('/api/logs', (req, res) => {
  const logs = db.getLogs(req.query.limit || 100);
  res.json(logs);
});

app.get('/api/logs/:email', (req, res) => {
  const logs = db.getAccountLogs(req.params.email, req.query.limit || 50);
  res.json(logs);
});

// --- Stats ---
app.get('/api/stats', (req, res) => {
  const stats = db.getStats();
  const accounts = db.getAccounts();
  const activeAccounts = accounts.filter(a => a.status === 'active').length;
  const totalPoints = accounts.reduce((sum, a) => sum + (a.points || 0), 0);
  res.json({ ...stats, totalAccounts: accounts.length, activeAccounts, totalPoints });
});

// --- SPA fallback ---
app.get('*', (req, res) => {
  const indexPath = path.join(clientBuild, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({ message: 'DAWN Bot API is running', docs: '/api/bot/state' });
  }
});

app.listen(PORT, () => {
  console.log(`\n🌅 DAWN Bot Server running on http://localhost:${PORT}\n`);
});

module.exports = app;
