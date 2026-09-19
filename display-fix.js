/* Deck Pro — statut système + radar/live/pre + message quota OddsPapi */
(function () {
  function esc(s) {
    if (s && typeof s === 'object') {
      try { s = s.message || s.error || JSON.stringify(s); } catch (e) { s = 'Erreur'; }
    }
    return String(s ?? '').replace(/[&<>"']/g, function (c) {
      return ({ '&': '&', '<': '<', '>': '>', '"': '"', "'": '&#39;' })[c];
    });
  }
  function fmtTime(iso) {
    if (!iso) return '—';
    try {
      var d = new Date(iso);
      if (isNaN(d)) return '—';
      return d.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return '—'; }
  }
  function apiBase() {
    return (typeof API !== 'undefined') ? API : 'https://deck-pro-server.onrender.com';
  }
  function setActiveUI(mode) {
    var pill = document.getElementById('pill');
    var side = document.getElementById('sideStatus');
    var dot = document.getElementById('sideDot');
    var st = document.getElementById('statSystem');
    var sub = document.getElementById('statSystemSub');
    if (pill) { pill.textContent = 'SYSTEME ACTIF'; pill.className = 'pill'; }
    if (side) side.textContent = 'Systeme actif';
    if (dot) dot.className = 'status-dot';
    if (st) st.textContent = 'ACTIF';
    if (sub) sub.textContent = mode ? ('stockage ' + mode) : 'en ligne';
  }
  function setQuotaBanner(msg) {
    if (!document.getElementById('quotaBanner')) {
      var content = document.querySelector('.content');
      if (content) {
        var b = document.createElement('div');
        b.id = 'quotaBanner';
        b.className = 'notice warn';
        b.style.marginBottom = '12px';
        b.innerHTML = msg;
        content.insertBefore(b, content.firstChild);
      }
    } else {
      document.getElementById('quotaBanner').innerHTML = msg;
    }
  }
  function card(x) {
    var league = x.tournamentName || x.league || x.categoryName || x.sportName || '—';
    var home = x.participant1Name || x.participant1ShortName || x.home || '?';
    var away = x.participant2Name || x.participant2ShortName || x.away || '?';
    var start = fmtTime(x.startTime || x.trueStartTime);
    var status = x.statusName || '';
    var sport = x.sportName || '';
    return '<div class="match-card">' +
      '<div class="league">' + esc(sport) + (sport && league ? ' · ' : '') + esc(league) +
      (status ? ' · ' + esc(status) : '') + '</div>' +
      '<div class="teams">' + esc(home) + ' — ' + esc(away) + '</div>' +
      '<div class="meta"><span>' + esc(start) + '</span>' +
      (x.hasOdds ? '<span class="freshness ok">Cotes dispo</span>' : '') +
      '</div></div>';
  }
  async function forceHealth() {
    try {
      var r = await fetch(apiBase() + '/api/system/readiness');
      var d = await r.json();
      if (d && (d.operational || d.ready || d.ok)) {
        setActiveUI(d.db && d.db.mode);
        return true;
      }
    } catch (e) {}
    try {
      var h = await fetch(apiBase() + '/health');
      var hd = await h.json();
      if (hd && hd.ok) {
        setActiveUI('');
        return true;
      }
    } catch (e2) {}
    return false;
  }
  async function fetchRadar() {
    var r = await fetch(apiBase() + '/api/radar', {
      headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('deckProToken') || '') }
    });
    var d = await r.json().catch(function () { return {}; });
    if (!r.ok) {
      var err = d.error || ('HTTP ' + r.status);
      var code = d.code || '';
      if (r.status === 429 || /limit|quota|rate/i.test(String(err) + code)) {
        throw new Error('QUOTA');
      }
      throw new Error(String(err));
    }
    return [].concat(d.data || []);
  }
  window.loadPronos = async function () {
    var box = document.getElementById('pronoList');
    if (!box) return;
    box.innerHTML = '<div class="empty">Chargement radar…</div>';
    try {
      var rows = await fetchRadar();
      if (!rows.length) {
        box.innerHTML = '<div class="notice warn">Aucune fixture pour le moment. Le <b>serveur est ACTIF</b>. Source cotes temporairement vide ou limitée.</div>';
        return;
      }
      box.innerHTML = '<div class="notice info" style="margin-bottom:10px">' + rows.length +
        ' match(s) · données réelles</div>' + rows.slice(0, 60).map(card).join('');
    } catch (e) {
      if (String(e.message) === 'QUOTA') {
        box.innerHTML = '<div class="notice warn"><b>Serveur ACTIF</b> — source de cotes (OddsPapi) en limite de requêtes.<br>Les matchs réapparaîtront quand le quota se libère (souvent 15–60 min). Aucune donnée inventée.</div>';
        setQuotaBanner('<b>SYSTEME ACTIF</b> — Matchs temporairement indisponibles (quota OddsPapi). Réessayez plus tard.');
      } else {
        box.innerHTML = '<div class="notice bad">' + esc(e.message) + '</div>';
      }
    }
  };
  window.loadPre = async function () {
    var box = document.getElementById('preList');
    if (!box) return;
    box.innerHTML = '<div class="empty">Chargement pré-match…</div>';
    try {
      var rows = [];
      try {
        var r = await fetch(apiBase() + '/api/prematch');
        var d = await r.json();
        if (r.ok) rows = [].concat(d.data || []);
        else if (r.status === 429) throw new Error('QUOTA');
      } catch (e1) {
        if (String(e1.message) === 'QUOTA') throw e1;
      }
      if (!rows.length) {
        try { rows = (await fetchRadar()).filter(function (x) {
          var s = String(x.statusName || '').toLowerCase();
          return Number(x.statusId) === 0 || /pre|not started|scheduled/i.test(s);
        }); } catch (e2) {
          if (String(e2.message) === 'QUOTA') throw e2;
          throw e2;
        }
      }
      box.innerHTML = rows.length
        ? rows.slice(0, 50).map(card).join('')
        : '<div class="empty">Aucun pré-match pour le moment.</div>';
    } catch (e) {
      box.innerHTML = String(e.message) === 'QUOTA'
        ? '<div class="notice warn"><b>Serveur ACTIF</b> — quota cotes dépassé. Réessayez plus tard.</div>'
        : '<div class="notice bad">' + esc(e.message) + '</div>';
    }
  };
  window.loadLive = async function () {
    var box = document.getElementById('liveList');
    if (!box) return;
    box.innerHTML = '<div class="empty">Chargement live…</div>';
    try {
      var rows = [];
      try {
        var r = await fetch(apiBase() + '/api/live');
        var d = await r.json();
        if (r.ok) rows = [].concat(d.data || []);
        else if (r.status === 429) throw new Error('QUOTA');
      } catch (e1) {
        if (String(e1.message) === 'QUOTA') throw e1;
      }
      if (!rows.length) {
        try {
          rows = (await fetchRadar()).filter(function (x) {
            var s = String(x.statusName || '').toLowerCase();
            var id = Number(x.statusId);
            return id > 0 && id < 90 && !/pre-game|not started|scheduled|finished|ended|cancelled/i.test(s);
          });
        } catch (e2) {
          if (String(e2.message) === 'QUOTA') throw e2;
        }
      }
      box.innerHTML = rows.length
        ? rows.slice(0, 50).map(card).join('')
        : '<div class="empty">Aucun match <b>en cours</b>. Ouvrez Radar ou Pré-match.</div>';
    } catch (e) {
      box.innerHTML = String(e.message) === 'QUOTA'
        ? '<div class="notice warn"><b>Serveur ACTIF</b> — quota cotes dépassé. Réessayez plus tard.</div>'
        : '<div class="notice bad">' + esc(e.message) + '</div>';
    }
  };

  function bootFix() {
    forceHealth().then(function (ok) {
      if (ok) {
        setQuotaBanner('<b>SYSTEME ACTIF</b> — Plateforme en ligne. Si le Radar est vide : quota temporaire de la source de cotes (OddsPapi), pas une panne Deck Pro.');
      }
    });
    setInterval(forceHealth, 30000);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootFix);
  } else {
    bootFix();
  }
})();
