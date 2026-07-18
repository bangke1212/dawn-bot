#!/usr/bin/env python3
"""DAWN Bot — Python Backend Entry"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'server-py'))
from app import app
port = int(os.environ.get('PORT', 3178))
print(f"\n🌅 DAWN Bot (Flask) — http://0.0.0.0:{port}\n")
app.run(host='0.0.0.0', port=port, debug=False)
