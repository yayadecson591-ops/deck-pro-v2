const API = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:3000'
  : 'https://deck-pro-server.onrender.com';

const BOOKS = [
  'sportybet','betmomo','premierbet','betpawa.cm','1xbet','1xwin','afropari',
  'betclic','yellowbet','22bet','pmuc','supergooal','betwinner','melbet',
  'bettomax','paripesa','onebet','betsson'
];

const BOOK_NAMES = {
  'sportybet': 'SportyBet',
  'betmomo': 'BetMomo',
  'premierbet': 'Premier Bet',
  'betpawa.cm': 'betPawa Cameroon',
  '1xbet': '1xBet',
  '1xwin': '1xWin',
  'afropari': 'Afropari',
  'betclic': 'Betclic',
  'yellowbet': 'Yellow Bet',
  '22bet': '22Bet',
  'pmuc': 'PMUC',
  'supergooal': 'Supergooal',
  'betwinner': 'BetWinner',
  'melbet': 'Melbet',
  'bettomax': 'Bettomax',
  'paripesa': 'PariPesa',
  'onebet': 'OneBet',
  'betsson': 'Betsson'
};

const $ = id => document.getElementById(id);

function tok() {
  return localStorage.getItem('deckProToken') || '';
}

function device() {
  let d = localStorage.getItem('deckProDeviceId');
  if (!d) {
    d = 'dp-' + (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
    localStorage.setItem('deckProDeviceId', d);
  }
  return d;
}

function esc(s) {
  if (s && typeof s === 'object') {
    try { s = s.message || s.error || JSON.stringify(s); } catch (e) { s = 'Erreur'; }
  }
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&', '<': '<', '>': '>', '"': '"', "'": '&#39;'
  }[c]));
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

async function api(path, opt = {}) {
  const r = await fetch(API + path, {
    ...opt,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + tok(),
      ...(opt.headers || {})
    }
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
  home: 'TABLEAU DE BORD',
  books: 'MES BOOKMAKERS',
  opps: 'OPPORTUNITÉS',
  radar: 'RADAR',
  live: 'LIVE',
  pre: 'PRÉ-MATCH',
  autobet: 'MISE AUTOMATIQUE',
  journal: 'JOURNAL',
  settings: 'PARAMÈTRES'
};

function tab(id) {
  document.querySelectorAll('.section').forEach(x => x.classList.remove('show'));
  const el = $(id);
  if (el) el.classList.add('show');
  document.querySelectorAll('.nav button, .mobile-nav button').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === id);
  });
  if ($('page')) $('page').textContent = TAB_LABELS[id] || id.toUpperCase();

  if (id === 'home') { loadHome(); }
  if (id === 'books') { loadBooks(); }
  if (id === 'opps') { loadOpps(); }
  if (id === 'radar') { loadSports(); loadPronos(); }
  if (id === 'live') { loadLive(); }
  if (id === 'pre') { loadPre(); }
  if (id === 'autobet') { loadAutoStake(); }
  if (id === 'journal') { loadHistory(); }
  if (id === 'settings') { loadSettings(); }
}

document.querySelectorAll('.nav button, .mobile-nav button').forEach(b => {
  b.addEventListener('click', () => tab(b.dataset.tab));
});

async function health() {
  try {
    const d = await fetch(API + '/health').then(r => r.json());
    let dbOk = true;
    try {
      const st = await fetch(API + '/api/account/status').then(r => r.json());
      dbOk = !!(st.db && st.db.configured);
    } catch (_) { dbOk = false; }
    if (dbOk) {
      if ($('sideStatus')) $('sideStatus').textContent = 'Système actif';
      if ($('sideDot')) { $('sideDot').className = 'status-dot'; }
      if ($('pill')) { $('pill').textContent = 'SYSTÈME ACTIF'; $('pill').className = 'pill'; }
      if ($('statSystem')) $('statSystem').textContent = 'ACTIF';
      if ($('statSystemSub')) $('statSystemSub').textContent = 'serveur + base';
    } else {
      if ($('sideStatus')) $('sideStatus').textContent = 'Base non configurée';
      if ($('sideDot')) { $('sideDot').className = 'status-dot warn'; }
      if ($('pill')) { $('pill').textContent = 'BASE OFF'; $('pill').className = 'pill off'; }
      if ($('statSystem')) $('statSystem').textContent = 'BASE';
      if ($('statSystemSub')) $('statSystemSub').textContent = 'DATABASE_URL manquant';
    }
    return true;
  } catch {
    if ($('sideStatus')) $('sideStatus').textContent = 'Serveur indisponible';
    if ($('sideDot')) { $('sideDot').className = 'status-dot off'; }
    if ($('pill')) { $('pill').textContent = 'HORS LIGNE'; $('pill').className = 'pill off'; }
    if ($('statSystem')) $('statSystem').textContent = 'OFF';
    return false;
  }
}

