#!/usr/bin/env python3
"""
DAWN Bot - Python Backend (Flask)
Usage: python run.py [--port PORT]
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from database import *
from bot import bot

PORT = int(sys.argv[2]) if len(sys.argv) >= 3 and sys.argv[1] == '--port' else 3178

app = Flask(__name__, static_folder='../client/dist', static_url_path='')
CORS(app)
init_db(); set_bot_state('running','0')

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/assets/<path:f>')
def assets(f):
    return send_from_directory(os.path.join(app.static_folder, 'assets'), f)

# ---- BOT ----
@app.get('/api/bot/state')
def bot_state():
    s = get_bot_state(); accs = get_accounts()
    return jsonify(running=s.get('running')=='1', totalAccounts=len(accs),
        activeAccounts=len([a for a in accs if a['status']=='active']),
        totalPoints=sum(a['points'] or 0 for a in accs),
        totalKeepalives=int(s.get('total_keepalives','0')))

@app.post('/api/bot/start')
def bot_start():
    d = request.get_json() or {}; bot.start(d.get('interval',500))
    return jsonify(status='ok',running=True)

@app.post('/api/bot/stop')
def bot_stop():
    bot.stop(); return jsonify(status='ok',running=False)

@app.post('/api/bot/run-once')
def bot_run_once():
    r = bot.run_once(); return jsonify(status='ok',**r)

# ---- ACCOUNTS ----
@app.get('/api/accounts')
def list_accounts(): return jsonify(get_accounts())

@app.post('/api/accounts')
def add_acc():
    d = request.get_json(); acc = add_account(d['email'],d['token'],d.get('proxy',''))
    add_log(d['email'],'info','Account added'); return jsonify(acc)

@app.post('/api/accounts/import')
def import_accs():
    d = request.get_json(); cnt = 0
    for a in d.get('accounts',[]):
        add_account(a['email'],a['token'],a.get('proxy','')); cnt+=1
    add_log(None,'info',f'Imported {cnt} accounts'); return jsonify(imported=cnt)

@app.patch('/api/accounts/<path:email>')
def patch_acc(email):
    update_account(email, **request.get_json()); return jsonify(get_account(email))

@app.delete('/api/accounts/<path:email>')
def del_acc(email):
    delete_account(email); add_log(email,'info','Deleted'); return jsonify(status='ok')

# ---- PROXIES ----
@app.get('/api/proxies')
def list_proxies(): return jsonify(get_proxies())

@app.post('/api/proxies')
def add_p():
    add_proxy(request.get_json()['url']); return jsonify(status='ok')

@app.post('/api/proxies/import')
def import_p():
    for p in request.get_json().get('proxies',[]): add_proxy(p)
    return jsonify(imported=len(request.get_json().get('proxies',[])))

@app.delete('/api/proxies/<int:pid>')
def del_p(pid):
    delete_proxy(pid); return jsonify(status='ok')

# ---- LOGS ----
@app.get('/api/logs')
def get_logs_api():
    return jsonify(get_logs(request.args.get('limit',30,type=int)))

if __name__ == '__main__':
    print(f"\n{'='*50}\n  🌅 DAWN Bot (Python)\n  http://0.0.0.0:{PORT}\n{'='*50}\n")
    app.run(host='0.0.0.0', port=PORT, debug=False)
