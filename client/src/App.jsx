import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// API — auto-detect: Vercel uses VITE_API_URL, local dev uses proxy
const API_BASE = import.meta.env.VITE_API_URL || '';
const API = axios.create({ baseURL: API_BASE + '/api' });

// ==================== STYLES ====================
const css = {
  body: { fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", background: '#0a0a0f', color: '#e0e0e0', minHeight: '100vh' },
  header: { background: 'linear-gradient(135deg, #1a1040, #0d1b2a)', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap', gap: '10px' },
  title: { fontSize: '20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', color: '#f0e6ff' },
  badge: (running) => ({ fontSize: '11px', padding: '3px 10px', borderRadius: '20px', fontWeight: 600, background: running ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: running ? '#10b981' : '#ef4444' }),
  container: { maxWidth: '1200px', margin: '0 auto', padding: '20px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' },
  card: { background: '#12121a', borderRadius: '10px', padding: '18px', border: '1px solid rgba(255,255,255,0.06)' },
  statVal: (c) => ({ fontSize: '28px', fontWeight: 700, color: c }),
  statLbl: { fontSize: '12px', color: '#666', marginTop: '2px' },
  btn: (bg) => ({ padding: '8px 18px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '13px', background: bg, color: '#fff', transition: 'all 0.15s' }),
  btnGhost: { background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: '#aaa', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 500 },
  input: { width: '100%', padding: '9px 12px', borderRadius: '7px', border: '1px solid rgba(255,255,255,0.08)', background: '#0a0a0f', color: '#e0e0e0', fontSize: '13px', outline: 'none' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '9px 10px', borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#777', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase' },
  td: { padding: '9px 10px', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: '13px' },
  tab: (active) => ({ padding: '7px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 500, fontSize: '12px', background: active ? '#6366f1' : 'transparent', color: active ? '#fff' : '#777' }),
  statusDot: (ok) => ({ display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%', background: ok ? '#10b981' : '#ef4444', marginRight: '5px' }),
  logLine: { padding: '5px 10px', fontSize: '12px', fontFamily: 'monospace', borderBottom: '1px solid rgba(255,255,255,0.015)' },
};

function App() {
  const [tab, setTab] = useState('dashboard');
  const [state, setState] = useState({ running: false, totalAccounts: 0, activeAccounts: 0, totalPoints: 0, totalKeepalives: 0 });
  const [accounts, setAccounts] = useState([]);
  const [proxies, setProxies] = useState([]);
  const [logs, setLogs] = useState([]);
  const [addForm, setAddForm] = useState({ email: '', token: '', proxy: '' });
  const [bulkText, setBulkText] = useState('');
  const [proxyUrl, setProxyUrl] = useState('');
  const [interval, setInterval] = useState(500);
  const [msg, setMsg] = useState('');

  const refresh = useCallback(async () => {
    try {
      const [s, a, p, l] = await Promise.all([
        API.get('/bot/state'),
        API.get('/accounts'),
        API.get('/proxies'),
        API.get('/logs?limit=30'),
      ]);
      setState(s.data);
      setAccounts(a.data);
      setProxies(p.data);
      setLogs(l.data);
    } catch (e) { /* silent */ }
  }, []);

  useEffect(() => { refresh(); const t = setInterval(refresh, 8000); return () => clearInterval(t); }, [refresh]);

  const notify = (m) => { setMsg(m); setTimeout(() => setMsg(''), 2500); };
  const startBot = async () => { await API.post('/bot/start', { interval }); refresh(); notify('Bot started!'); };
  const stopBot = async () => { await API.post('/bot/stop'); refresh(); notify('Bot stopped'); };
  const runOnce = async () => { await API.post('/bot/run-once'); refresh(); notify('Manual cycle done'); };

  const addAccount = async () => {
    if (!addForm.email || !addForm.token) return notify('Email & token required');
    await API.post('/accounts', addForm);
    setAddForm({ email: '', token: '', proxy: '' });
    refresh(); notify('Account added!');
  };

  const batchImport = async () => {
    const lines = bulkText.trim().split('\n').filter(Boolean);
    const accs = lines.map(l => {
      const [email, token, proxy] = l.split('|').map(s => s.trim());
      return { email, token, proxy: proxy || '' };
    }).filter(a => a.email && a.token);
    if (!accs.length) return notify('Format: email|token|proxy');
    await API.post('/accounts/import', { accounts: accs });
    setBulkText(''); refresh(); notify(`${accs.length} imported!`);
  };

  const delAccount = async (e) => { await API.delete(`/accounts/${e}`); refresh(); };
  const toggleAccount = async (email, cur) => {
    await API.patch(`/accounts/${email}`, { status: cur === 'active' ? 'paused' : 'active' }); refresh();
  };

  const addProxy = async () => {
    if (!proxyUrl) return;
    if (proxyUrl.includes('\n')) {
      const lines = proxyUrl.trim().split('\n').filter(Boolean);
      await API.post('/proxies/import', { proxies: lines });
    } else {
      await API.post('/proxies', { url: proxyUrl });
    }
    setProxyUrl(''); refresh(); notify('Proxy added!');
  };

  const delProxy = async (id) => { await API.delete(`/proxies/${id}`); refresh(); };

  const fmtDate = (s) => {
    if (!s) return '-';
    try {
      const d = new Date(s + (s.includes('Z') ? '' : 'Z'));
      return d.toLocaleString('id-ID', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
    } catch { return '-'; }
  };

  return (
    <div style={css.body}>
      {/* ---- HEADER ---- */}
      <div style={css.header}>
        <div style={css.title}>
          <span style={{ fontSize:'24px' }}>🌅</span> DAWN Bot
          <span style={css.badge(state.running)}>{state.running ? '● LIVE' : '○ IDLE'}</span>
        </div>
        <div style={{ display:'flex', gap:'6px', alignItems:'center', flexWrap:'wrap' }}>
          <input type="number" value={interval} onChange={e => setInterval(Number(e.target.value))}
            style={{ ...css.input, width:'70px', textAlign:'center' }} title="Interval (seconds)" />
          <span style={{ fontSize:'11px', color:'#555' }}>sec</span>
          {!state.running ? (
            <button onClick={startBot} style={css.btn('#10b981')}>▶ Start</button>
          ) : (
            <button onClick={stopBot} style={css.btn('#ef4444')}>⏹ Stop</button>
          )}
          <button onClick={runOnce} style={css.btn('#6366f1')}>↻ Once</button>
        </div>
      </div>

      {msg && <div style={{ background:'#6366f1', color:'#fff', textAlign:'center', padding:'7px', fontSize:'13px', fontWeight:500 }}>{msg}</div>}

      {/* ---- TABS ---- */}
      <div style={css.container}>
        <div style={{ display:'flex', gap:'4px', marginBottom:'20px' }}>
          {['dashboard','accounts','proxies','logs'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={css.tab(tab === t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* ============ DASHBOARD ============ */}
        {tab === 'dashboard' && <>
          <div style={css.grid}>
            {[
              [accounts.length, 'Total Accounts', '#6366f1'],
              [accounts.filter(a => a.status === 'active').length, 'Active', '#10b981'],
              [accounts.reduce((s,a) => s + (a.points||0), 0).toLocaleString(), 'Total Points', '#f59e0b'],
              [proxies.length, 'Proxies', '#ef4444'],
              [state.totalKeepalives || 0, 'Keep-alives', '#8b5cf6'],
            ].map(([v, l, c], i) => (
              <div key={i} style={css.card}>
                <div style={css.statVal(c)}>{v}</div>
                <div style={css.statLbl}>{l}</div>
              </div>
            ))}
          </div>

          <div style={css.card}>
            <h3 style={{ marginBottom:'10px', fontSize:'14px', fontWeight:600, color:'#aaa' }}>📋 Accounts</h3>
            <table style={css.table}>
              <thead><tr>{['Status','Email','Points','Social','Last KA'].map(h => <th key={h} style={css.th}>{h}</th>)}</tr></thead>
              <tbody>
                {accounts.slice(0, 20).map(a => (
                  <tr key={a.email}>
                    <td style={css.td}><span style={css.statusDot(a.status === 'active')} />{a.status}</td>
                    <td style={css.td}>{a.email}</td>
                    <td style={css.td}>{(a.points||0).toLocaleString()}</td>
                    <td style={css.td}>{a.social_verified||0}/3</td>
                    <td style={css.td}>{fmtDate(a.last_keepalive)}</td>
                  </tr>
                ))}
                {!accounts.length && <tr><td colSpan={5} style={{...css.td, textAlign:'center', color:'#444', padding:'30px' }}>No accounts yet</td></tr>}
              </tbody>
            </table>
          </div>
        </>}

        {/* ============ ACCOUNTS ============ */}
        {tab === 'accounts' && <>
          <div style={{ ...css.card, marginBottom:'12px' }}>
            <h3 style={{ marginBottom:'10px', fontSize:'14px', fontWeight:600, color:'#aaa' }}>➕ Add Single Account</h3>
            <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
              <input placeholder="Email" value={addForm.email} onChange={e => setAddForm({...addForm,email:e.target.value})} style={{...css.input, flex:'2 1 180px'}} />
              <input placeholder="Bearer Token" value={addForm.token} onChange={e => setAddForm({...addForm,token:e.target.value})} style={{...css.input, flex:'3 1 280px'}} />
              <input placeholder="Proxy (optional)" value={addForm.proxy} onChange={e => setAddForm({...addForm,proxy:e.target.value})} style={{...css.input, flex:'2 1 180px'}} />
              <button onClick={addAccount} style={css.btn('#10b981')}>Add</button>
            </div>
          </div>

          <div style={{ ...css.card, marginBottom:'12px' }}>
            <h3 style={{ marginBottom:'10px', fontSize:'14px', fontWeight:600, color:'#aaa' }}>📥 Batch Import <span style={{color:'#555',fontWeight:400,fontSize:'11px'}}>— email|token|proxy per line</span></h3>
            <textarea value={bulkText} onChange={e => setBulkText(e.target.value)}
              placeholder={`user1@gmail.com|eyJhbGciOi...|http://user:pass@ip:port\nuser2@gmail.com|eyJhbGciOi...`}
              style={{...css.input, minHeight:'90px', fontFamily:'monospace', fontSize:'11px', resize:'vertical'}} />
            <button onClick={batchImport} style={{...css.btn('#6366f1'), marginTop:'8px'}}>Import</button>
          </div>

          <div style={css.card}>
            <table style={css.table}>
              <thead><tr>{['Status','Email','Points','Social','✓','✗','Last',''].map(h => <th key={h} style={css.th}>{h}</th>)}</tr></thead>
              <tbody>
                {accounts.map(a => (
                  <tr key={a.email}>
                    <td style={css.td}><span style={css.statusDot(a.status === 'active')} />{a.status}</td>
                    <td style={css.td}>{a.email}</td>
                    <td style={css.td}>{(a.points||0).toLocaleString()}</td>
                    <td style={css.td}>{a.social_verified||0}/3</td>
                    <td style={css.td}><span style={{color:'#10b981'}}>{a.keepalive_success||0}</span></td>
                    <td style={css.td}><span style={{color:'#ef4444'}}>{a.keepalive_fail||0}</span></td>
                    <td style={css.td}>{fmtDate(a.last_keepalive)}</td>
                    <td style={css.td}>
                      <button onClick={() => toggleAccount(a.email,a.status)} style={{...css.btnGhost, marginRight:'5px'}}>{a.status==='active'?'⏸':'▶'}</button>
                      <button onClick={() => delAccount(a.email)} style={{...css.btnGhost, color:'#ef4444'}}>🗑</button>
                    </td>
                  </tr>
                ))}
                {!accounts.length && <tr><td colSpan={8} style={{...css.td, textAlign:'center', color:'#444', padding:'30px' }}>No accounts — add one above</td></tr>}
              </tbody>
            </table>
          </div>
        </>}

        {/* ============ PROXIES ============ */}
        {tab === 'proxies' && <>
          <div style={{ ...css.card, marginBottom:'12px' }}>
            <h3 style={{ marginBottom:'10px', fontSize:'14px', fontWeight:600, color:'#aaa' }}>🌐 Add / Batch Import Proxies</h3>
            <div style={{ display:'flex', gap:'6px', marginBottom:'6px' }}>
              <input placeholder="http://user:pass@ip:port or paste multiple" value={proxyUrl} onChange={e => setProxyUrl(e.target.value)}
                style={{...css.input, flex:1}} />
              <button onClick={addProxy} style={css.btn('#10b981')}>Add</button>
            </div>
          </div>

          <div style={css.card}>
            <table style={css.table}>
              <thead><tr>{['URL','Protocol','✓','✗',''].map(h => <th key={h} style={css.th}>{h}</th>)}</tr></thead>
              <tbody>
                {proxies.map(p => (
                  <tr key={p.id}>
                    <td style={{...css.td, fontFamily:'monospace', fontSize:'11px'}}>{p.url}</td>
                    <td style={css.td}><span style={{fontSize:'11px',padding:'2px 8px',borderRadius:'10px',background:'rgba(99,102,241,0.12)',color:'#818cf8'}}>{p.protocol}</span></td>
                    <td style={css.td}><span style={{color:'#10b981'}}>{p.success_count||0}</span></td>
                    <td style={css.td}><span style={{color:'#ef4444'}}>{p.fail_count||0}</span></td>
                    <td style={css.td}><button onClick={() => delProxy(p.id)} style={{...css.btnGhost, color:'#ef4444'}}>🗑</button></td>
                  </tr>
                ))}
                {!proxies.length && <tr><td colSpan={5} style={{...css.td, textAlign:'center', color:'#444', padding:'30px' }}>No proxies yet</td></tr>}
              </tbody>
            </table>
          </div>
        </>}

        {/* ============ LOGS ============ */}
        {tab === 'logs' && (
          <div style={css.card}>
            <h3 style={{ marginBottom:'10px', fontSize:'14px', fontWeight:600, color:'#aaa' }}>📜 Live Logs</h3>
            <div style={{ maxHeight:'500px', overflowY:'auto' }}>
              {logs.map((l,i) => (
                <div key={i} style={css.logLine}>
                  <span style={{color:'#444'}}>[{fmtDate(l.created_at)}]</span>{' '}
                  <span style={{color:'#666'}}>{l.account_email||'system'}</span>{' '}
                  <span style={{color: l.type==='success'?'#10b981':l.type==='fail'?'#ef4444':'#6366f1'}}>{l.message}</span>
                  {l.points>0 && <span style={{color:'#f59e0b'}}> (+{l.points.toLocaleString()} pts)</span>}
                </div>
              ))}
              {!logs.length && <div style={{padding:'30px',textAlign:'center',color:'#444'}}>No logs — start the bot!</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
