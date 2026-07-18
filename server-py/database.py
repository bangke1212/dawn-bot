import sqlite3, hashlib, os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'dawn.db')

def get_db():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS accounts (
            id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT UNIQUE NOT NULL,
            token TEXT NOT NULL, app_id TEXT DEFAULT '', proxy TEXT DEFAULT '',
            status TEXT DEFAULT 'active', points INTEGER DEFAULT 0,
            social_verified INTEGER DEFAULT 0, last_keepalive TEXT,
            keepalive_success INTEGER DEFAULT 0, keepalive_fail INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS proxies (
            id INTEGER PRIMARY KEY AUTOINCREMENT, url TEXT UNIQUE NOT NULL,
            protocol TEXT DEFAULT 'http', status TEXT DEFAULT 'untested',
            success_count INTEGER DEFAULT 0, fail_count INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT, account_email TEXT,
            type TEXT NOT NULL, message TEXT, points INTEGER DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now'))
        );
        CREATE TABLE IF NOT EXISTS stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT, total_keepalives INTEGER DEFAULT 0,
            total_points INTEGER DEFAULT 0, session_start TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );
    """)
    if not conn.execute("SELECT id FROM stats ORDER BY id DESC LIMIT 1").fetchone():
        conn.execute("INSERT INTO stats DEFAULT VALUES")
    conn.commit(); conn.close()

def get_accounts():
    c = get_db(); rows = c.execute("SELECT * FROM accounts ORDER BY id DESC").fetchall(); c.close()
    return [dict(r) for r in rows]

def add_account(email, token, proxy=''):
    app_id = '6752b' + hashlib.md5(token.encode()).hexdigest()[:19]
    c = get_db()
    c.execute("INSERT OR REPLACE INTO accounts (email, token, app_id, proxy) VALUES (?,?,?,?)",
              (email, token, app_id, proxy))
    c.commit(); c.close()

def update_account(email, data):
    if not data: return
    sets = ', '.join(f"{k}=?" for k in data)
    c = get_db()
    c.execute(f"UPDATE accounts SET {sets}, updated_at=datetime('now') WHERE email=?",
              list(data.values()) + [email])
    c.commit(); c.close()

def delete_account(email):
    c = get_db(); c.execute("DELETE FROM accounts WHERE email=?", (email,)); c.commit(); c.close()

def get_proxies():
    c = get_db(); rows = c.execute("SELECT * FROM proxies ORDER BY id DESC").fetchall(); c.close()
    return [dict(r) for r in rows]

def add_proxy(url):
    proto = url.split('://')[0] if '://' in url else 'http'
    full = url if '://' in url else f'http://{url}'
    c = get_db(); c.execute("INSERT OR IGNORE INTO proxies (url,protocol) VALUES (?,?)", (full, proto)); c.commit(); c.close()

def delete_proxy(pid):
    c = get_db(); c.execute("DELETE FROM proxies WHERE id=?", (pid,)); c.commit(); c.close()

def add_log(email, t, msg, pts=0):
    c = get_db(); c.execute("INSERT INTO logs (account_email,type,message,points) VALUES (?,?,?,?)",
                            (email, t, msg, pts)); c.commit(); c.close()

def get_logs(limit=100):
    c = get_db(); rows = c.execute("SELECT * FROM logs ORDER BY created_at DESC LIMIT ?", (limit,)).fetchall(); c.close()
    return [dict(r) for r in rows]

def get_account_logs(email, limit=50):
    c = get_db(); rows = c.execute("SELECT * FROM logs WHERE account_email=? ORDER BY created_at DESC LIMIT ?",
                                   (email, limit)).fetchall(); c.close()
    return [dict(r) for r in rows]

def get_stats():
    c = get_db(); row = c.execute("SELECT * FROM stats ORDER BY id DESC LIMIT 1").fetchone(); c.close()
    return dict(row) if row else {}

def update_stats(data):
    if not data: return
    sets = ', '.join(f"{k}=?" for k in data)
    c = get_db()
    c.execute(f"UPDATE stats SET {sets}, updated_at=datetime('now') WHERE id=(SELECT id FROM stats ORDER BY id DESC LIMIT 1)",
              list(data.values()))
    c.commit(); c.close()

init()