let connectionsCache = [];
let coverageCache = [];

async function loadCoverage() {
  try {
    const d = await api('/api/bookmakers/coverage');
    coverageCache = d.rows || [];
  } catch {
    coverageCache = [];
  }
}

async function loadConnections() {
  try {
    const d = await api('/api/account/bookmakers');
    connectionsCache = d.bookmakers || d.connections || [];
    return connectionsCache;
  } catch (e) {
    connectionsCache = [];
    return [];
  }
}

function statusForSlug(slug) {
  const conns = connectionsCache.filter(c => (c.bookmaker_slug || c.slug) === slug);
  if (!conns.length) return { key: 'off', label: '🔴 DÉCONNECTÉ', cls: 'off', card: 'disconnected' };
  const c = conns[0];
  const st = String(c.status || '').toLowerCase();
  if (st === 'expired' || st === 'invalid' || st === 'revoked') {
    return { key: 'warn', label: '⚠️ ACCÈS EXPIRÉ', cls: 'warn', card: 'expired', conn: c };
  }
  if (st === 'syncing' || st === 'pending') {
    return { key: 'sync', label: '🟠 SYNCHRONISATION', cls: 'sync', card: 'connected', conn: c };
  }
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
  const balance = conn && (conn.balance != null || conn.solde != null)
    ? fmtMoney(conn.balance ?? conn.solde)
    : 'Non synchronisé';
  const channel = conn ? (conn.access_channel || '—') : '—';
  const connId = conn ? (conn.id || '') : '';
  const cov = coverageCache.find(r => r.configuredSlug === slug);
  const logoUrl = cov && cov.logo ? cov.logo : null;

  return `
    <div class="book-card ${st.card}" data-slug="${esc(slug)}">
      <div class="book-head">
        <div class="book-logo">${logoUrl ? '<img src="'+esc(logoUrl)+'" alt="">' : esc(initials(name))}</div>
        <div>
          <div class="book-name">${esc(name)}</div>
          <div class="book-status ${st.cls}">${st.label}</div>
        </div>
      </div>
      <div class="book-meta">
        <div>Solde : <b>${esc(balance)}</b></div>
        <div>Dernière sync : <b>${esc(lastSync)}</b></div>
        <div>Canal : <b>${esc(channel)}</b></div>
        <div>Mise auto : <b>${autoOn ? 'ON' : 'OFF'}</b></div>
      </div>
      <div class="book-actions">
        ${conn
          ? `<button class="btn sm secondary" onclick="reconnectBook('${esc(slug)}')">Reconnecter</button>
             <label class="toggle"><input type="checkbox" ${autoOn ? 'checked' : ''} onchange="toggleBookAuto('${esc(connId)}', this.checked)"> Auto</label>
             <button class="btn sm ghost" onclick="syncCheck('${esc(connId)}')">Vérifier</button>`
          : `<button class="btn sm primary" onclick="openConnectModal('${esc(slug)}')">Connecter</button>`
        }
      </div>
    </div>`;
}

async function loadBooks() {
  await Promise.all([loadCoverage(), loadConnections()]);
  const grid = $('bookGrid');
  if (!grid) return;
  grid.innerHTML = BOOKS.map(bookCard).join('');
  const connected = connectionsCache.length;
  if ($('statBooks')) $('statBooks').textContent = connected;
}

function openConnectModal(prefillSlug) {
  const sel = $('syncBook');
  if (sel) {
    sel.innerHTML = BOOKS.map(s =>
      `<option value="${esc(s)}" ${s === prefillSlug ? 'selected' : ''}>${esc(BOOK_NAMES[s] || s)}</option>`
    ).join('');
  }
  if ($('syncMsg')) { $('syncMsg').className = 'notice warn'; $('syncMsg').textContent = '—'; }
  if ($('syncIdentifier')) $('syncIdentifier').value = '';
  if ($('syncPassword')) $('syncPassword').value = '';
  if ($('syncToken')) $('syncToken').value = '';
  if ($('syncLabel')) $('syncLabel').value = '';
  const modal = $('connectModal');
  if (modal) modal.classList.remove('hidden');
}

