const axios = require('axios');
const crypto = require('crypto');
const https = require('https');
const db = require('./database');

const API = {
  keepalive: 'https://www.aeropres.in/chromeapi/dawn/v1/userreward/keepalive',
  getPoints: 'https://www.aeropres.in/api/atom/v1/userreferral/getpoint',
  socialmedia: 'https://www.aeropres.in/chromeapi/dawn/v1/profile/update',
};

const EXTENSION_ID = 'fpdkjdnhkakefebpekbdhillbhonfjjp';
const APP_ID_PREFIX = '6752b';
const VERSION = '1.1.2';

const sslAgent = new https.Agent({ rejectUnauthorized: false });

const HEADERS = {
  'Accept': '*/*',
  'Accept-Encoding': 'gzip, deflate, br, zstd',
  'Accept-Language': 'en-US,en;q=0.9',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/129.0.0.0 Safari/537.36',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'cross-site',
};

// Bot state
let running = false;
let intervalId = null;
let currentStats = { totalAccounts: 0, activeAccounts: 0, totalPoints: 0, totalKeepalives: 0 };

function generateAppId(token) {
  return APP_ID_PREFIX + crypto.createHash('md5').update(token).digest('hex').slice(0, 19);
}

function getAuthHeaders(token) {
  return {
    ...HEADERS,
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Origin': `chrome-extension://${EXTENSION_ID}`,
  };
}

async function fetchPoints(email, token, appId) {
  try {
    const res = await axios.get(`${API.getPoints}?appid=${appId}`, {
      headers: getAuthHeaders(token),
      httpsAgent: sslAgent,
      timeout: 15000,
    });
    if (res.status === 200 && res.data.status) {
      const rp = res.data.data.rewardPoint || {};
      const ref = res.data.data.referralPoint || {};
      const points =
        (rp.points || 0) + (rp.registerpoints || 0) + (rp.signinpoints || 0) +
        (rp.twitter_x_id_points || 0) + (rp.discordid_points || 0) +
        (rp.telegramid_points || 0) + (rp.bonus_points || 0) +
        (ref.commission || 0);
      return points;
    }
    return 0;
  } catch (e) {
    console.error(`[fetchPoints] ${email}: ${e.message}`);
    return 0;
  }
}

async function keepAlive(email, token, appId) {
  try {
    const res = await axios.post(`${API.keepalive}?appid=${appId}`, {
      username: email,
      extensionid: EXTENSION_ID,
      numberoftabs: 0,
      _v: VERSION,
    }, {
      headers: getAuthHeaders(token),
      httpsAgent: sslAgent,
      timeout: 15000,
    });
    return res.status === 200;
  } catch (e) {
    console.error(`[keepAlive] ${email}: ${e.message}`);
    return false;
  }
}

async function verifySocial(email, token, appId) {
  const socials = ['twitter_x_id', 'discordid', 'telegramid'];
  let verified = 0;
  for (const social of socials) {
    try {
      const res = await axios.post(`${API.socialmedia}?appid=${appId}`,
        { [social]: social },
        { headers: getAuthHeaders(token), httpsAgent: sslAgent, timeout: 10000 }
      );
      if (res.data?.success) verified++;
    } catch (e) {}
    await new Promise(r => setTimeout(r, 1500));
  }
  return verified;
}

async function processAccount(account) {
  const { email, token } = account;
  let appId = account.app_id || generateAppId(token);

  if (!account.app_id) {
    db.updateAccount(email, { app_id: appId });
  }

  try {
    const points = await fetchPoints(email, token, appId);
    const socialCount = await verifySocial(email, token, appId);
    const keepaliveOk = await keepAlive(email, token, appId);

    db.updateAccount(email, {
      points,
      social_verified: socialCount,
      last_keepalive: new Date().toISOString(),
      keepalive_success: account.keepalive_success + (keepaliveOk ? 1 : 0),
      keepalive_fail: account.keepalive_fail + (keepaliveOk ? 0 : 1),
    });

    db.addLog(email, keepaliveOk ? 'success' : 'fail',
      keepaliveOk ? 'Keep-alive berhasil' : 'Keep-alive gagal', points);

    return { email, points, socialVerified: socialCount, keepalive: keepaliveOk };
  } catch (e) {
    db.addLog(email, 'error', `Error: ${e.message}`, 0);
    return { email, points: 0, socialVerified: 0, keepalive: false, error: e.message };
  }
}

async function runBotCycle() {
  const accounts = db.getAccounts().filter(a => a.status === 'active');
  if (accounts.length === 0) return;

  const results = [];
  const chunkSize = 5;
  for (let i = 0; i < accounts.length; i += chunkSize) {
    const chunk = accounts.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(chunk.map(processAccount));
    results.push(...chunkResults);
    if (i + chunkSize < accounts.length) await new Promise(r => setTimeout(r, 3000));
  }

  currentStats.totalAccounts = accounts.length;
  currentStats.activeAccounts = results.filter(r => r.keepalive).length;
  currentStats.totalPoints = results.reduce((a, b) => a + b.points, 0);
  currentStats.totalKeepalives += results.length;

  const statRow = db.getStats();
  db.updateStats({
    total_keepalives: (statRow?.total_keepalives || 0) + results.length,
    total_points: (statRow?.total_points || 0) + currentStats.totalPoints,
  });

  console.log(`[BotCycle] ${results.filter(r => r.keepalive).length}/${results.length} success | ${currentStats.totalPoints} pts`);
}

function startBot(intervalSec = 500) {
  if (running) return false;
  running = true;
  console.log(`[Bot] Started with ${intervalSec}s interval`);
  runBotCycle();
  intervalId = setInterval(runBotCycle, intervalSec * 1000);
  return true;
}

function stopBot() {
  if (!running) return false;
  running = false;
  if (intervalId) { clearInterval(intervalId); intervalId = null; }
  console.log('[Bot] Stopped');
  return true;
}

function getBotState() {
  return { running, ...currentStats, nextCycle: intervalId ? 'active' : 'idle' };
}

module.exports = { startBot, stopBot, getBotState, processAccount, runBotCycle };
