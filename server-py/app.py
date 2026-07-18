import os, sys
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from database import (get_accounts, add_account, update_account, delete_account,
                      get_proxies, add_proxy, delete_proxy,
                      get_logs, get_account_logs, get_stats, update_stats)
from bot import start_bot, stop_bot, run_bot_cycle, get_bot_state

app = Flask(__name__, static_folder=None)
CORS(app)

@app.route('/api/bot/state')
def api_state():
    state = get_bot_state()
    state['totalAccounts'] = len(get_accounts())
    state['sessionStats'] = get_stats()
    return jsonify(state)

@app.route('/api/bot/start', methods=['POST'])
def api_start():
    interval = int(request.json.get('interval', 500)) if request.is_json else 500
    ok = start_bot(interval)
    return jsonify({'success': ok, 'message': f"Bot {'started' if ok else 'already running'} ({interval}s)"})

@app.route('/api/bot/stop', methods=['POST'])
def api_stop():
    ok = stop_bot()
    return jsonify({'success': ok, 'message': 'Bot stopped' if ok else 'Bot not running'})

@app.route('/api/bot/run-once', methods=['POST'])
def api_run_once():
    count = run_bot_cycle()
    return jsonify({'success': True, 'message': f'Processed {count} accounts', **get_bot_state()})

@app.route('/api/accounts')
def api_accounts():
    return jsonify(get_accounts())

@app.route('/api/accounts', methods=['POST'])
def api_add_account():
    d = request.json
    if not d.get('email') or not d.get('token'):
        return jsonify({'error': 'Email and token required'}), 400
    try:
        add_account(d['email'], d['token'], d.get('proxy', ''))
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/accounts/<email>', methods=['DELETE'])
def api_del_account(email):
    delete_account(email)
    return jsonify({'success': True})

@app.route('/api/accounts/<email>', methods=['PATCH'])
def api_patch_account(email):
    d = request.json
    update_account(email, {k: v for k, v in d.items() if k in ('status', 'proxy')})
    return jsonify({'success': True})

@app.route('/api/accounts/import', methods=['POST'])
def api_import_accounts():
    added, skipped = 0, 0
    for a in request.json.get('accounts', []):
        try: add_account(a['email'], a['token'], a.get('proxy', '')); added += 1
        except: skipped += 1
    return jsonify({'success': True, 'added': added, 'skipped': skipped})

@app.route('/api/proxies')
def api_proxies():
    return jsonify(get_proxies())

@app.route('/api/proxies', methods=['POST'])
def api_add_proxy():
    try: add_proxy(request.json['url']); return jsonify({'success': True})
    except Exception as e: return jsonify({'error': str(e)}), 400

@app.route('/api/proxies/import', methods=['POST'])
def api_import_proxies():
    added = 0
    for u in request.json.get('proxies', []):
        try: add_proxy(u); added += 1
        except: pass
    return jsonify({'success': True, 'added': added})

@app.route('/api/proxies/<int:pid>', methods=['DELETE'])
def api_del_proxy(pid):
    delete_proxy(pid)
    return jsonify({'success': True})

@app.route('/api/logs')
def api_logs():
    return jsonify(get_logs(request.args.get('limit', 100, type=int)))

@app.route('/api/logs/<email>')
def api_account_logs(email):
    return jsonify(get_account_logs(email, request.args.get('limit', 50, type=int)))

@app.route('/api/stats')
def api_stats():
    stats = get_stats()
    accs = get_accounts()
    return jsonify({**stats, 'totalAccounts': len(accs),
                    'activeAccounts': sum(1 for a in accs if a['status'] == 'active'),
                    'totalPoints': sum(a.get('points', 0) for a in accs)})

FRONTEND = os.path.join(os.path.dirname(__file__), '..', 'client', 'dist')
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    if os.path.exists(os.path.join(FRONTEND, path)):
        return send_from_directory(FRONTEND, path)
    return send_from_directory(FRONTEND, 'index.html') if os.path.exists(FRONTEND) else jsonify({'message': 'DAWN Bot API (Python)', 'docs': '/api/bot/state'})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3178))
    print(f"\n🌅 DAWN Bot (Python) — http://0.0.0.0:{port}\n")
    app.run(host='0.0.0.0', port=port, debug=False)