function closeConnectModal() {
  const modal = $('connectModal');
  if (modal) modal.classList.add('hidden');
}

async function syncBookmaker() {
  const msg = $('syncMsg');
  try {
    const slug = $('syncBook').value;
    const body = {
      accountLabel: ($('syncLabel').value || '').trim() || 'principal',
      channel: $('syncChannel').value,
      credentials: {
        identifier: $('syncIdentifier').value,
        password: $('syncPassword').value,
        token: $('syncToken').value
      }
    };
    if (msg) { msg.className = 'notice warn'; msg.textContent = 'Enregistrement…'; }
    const d = await api('/api/account/bookmakers/' + encodeURIComponent(slug) + '/connect', {
      method: 'POST',
      body: JSON.stringify(body)
    });
    if (msg) { msg.className = 'notice good'; msg.textContent = d.message || 'Connexion enregistrée.'; }
    if ($('syncPassword')) $('syncPassword').value = '';
    if ($('syncToken')) $('syncToken').value = '';
    if ($('syncIdentifier')) $('syncIdentifier').value = '';
    await loadBooks();
    setTimeout(closeConnectModal, 900);
  } catch (e) {
    if (msg) { msg.className = 'notice bad'; msg.textContent = e.message || 'Échec'; }
  }
}

function reconnectBook(slug) {
  openConnectModal(slug);
}

async function toggleBookAuto(connectionId, enabled) {
  if (!connectionId) return;
  try {
    await api('/api/account/bookmakers/connection/' + encodeURIComponent(connectionId) + '/auto-bet', {
      method: 'POST',
      body: JSON.stringify({ enabled: Boolean(enabled) })
    });
    await loadBooks();
  } catch (e) {
    alert(e.message || 'Impossible de modifier la mise auto');
    await loadBooks();
  }
}

async function syncCheck(connectionId) {
  if (!connectionId) return;
  try {
    const d = await api('/api/account/bookmakers/connection/' + encodeURIComponent(connectionId) + '/sync-check', {
      method: 'POST',
      body: JSON.stringify({})
    });
    alert(d.message || (d.ok ? 'Synchronisation OK' : 'Échec de synchronisation'));
    await loadBooks();
  } catch (e) {
    alert(e.message || 'Vérification impossible — canal non disponible ou connexion expirée');
  }
}

async function loadAutoStake() {
  try {
    const d = await api('/api/account/auto-stake');
    const on = !!(d.enabled || d.autoStake || d.on);
    updateAutoUI(on, d);
  } catch (e) {
    updateAutoUI(false, { error: e.message });
  }
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

  const checks = $('autoChecks');
  if (checks) {
    const hasConn = connectionsCache.length > 0;
    checks.innerHTML = `
      <div class="${hasConn ? 'ok' : 'fail'}">Connexions persistantes${hasConn ? '' : ' — aucun compte'}</div>
      <div class="pend">Canal d’exécution (selon bookmaker)</div>
      <div class="pend">Revalidation cotes avant placement</div>
      <div class="pend">Couverture garantie du marché</div>
      <div class="pend">Soldes disponibles</div>
    `;
  }
  if ($('autoMsg')) {
    if (on) {
      $('autoMsg').className = 'notice good';
      $('autoMsg').textContent = 'Mise automatique activée. Les placements n’auront lieu qu’après toutes les vérifications et uniquement via un canal d’exécution réel.';
    } else {
      $('autoMsg').className = 'notice warn';
      $('autoMsg').textContent = data && data.error
        ? data.error
        : 'Mise automatique désactivée. Activez-la uniquement si les canaux d’exécution sont disponibles.';
    }
  }
}

async function toggleGlobalAuto() {
  const currentlyOn = $('autoLabel') && $('autoLabel').textContent === 'ON';
  try {
    if (currentlyOn) {
      await api('/api/account/auto-stake', { method: 'POST', body: JSON.stringify({ enabled: false }) });
      updateAutoUI(false, {});
    } else {
      await api('/api/account/auto-stake', { method: 'POST', body: JSON.stringify({ enabled: true }) });
      updateAutoUI(true, {});
    }
  } catch (e) {
    if ($('autoMsg')) {
      $('autoMsg').className = 'notice bad';
      $('autoMsg').textContent = e.message || 'Impossible de modifier la mise automatique';
    }
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
    $('autopilotMsg').textContent = on
      ? 'Autopilote demandé. La surveillance continue dépend de la configuration serveur (pas besoin de garder le téléphone ouvert).'
      : 'Autopilote désactivé.';
  }
}

