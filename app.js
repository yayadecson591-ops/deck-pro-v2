const API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:3000'
  : 'https://deck-pro-server.onrender.com';

const BOOKS = [
  'sportybet','betmomo','premierbet','betpawa.cm','1xbet','1xwin','afropari',
  'betclic','yellowbet','22bet','pmuc','supergooal','betwinner','melbet',
  'bettomax','paripesa','onebet','betsson'
];

const BOOK_NAMES = {
  'sportybet': 'SportyBet', 'betmomo': 'BetMomo', 'premierbet': 'Premier Bet',
  'betpawa.cm': 'betPawa Cameroon', '1xbet': '1xBet', '1xwin': '1xWin',
  'afropari': 'Afropari', 'betclic': 'Betclic', 'yellowbet': 'Yellow Bet',
  '22bet': '22Bet', 'pmuc': 'PMUC', 'supergooal': 'Supergooal',
  'betwinner': 'BetWinner', 'melbet': 'Melbet', 'bettomax': 'Bettomax',
  'paripesa': 'PariPesa', 'onebet': 'OneBet', 'betsson': 'Betsson'
};

const $ = id => document.getElementById(id);
function tok() { return localStorage.getItem('deckProToken') || ''; }
function device() {
  let d = localStorage.getItem('deckProDeviceId');
  if (!d) {
    d = 'dp-' + (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
    localStorage.setItem('deckProDeviceId', d);
  }
  return d;
}
function esc(s) {
  if (s && typeof s === 'object') { try { s = s.message || s.error || JSON.stringify(s); } catch (e) { s = 'Erreur'; } }
  return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&','<':'<','>':'>','"':'"',"'":'&#39;'}[c]));
}
function fmtMoney(n) {
  if (n == null || !Number.isFinite(Number(n))) return '—';
  return Number(n).toLocaleString('fr-FR') + ' FCFA';
}
function fmtTime(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d)) return '—';
    return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  } catch { return '—'; }
}
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error(label || 'Délai dépassé')), ms))
  ]);
}
async function api(path, opt = {}) {
  const r = await fetch(API + path, {
    ...opt,
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tok(), ...(opt.headers || {}) }
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) {
    const err = d.error;
    const msg = typeof err === 'string' ? err : (err && err.message) || d.message || (r.status === 401 ? 'Session requise' : 'Erreur');
    throw new Error(String(msg));
  }
  return d;
}

const TAB_LABELS = {
  home: 'TABLEAU DE BORD', books: 'MES BOOKMAKERS', opps: 'OPPORTUNITÉS', radar: 'RADAR',
  live: 'LIVE', pre: 'PRÉ-MATCH', autobet: 'MISE AUTOMATIQUE', journal: 'JOURNAL', settings: 'PARAMÈTRES'
};

function tab(id) {
  document.querySelectorAll('.section').forEach(x => x.classList.remove('show'));
  const el = $(id); if (el) el.classList.add('show');
  document.querySelectorAll('.nav button, .mobile-nav button').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === id);
  });
  if ($('page')) $('page').textContent = TAB_LABELS[id] || id.toUpperCase();
  if (id === 'home') loadHome();
  if (id === 'books') loadBooks();
  if (id === 'opps') loadOpps();
  if (id === 'radar') { loadSports(); loadPronos(); }
  if (id === 'live') loadLive();
  if (id === 'pre') loadPre();
  if (id === 'autobet') loadAutoStake();
  if (id === 'journal') loadHistory();
  if (id === 'settings') loadSettings();
}
document.querySelectorAll('.nav button, .mobile-nav button').forEach(b => {
  b.addEventListener('click', () => tab(b.dataset.tab));
});

