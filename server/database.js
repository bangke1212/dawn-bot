const Database = require('better-sqlite3');
const path = require('path');

class DawnDB {
  constructor() {
    this.db = new Database(path.join(__dirname, '..', 'data', 'dawn.db'));
    this.db.pragma('journal_mode = WAL');
    this.init();
  }

  init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        token TEXT NOT NULL,
        app_id TEXT DEFAULT '',
        proxy TEXT DEFAULT '',
        status TEXT DEFAULT 'active',
        points INTEGER DEFAULT 0,
        social_verified INTEGER DEFAULT 0,
        last_keepalive TEXT,
        keepalive_success INTEGER DEFAULT 0,
        keepalive_fail INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS proxies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        url TEXT UNIQUE NOT NULL,
        protocol TEXT DEFAULT 'http',
        status TEXT DEFAULT 'untested',
        success_count INTEGER DEFAULT 0,
        fail_count INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_email TEXT,
        type TEXT NOT NULL,
        message TEXT,
        points INTEGER DEFAULT 0,
        created_at TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        total_keepalives INTEGER DEFAULT 0,
        total_points INTEGER DEFAULT 0,
        session_start TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      );
    `);

    const statRow = this.db.prepare('SELECT id FROM stats ORDER BY id DESC LIMIT 1').get();
    if (!statRow) {
      this.db.prepare('INSERT INTO stats DEFAULT VALUES').run();
    }
  }

  // Accounts
  getAccounts() {
    return this.db.prepare('SELECT * FROM accounts ORDER BY id DESC').all();
  }

  addAccount(email, token, proxy = '') {
    const crypto = require('crypto');
    const appId = '6752b' + crypto.createHash('md5').update(token).digest('hex').slice(0, 19);
    const stmt = this.db.prepare('INSERT OR REPLACE INTO accounts (email, token, app_id, proxy) VALUES (?, ?, ?, ?)');
    return stmt.run(email, token, appId, proxy);
  }

  updateAccount(email, data) {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const values = Object.values(data);
    const stmt = this.db.prepare(`UPDATE accounts SET ${fields}, updated_at = datetime('now') WHERE email = ?`);
    return stmt.run(...values, email);
  }

  deleteAccount(email) {
    return this.db.prepare('DELETE FROM accounts WHERE email = ?').run(email);
  }

  // Proxies
  getProxies() {
    return this.db.prepare('SELECT * FROM proxies ORDER BY id DESC').all();
  }

  addProxy(url) {
    const protocol = url.includes('://') ? url.split('://')[0] : 'http';
    const formattedUrl = url.includes('://') ? url : `http://${url}`;
    return this.db.prepare('INSERT OR IGNORE INTO proxies (url, protocol) VALUES (?, ?)').run(formattedUrl, protocol);
  }

  updateProxy(id, data) {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const values = Object.values(data);
    return this.db.prepare(`UPDATE proxies SET ${fields} WHERE id = ?`).run(...values, id);
  }

  deleteProxy(id) {
    return this.db.prepare('DELETE FROM proxies WHERE id = ?').run(id);
  }

  // Logs
  addLog(email, type, message, points = 0) {
    return this.db.prepare('INSERT INTO logs (account_email, type, message, points) VALUES (?, ?, ?, ?)').run(email, type, message, points);
  }

  getLogs(limit = 100) {
    return this.db.prepare('SELECT * FROM logs ORDER BY created_at DESC LIMIT ?').all(limit);
  }

  getAccountLogs(email, limit = 50) {
    return this.db.prepare('SELECT * FROM logs WHERE account_email = ? ORDER BY created_at DESC LIMIT ?').all(email, limit);
  }

  // Stats
  getStats() {
    return this.db.prepare('SELECT * FROM stats ORDER BY id DESC LIMIT 1').get();
  }

  updateStats(data) {
    const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const values = Object.values(data);
    return this.db.prepare(`UPDATE stats SET ${fields}, updated_at = datetime('now') WHERE id = (SELECT id FROM stats ORDER BY id DESC LIMIT 1)`).run(...values);
  }

  close() {
    this.db.close();
  }
}

module.exports = new DawnDB();