async function loadHome() {
  await health();
  await loadConnections();
  if ($('statBooks')) $('statBooks').textContent = connectionsCache.length;
  const preview = $('homeBooksPreview');
  if (preview) {
    if (!connectionsCache.length) {
      preview.innerHTML = '<div class="empty">Aucun compte connecté. <button class="btn sm primary" onclick="tab(\'books\')">Connecter</button></div>';
    } else {
      preview.innerHTML = connectionsCache.slice(0, 6).map(c => {
        const name = BOOK_NAMES[c.bookmaker_slug] || c.bookmaker_slug;
        return `<div style="padding:6px 0;border-bottom:1px solid var(--line);font-size:13px">
          <b>${esc(name)}</b> — ${c.auto_bet_enabled ? 'Auto ON' : 'Auto OFF'}
          <span style="color:var(--muted);font-size:11px"> · ${esc(c.status || 'configuré')}</span>
        </div>`;
      }).join('');
    }
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
    if (!rows.length) {
      box.innerHTML = '<div class="empty">Aucune opération enregistrée.</div>';
      return;
    }
    box.innerHTML = rows.slice(0, 5).map(h => {
      const title = h.title || h.event || h.type || 'Opération';
      const st = (h.status || h.state || 'inconnue').toLowerCase();
      return `<div class="journal-row">
        <div class="journal-time">${esc(fmtTime(h.created_at || h.date || h.at))}</div>
        <div>${esc(title)}</div>
        <div class="journal-status ${esc(st)}">${esc(st)}</div>
      </div>`;
    }).join('');
  } catch (e) {
    box.innerHTML = `<div class="notice warn">${esc(e.message)}</div>`;
  }
}

async function loadHistory() {
  const box = $('historyList');
  if (!box) return;
  try {
    const d = await api('/api/account/history');
    const rows = d.history || d.rows || [];
    if (!rows.length) {
      box.innerHTML = '<div class="empty">Aucune opération. Les placements réels et les détections apparaîtront ici.</div>';
      return;
    }
    box.innerHTML = rows.map(h => {
      const title = h.title || h.event || h.type || 'Opération';
      const st = (h.status || h.state || 'inconnue').toLowerCase();
      const detail = [
        h.bookmaker || h.bookmaker_slug,
        h.stake != null ? fmtMoney(h.stake) : null,
        h.odds != null ? 'cote ' + h.odds : null,
        h.profit != null ? 'P/L ' + fmtMoney(h.profit) : null
      ].filter(Boolean).join(' · ');
      return `<div class="journal-row">
        <div class="journal-time">${esc(fmtTime(h.created_at || h.date || h.at))}</div>
        <div>
          <div style="font-weight:700">${esc(title)}</div>
          <div style="color:var(--muted);font-size:11px">${esc(detail)}</div>
        </div>
        <div class="journal-status ${esc(st)}">${esc(st)}</div>
      </div>`;
    }).join('');
  } catch (e) {
    box.innerHTML = `<div class="notice bad">${esc(e.message)}</div>`;
  }
}

function matchCard(x) {
  const league = x.league || x.competition || x.tournament || x.sport || '—';
  const home = x.home || x.homeTeam || x.home_name || (x.teams && x.teams[0]) || '?';
  const away = x.away || x.awayTeam || x.away_name || (x.teams && x.teams[1]) || '?';
  const start = fmtTime(x.startTime || x.start || x.commence_time || x.time);
  const updated = x.oddsUpdatedAt || x.updated_at || x.lastUpdate;
  let freshCls = 'warn', freshLabel = '🟠 À vérifier';
  if (updated) {
    const age = Date.now() - new Date(updated).getTime();
    if (age < 2 * 60 * 1000) { freshCls = 'ok'; freshLabel = '🟢 Fraîche'; }
    else if (age > 15 * 60 * 1000) { freshCls = 'bad'; freshLabel = '🔴 Expirée'; }
  }
  return `<div class="match-card">
    <div class="league">${esc(league)}</div>
    <div class="teams">${esc(home)} — ${esc(away)}</div>
    <div class="meta">
      <span>${esc(start)}</span>
      <span class="freshness ${freshCls}">${freshLabel}</span>
    </div>
  </div>`;
}