async function health() {
  if ($('pill')) { $('pill').textContent = 'RÉVEIL…'; $('pill').className = 'pill off'; }
  if ($('sideStatus')) $('sideStatus').textContent = 'Réveil du serveur…';
  try {
    const d = await withTimeout(fetch(API + '/health').then(r => r.json()), 90000, 'Serveur en réveil').catch(() => null);
    let operational = false, mode = '';
    try {
      const ready = await withTimeout(fetch(API + '/api/system/readiness').then(r => r.json()), 30000, 'readiness');
      operational = !!(ready && (ready.operational || (ready.checks && ready.checks.database && ready.checks.oddsPapi)));
      mode = (ready && ready.db && ready.db.mode) || '';
    } catch (_) {
      try {
        const st = await fetch(API + '/api/system/runtime').then(r => r.json());
        operational = !!(st && st.database && st.database.configured);
        mode = (st && st.database && st.database.mode) || '';
      } catch (__) {}
    }
    if (operational || (d && d.ok)) {
      if ($('sideStatus')) $('sideStatus').textContent = operational ? 'Système actif' : 'Serveur en ligne';
      if ($('sideDot')) $('sideDot').className = 'status-dot';
      if ($('pill')) { $('pill').textContent = operational ? 'SYSTÈME ACTIF' : 'EN LIGNE'; $('pill').className = 'pill'; }
      if ($('statSystem')) $('statSystem').textContent = 'ACTIF';
      if ($('statSystemSub')) $('statSystemSub').textContent = mode ? ('stockage ' + mode) : 'en ligne';
      return true;
    }
    if ($('pill')) { $('pill').textContent = 'PARTIEL'; $('pill').className = 'pill off'; }
    return true;
  } catch (e) {
    if ($('sideStatus')) $('sideStatus').textContent = 'Serveur en réveil — patientez 30–60s';
    if ($('sideDot')) $('sideDot').className = 'status-dot warn';
    if ($('pill')) { $('pill').textContent = 'RÉVEIL…'; $('pill').className = 'pill off'; }
    if ($('statSystem')) $('statSystem').textContent = '…';
    if ($('statSystemSub')) $('statSystemSub').textContent = 'Render free';
    return false;
  }
}

let connectionsCache = [];
let coverageCache = [];

