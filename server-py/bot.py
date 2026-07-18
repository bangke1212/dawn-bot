import hashlib
import time
import requests
import urllib3
urllib3.disable_warnings()

from datetime import datetime
from database import get_accounts, update_account, add_log, get_stats, update_stats

API = {
    'keepalive': 'https://www.aeropres.in/chromeapi/dawn/v1/userreward/keepalive',
    'getPoints': 'https://www.aeropres.in/api/atom/v1/userreferral/getpoint',
    'socialmedia': 'https://www.aeropres.in/chromeapi/dawn/v1/profile/update',
}

EXTENSION_ID = 'fpdkjdnhkakefebpekbdhillbhonfjjp'
APP_ID_PREFIX = '6752b'
VERSION = '1.1.2'

HEADERS = {
    'Accept': '*/*',
    'Accept-Encoding': 'gzip, deflate, br, zstd',
    'Accept-Language': 'en-US,en;q=0.9',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/129.0.0.0 Safari/537.36',
    'Sec-Fetch-Dest': 'empty', 'Sec-Fetch-Mode': 'cors', 'Sec-Fetch-Site': 'cross-site',
}

_running = False
_current_stats = {'totalAccounts': 0, 'activeAccounts': 0, 'totalPoints': 0, 'totalKeepalives': 0}

def auth_headers(token):
    return {**HEADERS, 'Authorization': f'Bearer {token}', 'Content-Type': 'application/json',
            'Origin': f'chrome-extension://{EXTENSION_ID}'}

def generate_app_id(token):
    return APP_ID_PREFIX + hashlib.md5(token.encode()).hexdigest()[:19]

def fetch_points(email, token, app_id):
    try:
        r = requests.get(f"{API['getPoints']}?appid={app_id}",
                         headers=auth_headers(token), timeout=15, verify=False)
        if r.status_code == 200 and r.json().get('status'):
            data = r.json()['data']
            rp = data.get('rewardPoint', {})
            ref = data.get('referralPoint', {})
            return sum([rp.get('points', 0), rp.get('registerpoints', 0), rp.get('signinpoints', 0),
                        rp.get('twitter_x_id_points', 0), rp.get('discordid_points', 0),
                        rp.get('telegramid_points', 0), rp.get('bonus_points', 0), ref.get('commission', 0)])
    except Exception as e:
        print(f"[fetchPoints] {email}: {e}")
    return 0

def keep_alive(email, token, app_id):
    try:
        r = requests.post(f"{API['keepalive']}?appid={app_id}",
                          json={'username': email, 'extensionid': EXTENSION_ID, 'numberoftabs': 0, '_v': VERSION},
                          headers=auth_headers(token), timeout=15, verify=False)
        return r.status_code == 200
    except Exception as e:
        print(f"[keepAlive] {email}: {e}")
    return False

def verify_social(email, token, app_id):
    socials = ['twitter_x_id', 'discordid', 'telegramid']
    verified = 0
    for social in socials:
        try:
            r = requests.post(f"{API['socialmedia']}?appid={app_id}", json={social: social},
                              headers=auth_headers(token), timeout=10, verify=False)
            if r.json().get('success'): verified += 1
        except: pass
        time.sleep(1.5)
    return verified

def process_account(account):
    email, token = account['email'], account['token']
    app_id = account.get('app_id') or generate_app_id(token)
    if not account.get('app_id'):
        update_account(email, {'app_id': app_id})
    try:
        points = fetch_points(email, token, app_id)
        social = verify_social(email, token, app_id)
        ka_ok = keep_alive(email, token, app_id)
        update_account(email, {
            'points': points, 'social_verified': social,
            'last_keepalive': datetime.utcnow().isoformat(),
            'keepalive_success': account.get('keepalive_success', 0) + (1 if ka_ok else 0),
            'keepalive_fail': account.get('keepalive_fail', 0) + (0 if ka_ok else 1),
        })
        add_log(email, 'success' if ka_ok else 'fail',
                'Keep-alive berhasil' if ka_ok else 'Keep-alive gagal', points)
        return {'email': email, 'points': points, 'socialVerified': social, 'keepalive': ka_ok}
    except Exception as e:
        add_log(email, 'error', f'Error: {e}', 0)
        return {'email': email, 'points': 0, 'socialVerified': 0, 'keepalive': False, 'error': str(e)}

def run_bot_cycle():
    global _current_stats
    accounts = [a for a in get_accounts() if a['status'] == 'active']
    if not accounts: return 0
    import concurrent.futures
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(process_account, a) for a in accounts]
        for f in futures:
            try: results.append(f.result())
            except: pass
    _current_stats = {
        'totalAccounts': len(accounts),
        'activeAccounts': sum(1 for r in results if r.get('keepalive')),
        'totalPoints': sum(r.get('points', 0) for r in results),
        'totalKeepalives': _current_stats.get('totalKeepalives', 0) + len(results),
    }
    st = get_stats()
    update_stats({'total_keepalives': st.get('total_keepalives', 0) + len(results),
                  'total_points': st.get('total_points', 0) + _current_stats['totalPoints']})
    print(f"[Bot] {sum(1 for r in results if r.get('keepalive'))}/{len(results)} OK | {_current_stats['totalPoints']} pts")
    return len(results)

def _run_loop(interval):
    global _running
    run_bot_cycle()
    while _running:
        time.sleep(interval)
        if _running: run_bot_cycle()

def start_bot(interval_sec=500):
    global _running
    import threading
    if _running: return False
    _running = True
    print(f"[Bot] Started ({interval_sec}s) — Python")
    threading.Thread(target=_run_loop, args=(interval_sec,), daemon=True).start()
    return True

def stop_bot():
    global _running
    if not _running: return False
    _running = False
    print('[Bot] Stopped')
    return True

def get_bot_state():
    return {'running': _running, **_current_stats, 'nextCycle': 'active' if _running else 'idle'}