async function loadPronos() {
  const box = $('pronoList');
  if (!box) return;
  try {
    const d = await api('/api/radar');
    const rows = [].concat(d.data || []);
    box.innerHTML = rows.length
      ? rows.slice(0, 40).map(matchCard).join('')
      : '<div class="empty">Aucune donnée réelle disponible.</div>';
  } catch (e) {
    box.innerHTML = `<div class="notice bad">${esc(e.message)}</div>`;
  }
}

async function loadSports() {
  const box = $('radarSports');
  if (!box) return;
  try {
    const d = await api('/api/sports');
    const sports = d.data || d.sports || [];
    box.innerHTML = (Array.isArray(sports) ? sports : []).slice(0, 20).map(s => {
      const name = typeof s === 'string' ? s : (s.name || s.sportName || s.id);
      return `<button class="btn sm ghost" style="margin:0">${esc(name)}</button>`;
    }).join('') || '<span class="empty">—</span>';
  } catch (e) {
    box.innerHTML = `<div class="notice bad">${esc(e.message)}</div>`;
  }
}

async function loadLive() {
  const box = $('liveList');
  if (!box) return;
  try {
    const d = await api('/api/live');
    const rows = d.data || d.fixtures || [];
    box.innerHTML = rows.length
      ? rows.slice(0, 30).map(matchCard).join('')
      : '<div class="empty">Aucune donnée réelle disponible.</div>';
  } catch (e) {
    box.innerHTML = `<div class="notice bad">${esc(e.message)}</div>`;
  }
}

async function loadPre() {
  const box = $('preList');
  if (!box) return;
  try {
    const d = await api('/api/prematch');
    const rows = d.data || d.fixtures || [];
    box.innerHTML = rows.length
      ? rows.slice(0, 30).map(matchCard).join('')
      : '<div class="empty">Aucune donnée réelle disponible.</div>';
  } catch (e) {
    try {
      const d = await api('/api/radar');
      const rows = [].concat(d.data || []);
      box.innerHTML = rows.length
        ? rows.slice(0, 30).map(matchCard).join('')
        : '<div class="empty">Aucune donnée réelle disponible.</div>';
    } catch (e2) {
      box.innerHTML = `<div class="notice bad">${esc(e2.message)}</div>`;
    }
  }
}

async function loadOpps() {
  const box = $('oppsList');
  if (!box) return;
  try {
    const d = await api('/api/arbitrage/opportunities').catch(() => null);
    if (d && Array.isArray(d.data || d.opportunities) && (d.data || d.opportunities).length) {
      const rows = d.data || d.opportunities;
      box.innerHTML = rows.map(o => {
        const yieldPct = o.yield != null ? (Number(o.yield) * 100).toFixed(2) + '%' : '—';
        const guaranteed = o.guaranteed || o.fullCoverage ? 'GARANTIE' : 'Non garanti';
        return `<div class="match-card">
          <div class="league">${esc(o.sport || '')} · ${esc(o.market || '')}</div>
          <div class="teams">${esc(o.event || o.name || 'Opportunité')}</div>
          <div class="meta">
            <span>Rendement ${esc(yieldPct)}</span>
            <span>${esc(guaranteed)}</span>
            <span class="freshness ${o.fresh ? 'ok' : 'warn'}">${o.fresh ? '🟢 Fraîche' : '🟠 À vérifier'}</span>
          </div>
        </div>`;
      }).join('');
    } else {
      box.innerHTML = '<div class="empty">Aucune opportunité réelle disponible pour le moment. Aucune donnée inventée.</div>';
    }
  } catch {
    box.innerHTML = '<div class="empty">Aucune opportunité réelle disponible pour le moment. Aucune donnée inventée.</div>';
  }
}

function loadSettings() {
  const s = JSON.parse(localStorage.getItem('deckProSettings') || '{}');
  if ($('brightness')) $('brightness').value = s.brightness || 100;
  if ($('contrast')) $('contrast').value = s.contrast || 100;
  applyDisplay();
  if (localStorage.getItem('deckProAutopilot') === '1' && $('autopilotToggle')) {
    $('autopilotToggle').checked = true;
    toggleAutopilot();
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
    if ($('lockMsg')) {
      $('lockMsg').className = 'notice good';
      $('lockMsg').textContent = 'Session ouverte.';
    }
    boot();
  } catch (e) {
    if ($('lockMsg')) {
      $('lockMsg').className = 'notice bad';
      $('lockMsg').textContent = e.message || 'Échec';
    }
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

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