async function loadCoverage() {
  try { const d = await api('/api/bookmakers/coverage'); coverageCache = d.rows || []; }
  catch { coverageCache = []; }
}
async function loadConnections() {
  try {
    const d = await api('/api/account/bookmakers');
    connectionsCache = d.bookmakers || d.connections || [];
    return connectionsCache;
  } catch (e) { connectionsCache = []; throw e; }
}
function statusForSlug(slug) {
  const conns = connectionsCache.filter(c => (c.bookmaker_slug || c.slug) === slug);
  if (!conns.length) return { key: 'off', label: '🔴 DÉCONNECTÉ', cls: 'off', card: 'disconnected' };
  const c = conns[0];
  const st = String(c.status || '').toLowerCase();
  if (st === 'expired' || st === 'invalid' || st === 'revoked') return { key: 'warn', label: '⚠️ ACCÈS EXPIRÉ', cls: 'warn', card: 'expired', conn: c };
  if (st === 'syncing' || st === 'pending') return { key: 'sync', label: '🟠 SYNCHRONISATION', cls: 'sync', card: 'connected', conn: c };
  return { key: 'ok', label: '🟢 CONNECTÉ', cls: 'ok', card: 'connected', conn: c };
}
function initials(name) {
  return String(name || '?').replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() || '?';
}
function bookCard(slug) {
  const name = BOOK_NAMES[slug] || slug;
  const st = statusForSlug(slug);
  const conn = st.conn;
  const lastSync = conn ? fmtTime(conn.last_sync_at) : '—';
  const autoOn = conn && conn.auto_bet_enabled;
  const balance = conn && (conn.balance != null || conn.solde != null) ? fmtMoney(conn.balance ?? conn.solde) : 'Non synchronisé';
  const channel = conn ? (conn.access_channel || '—') : '—';
  const connId = conn ? (conn.id || '') : '';
  return `<div class="book-card ${st.card}">
    <div class="book-head"><div class="book-logo">${esc(initials(name))}</div>
      <div><div class="book-name">${esc(name)}</div><div class="book-status ${st.cls}">${st.label}</div></div></div>
    <div class="book-meta">
      <div>Solde : <b>${esc(balance)}</b></div>
      <div>Dernière sync : <b>${esc(lastSync)}</b></div>
      <div>Canal : <b>${esc(channel)}</b></div>
      <div>Mise auto : <b>${autoOn ? 'ON' : 'OFF'}</b></div>
    </div>
    <div class="book-actions">
      ${conn
        ? `<button class="btn sm secondary" onclick="reconnectBook('${esc(slug)}')">Reconnecter</button>
           <label class="toggle"><input type="checkbox" ${autoOn ? 'checked' : ''} onchange="toggleBookAuto('${esc(connId)}', this.checked)"> Auto</label>`
        : `<button class="btn sm primary" onclick="openConnectModal('${esc(slug)}')">Connecter</button>`}
    </div></div>`;
}
async function loadBooks() {
  let connErr = null;
  try { await loadCoverage(); } catch (e) {}
  try { await loadConnections(); } catch (e) { connErr = e; connectionsCache = []; }
  const grid = $('bookGrid');
  if (!grid) return;
  let banner = '';
  if (connErr || !tok()) {
    banner = `<div class="notice warn" style="grid-column:1/-1;margin-bottom:8px">Session requise. Paramètres → code propriétaire → Ouvrir session. Ensuite connectez vos bookmakers une seule fois.</div>`;
  }
  grid.innerHTML = banner + BOOKS.map(bookCard).join('');
  if ($('statBooks')) $('statBooks').textContent = connectionsCache.length;
}
function openConnectModal(prefillSlug) {
  const sel = $('syncBook');
  if (sel) sel.innerHTML = BOOKS.map(s => `<option value="${esc(s)}" ${s === prefillSlug ? 'selected' : ''}>${esc(BOOK_NAMES[s] || s)}</option>`).join('');
  if ($('syncMsg')) { $('syncMsg').className = 'notice warn'; $('syncMsg').textContent = '—'; }
  ['syncIdentifier','syncPassword','syncToken','syncLabel'].forEach(id => { if ($(id)) $(id).value = ''; });
  if ($('connectModal')) $('connectModal').classList.remove('hidden');
}
function closeConnectModal() { if ($('connectModal')) $('connectModal').classList.add('hidden'); }
async function syncBookmaker() {
  const msg = $('syncMsg');
  try {
    const slug = $('syncBook').value;
    const body = {
      accountLabel: ($('syncLabel').value || '').trim() || 'principal',
      channel: $('syncChannel').value,
      credentials: { identifier: $('syncIdentifier').value, password: $('syncPassword').value, token: $('syncToken').value }
    };
    if (msg) { msg.className = 'notice warn'; msg.textContent = 'Enregistrement…'; }
    const d = await api('/api/account/bookmakers/' + encodeURIComponent(slug) + '/connect', { method: 'POST', body: JSON.stringify(body) });
    if (msg) { msg.className = 'notice good'; msg.textContent = d.message || 'Connexion enregistrée.'; }
    await loadBooks();
    setTimeout(closeConnectModal, 900);
  } catch (e) { if (msg) { msg.className = 'notice bad'; msg.textContent = e.message || 'Échec'; } }
}
function reconnectBook(slug) { openConnectModal(slug); }
async function toggleBookAuto(connectionId, enabled) {
  if (!connectionId) return;
  try {
    await api('/api/account/bookmakers/connection/' + encodeURIComponent(connectionId) + '/auto-bet', { method: 'POST', body: JSON.stringify({ enabled: Boolean(enabled) }) });
    await loadBooks();
  } catch (e) { alert(e.message || 'Erreur'); await loadBooks(); }
}
async function loadAutoStake() {
  try {
    const d = await api('/api/account/auto-stake');
    updateAutoUI(!!(d.enabled || d.autoStake || d.on), d);
  } catch (e) { updateAutoUI(false, { error: e.message }); }
  const saved = localStorage.getItem('deckProStake');
  if (saved && $('stakeTotal')) $('stakeTotal').value = saved;
  if ($('statStake')) $('statStake').textContent = ($('stakeTotal') ? $('stakeTotal').value : '50000');
}
function updateAutoUI(on, data) {
  if ($('autoLabel')) $('autoLabel').textContent = on ? 'ON' : 'OFF';
  if ($('autoToggleBtn')) {
    $('autoToggleBtn').textContent = on ? 'Désactiver' : 'Activer';
    $('autoToggleBtn').className = on ? 'btn danger' : 'btn primary';
  }
  if ($('autoPanel')) $('autoPanel').classList.toggle('off', !on);
  if ($('statAuto')) $('statAuto').textContent = on ? 'ON' : 'OFF';
  if ($('statAutoSub')) $('statAutoSub').textContent = on ? 'activée' : 'désactivée';
  if ($('autoChecks')) {
    const hasConn = connectionsCache.length > 0;
    $('autoChecks').innerHTML = `<div class="${hasConn ? 'ok' : 'fail'}">Connexions persistantes${hasConn ? '' : ' — aucun compte'}</div>
      <div class="pend">Canal d’exécution</div><div class="pend">Revalidation cotes</div>
      <div class="pend">Couverture garantie</div><div class="pend">Soldes disponibles</div>`;
  }
  if ($('autoMsg')) {
    $('autoMsg').className = on ? 'notice good' : 'notice warn';
    $('autoMsg').textContent = on
      ? 'Mise automatique activée (placements uniquement via canaux réels après vérifications).'
      : (data && data.error) || 'Mise automatique désactivée.';
  }
}
async function toggleGlobalAuto() {
  const currentlyOn = $('autoLabel') && $('autoLabel').textContent === 'ON';
  try {
    await api('/api/account/auto-stake', { method: 'POST', body: JSON.stringify({ enabled: !currentlyOn }) });
    updateAutoUI(!currentlyOn, {});
  } catch (e) {
    if ($('autoMsg')) { $('autoMsg').className = 'notice bad'; $('autoMsg').textContent = e.message || 'Erreur'; }
  }
}
function saveStake() {
  const v = $('stakeTotal') ? $('stakeTotal').value : '50000';
  localStorage.setItem('deckProStake', v);
  if ($('statStake')) $('statStake').textContent = v;
}
function toggleAutopilot() {
  const on = $('autopilotToggle') && $('autopilotToggle').checked;
  localStorage.setItem('deckProAutopilot', on ? '1' : '0');
  if ($('autopilotMsg')) {
    $('autopilotMsg').className = on ? 'notice good' : 'notice info';
    $('autopilotMsg').textContent = on ? 'Autopilote demandé (côté serveur).' : 'Autopilote désactivé.';
  }
}
async function loadHome() {
  await health();
  try { await loadConnections(); } catch (_) { connectionsCache = []; }
  if ($('statBooks')) $('statBooks').textContent = connectionsCache.length;
  const preview = $('homeBooksPreview');
  if (preview) {
    if (!tok()) preview.innerHTML = '<div class="empty">Session fermée. <button class="btn sm primary" onclick="tab(\'settings\')">Ouvrir session</button></div>';
    else if (!connectionsCache.length) preview.innerHTML = '<div class="empty">Aucun compte. <button class="btn sm primary" onclick="tab(\'books\')">Connecter</button></div>';
    else preview.innerHTML = connectionsCache.slice(0, 6).map(c => {
      const name = BOOK_NAMES[c.bookmaker_slug] || c.bookmaker_slug;
      return `<div style="padding:6px 0;border-bottom:1px solid var(--line);font-size:13px"><b>${esc(name)}</b> — ${c.auto_bet_enabled ? 'Auto ON' : 'Auto OFF'}</div>`;
    }).join('');
  }
  loadHistoryPreview();
  loadAutoStake();
}
async function loadHistoryPreview() {
  const box = $('homeJournal');
  if (!box) return;
  try {
    const d = await api('/api/account/history');
    const rows = d.history || d.rows || [];
    if (!rows.length) { box.innerHTML = '<div class="empty">Aucune opération.</div>'; return; }
    box.innerHTML = rows.slice(0, 5).map(h => {
      const title = h.title || h.event || h.type || 'Opération';
      const st = (h.status || h.state || '').toLowerCase();
      return `<div class="journal-row"><div class="journal-time">${esc(fmtTime(h.created_at || h.date))}</div><div>${esc(title)}</div><div class="journal-status ${esc(st)}">${esc(st)}</div></div>`;
    }).join('');
  } catch (e) { box.innerHTML = `<div class="notice warn">${esc(e.message)}</div>`; }
}
async function loadHistory() {
  const box = $('historyList');
  if (!box) return;
  try {
    const d = await api('/api/account/history');
    const rows = d.history || d.rows || [];
    if (!rows.length) { box.innerHTML = '<div class="empty">Aucune opération enregistrée.</div>'; return; }
    box.innerHTML = rows.map(h => {
      const title = h.title || h.event || h.type || 'Opération';
      const st = (h.status || h.state || '').toLowerCase();
      return `<div class="journal-row"><div class="journal-time">${esc(fmtTime(h.created_at || h.date))}</div><div>${esc(title)}</div><div class="journal-status ${esc(st)}">${esc(st)}</div></div>`;
    }).join('');
  } catch (e) { box.innerHTML = `<div class="notice bad">${esc(e.message)}</div>`; }
}
function matchCard(x) {
  const league = x.tournamentName || x.league || x.competition || x.tournament || x.categoryName || x.sportName || x.sport || '—';
  const home = x.participant1Name || x.participant1ShortName || x.home || x.homeTeam || x.home_name || (x.teams && x.teams[0]) || '?';
  const away = x.participant2Name || x.participant2ShortName || x.away || x.awayTeam || x.away_name || (x.teams && x.teams[1]) || '?';
  const start = fmtTime(x.startTime || x.trueStartTime || x.start || x.commence_time || x.time);
  const status = x.statusName || x.status || '';
  const sport = x.sportName || '';
  return `<div class="match-card">
    <div class="league">${esc(sport)}${sport && league ? ' · ' : ''}${esc(league)}${status ? ' · ' + esc(status) : ''}</div>
    <div class="teams">${esc(home)} — ${esc(away)}</div>
    <div class="meta"><span>${esc(start)}</span>${x.hasOdds ? '<span class="freshness ok">Cotes dispo</span>' : ''}</div>
  </div>`;
}
async function loadPronos() {
  const box = $('pronoList');
  if (!box) return;
  box.innerHTML = '<div class="empty">Chargement radar…</div>';
  try {
    const d = await api('/api/radar');
    const rows = [].concat(d.data || []);
    box.innerHTML = rows.length ? rows.slice(0, 40).map(matchCard).join('') : '<div class="empty">Aucune donnée réelle pour le moment.</div>';
  } catch (e) {
    const msg = String(e.message || '');
    box.innerHTML = /rate|429|limité/i.test(msg)
      ? '<div class="notice warn">Quota cotes temporairement limité. Réessayez dans 1–2 min. Aucune donnée inventée.</div>'
      : `<div class="notice bad">${esc(msg)}</div>`;
  }
}
async function loadSports() {
  const box = $('radarSports');
  if (!box) return;
  try {
    const d = await api('/api/sports');
    const sports = d.data || d.sports || [];
    box.innerHTML = (Array.isArray(sports) ? sports : []).slice(0, 24).map(s => {
      const name = typeof s === 'string' ? s : (s.sportName || s.name || s.slug || s.id);
      return `<button class="btn sm ghost">${esc(name)}</button>`;
    }).join('') || '<span class="empty">—</span>';
  } catch (e) {
    box.innerHTML = /rate|429|limité/i.test(String(e.message||''))
      ? '<div class="notice warn">Sports temporairement limités (quota).</div>'
      : `<div class="notice bad">${esc(e.message)}</div>`;
  }
}
async function loadLive() {
  const box = $('liveList');
  if (!box) return;
  box.innerHTML = '<div class="empty">Chargement live…</div>';
  try {
    let rows = [];
    try {
      const d = await api('/api/live');
      rows = [].concat(d.data || []);
    } catch (_) {
      const d = await api('/api/radar');
      rows = [].concat(d.data || []).filter(x => {
        const s = String(x.statusName || x.status || '').toLowerCase();
        return /live|in play|in-play|1st|2nd|half|period|set|quarter/i.test(s) || (Number(x.statusId) > 0 && Number(x.statusId) < 100 && !/pre|not started|scheduled/i.test(s));
      });
    }
    box.innerHTML = rows.length
      ? rows.slice(0, 40).map(matchCard).join('')
      : '<div class="empty">Aucun match live pour le moment (source réelle).</div>';
  } catch (e) { box.innerHTML = `<div class="notice bad">${esc(e.message)}</div>`; }
}
async function loadPre() {
  const box = $('preList');
  if (!box) return;
  box.innerHTML = '<div class="empty">Chargement pré-match…</div>';
  try {
    let rows = [];
    try {
      const d = await api('/api/prematch');
      rows = [].concat(d.data || []);
    } catch (_) {
      const d = await api('/api/radar');
      rows = [].concat(d.data || []).filter(x => {
        const s = String(x.statusName || x.status || '').toLowerCase();
        return /pre|not started|scheduled|upcoming/i.test(s) || Number(x.statusId) === 0;
      });
    }
    box.innerHTML = rows.length
      ? rows.slice(0, 40).map(matchCard).join('')
      : '<div class="empty">Aucun pré-match pour le moment (source réelle).</div>';
  } catch (e) { box.innerHTML = `<div class="notice bad">${esc(e.message)}</div>`; }
}
async function loadOpps() {
  const box = $('oppsList');
  if (!box) return;
  box.innerHTML = '<div class="empty">Recherche…</div>';
  try {
    const r = await api('/api/radar');
    const n = Array.isArray(r.data) ? r.data.length : 0;
    box.innerHTML = n
      ? `<div class="notice info">${n} fixture(s) radar. Aucune surebet inventée — uniquement des calculs réels quand disponibles.</div>`
      : '<div class="empty">Aucune opportunité réelle pour le moment.</div>';
  } catch (e) {
    box.innerHTML = `<div class="notice bad">${esc(e.message)}</div>`;
  }
}
function loadSettings() {
  const s = JSON.parse(localStorage.getItem('deckProSettings') || '{}');
  if ($('brightness')) $('brightness').value = s.brightness || 100;
  if ($('contrast')) $('contrast').value = s.contrast || 100;
  applyDisplay();
  if (localStorage.getItem('deckProAutopilot') === '1' && $('autopilotToggle')) {
    $('autopilotToggle').checked = true; toggleAutopilot();
  }
}
function saveSettings() {
  localStorage.setItem('deckProSettings', JSON.stringify({
    brightness: $('brightness') ? $('brightness').value : 100,
    contrast: $('contrast') ? $('contrast').value : 100
  }));
  applyDisplay();
}
function applyDisplay() {
  const b = $('brightness') ? $('brightness').value : 100;
  const c = $('contrast') ? $('contrast').value : 100;
  document.documentElement.style.filter = 'brightness(' + (b / 100) + ') contrast(' + (c / 100) + ')';
}
async function softActivate() {
  try {
    const code = ($('ownerCode') && $('ownerCode').value) || '';
    const r = await fetch(API + '/api/activate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, deviceId: device() })
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok || !d.ok) throw new Error(d.error || 'Code incorrect');
    localStorage.setItem('deckProToken', d.token);
    if ($('lockMsg')) { $('lockMsg').className = 'notice good'; $('lockMsg').textContent = 'Session ouverte.'; }
    boot();
  } catch (e) {
    if ($('lockMsg')) { $('lockMsg').className = 'notice bad'; $('lockMsg').textContent = e.message || 'Échec'; }
  }
}
async function boot() {
  await health();
  loadSettings();
  if ($('brightness')) $('brightness').oninput = applyDisplay;
  if ($('contrast')) $('contrast').oninput = applyDisplay;
  const stake = localStorage.getItem('deckProStake');
  if (stake && $('stakeTotal')) $('stakeTotal').value = stake;
  if ($('statStake')) $('statStake').textContent = ($('stakeTotal') && $('stakeTotal').value) || '50000';
  await loadHome();
}
boot();
if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js').catch(() => {}); }
