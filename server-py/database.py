import sqlite3, os, threading
from datetime import datetime, timezone

DB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
DB_PATH = os.path.join(DB_DIR, 'dawnbot.db')
_local = threading.local()

def _conn():
    if not hasattr(_local, 'c') or _local.c is None:
        os.makedirs(DB_DIR, exist_ok=True)
        _local.c = sqlite3.connect(DB_PATH, check_same_thread=False)
        _local.c.row_factory = sqlite3.Row
        _local.c.execute("PRAGMA journal_mode=WAL")
    return _local.c

def init_db():
    c = _conn()
    c.executescript("""
        CREATE TABLE IF NOT EXISTS accounts (
            email TEXT PRIMARY KEY, token TEXT NOT NULL, proxy TEXT DEFAULT '',
            status TEXT DEFAULT 'active', points INTEGER DEFAULT 0,
            social_verified INTEGER DEFAULT 0, keepalive_success INTEGER DEFAULT 0,
            keepalive_fail INTEGER DEFAULT 0, last_keepalive TEXT,
            created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')));
        CREATE TABLE IF NOT EXISTS proxies (
            id INTEGER PRIMARY KEY AUTOINCREMENT, url TEXT UNIQUE,
            protocol TEXT DEFAULT 'http', success_count INTEGER DEFAULT 0,
            fail_count INTEGER DEFAULT 0, last_used TEXT,
            created_at TEXT DEFAULT (datetime('now')));
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT, account_email TEXT,
            type TEXT DEFAULT 'info', message TEXT, points INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')));
        CREATE TABLE IF NOT EXISTS bot_state (key TEXT PRIMARY KEY, value TEXT);
    """)
    c.commit()
    print(f"[DB] OK: {DB_PATH}")

def get_accounts():
    return [dict(r) for r in _conn().execute("SELECT * FROM accounts ORDER BY created_at DESC").fetchall()]

def get_account(email):
    r = _conn().execute("SELECT * FROM accounts WHERE email=?", (email,)).fetchone()
    return dict(r) if r else None

def add_account(email, token, proxy='', status='active'):
    c = _conn()
    c.execute("INSERT OR REPLACE INTO accounts (email,token,proxy,status) VALUES (?,?,?,?)", (email,token,proxy,status))
    c.commit()
    return get_account(email)

def update_account(email, **kw):
    if not kw: return
    c = _conn()
    sets = ', '.join(f"{k}=?" for k in kw)
    c.execute(f"UPDATE accounts SET {sets}, updated_at=datetime('now') WHERE email=?", list(kw.values())+[email])
    c.commit()

def delete_account(email):
    c = _conn(); c.execute("DELETE FROM accounts WHERE email=?",(email,)); c.commit()

def get_proxies():
    return [dict(r) for r in _conn().execute("SELECT * FROM proxies ORDER BY created_at DESC").fetchall()]

def add_proxy(url):
    p = 'socks5' if url.startswith('socks') else 'http'
    _conn().execute("INSERT OR IGNORE INTO proxies (url,protocol) VALUES (?,?)",(url,p)); _conn().commit()

def delete_proxy(pid):
    _conn().execute("DELETE FROM proxies WHERE id=?",(pid,)); _conn().commit()

def get_random_proxy():
    r = _conn().execute("SELECT * FROM proxies ORDER BY RANDOM() LIMIT 1").fetchone()
    return dict(r) if r else None

def add_log(email, type_, msg, pts=0):
    c = _conn()
    c.execute("INSERT INTO logs (account_email,type,message,points) VALUES (?,?,?,?)",(email,type_,msg,pts))
    c.commit()
    c.execute("DELETE FROM logs WHERE id NOT IN (SELECT id FROM logs ORDER BY id DESC LIMIT 2000)"); c.commit()

def get_logs(limit=30):
    return [dict(r) for r in _conn().execute("SELECT * FROM logs ORDER BY id DESC LIMIT ?",(limit,)).fetchall()]

def get_bot_state():
    s = {}
    for k in ['running','total_keepalives','interval']:
        r = _conn().execute("SELECT value FROM bot_state WHERE key=?",(k,)).fetchone()
        s[k] = r['value'] if r else '0'
    return s

def set_bot_state(k, v):
    _conn().execute("INSERT OR REPLACE INTO bot_state VALUES (?,?)",(k,str(v))); _conn().commit()
