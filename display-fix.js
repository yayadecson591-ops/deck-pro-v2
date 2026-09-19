/* Deck Pro — force affichage Radar / Live / Pre-match (données OddsPapi réelles) */
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
  function apiBase() {
    return (typeof API !== 'undefined') ? API : 'https://deck-pro-server.onrender.com';
  }
  async function fetchRadar() {
    var r = await fetch(apiBase() + '/api/radar', {
      headers: { 'Authorization': 'Bearer ' + (localStorage.getItem('deckProToken') || '') }
    });
    var d = await r.json().catch(function () { return {}; });
    if (!r.ok) throw new Error(d.error || ('HTTP ' + r.status));
    return [].concat(d.data || []);
  }
  window.loadPronos = async function () {
    var box = document.getElementById('pronoList');
    if (!box) return;
    box.innerHTML = '<div class="empty">Chargement radar…</div>';
    try {
      var rows = await fetchRadar();
      if (!rows.length) {
        box.innerHTML = '<div class="empty">Aucun match pour le moment.</div>';
        return;
      }
      box.innerHTML = '<div class="notice info" style="margin-bottom:10px">' + rows.length +
        ' match(s) · données réelles</div>' + rows.slice(0, 60).map(card).join('');
    } catch (e) {
      box.innerHTML = '<div class="notice bad">' + esc(e.message) + '</div>';
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
      } catch (e1) {}
      if (!rows.length) {
        rows = (await fetchRadar()).filter(function (x) {
          var s = String(x.statusName || '').toLowerCase();
          return Number(x.statusId) === 0 || /pre|not started|scheduled/i.test(s);
        });
      }
      box.innerHTML = rows.length
        ? rows.slice(0, 50).map(card).join('')
        : '<div class="empty">Aucun pré-match pour le moment.</div>';
    } catch (e) {
      box.innerHTML = '<div class="notice bad">' + esc(e.message) + '</div>';
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
      } catch (e1) {}
      if (!rows.length) {
        rows = (await fetchRadar()).filter(function (x) {
          var s = String(x.statusName || '').toLowerCase();
          var id = Number(x.statusId);
          return id > 0 && id < 90 && !/pre-game|not started|scheduled|finished|ended|cancelled/i.test(s);
        });
      }
      box.innerHTML = rows.length
        ? rows.slice(0, 50).map(card).join('')
        : '<div class="empty">Aucun match <b>en cours</b> pour le moment. Ouvrez Radar ou Pré-match.</div>';
    } catch (e) {
      box.innerHTML = '<div class="notice bad">' + esc(e.message) + '</div>';
    }
  };
  setTimeout(function () {
    var radar = document.getElementById('radar');
    if (radar && radar.classList.contains('show') && typeof window.loadPronos === 'function') {
      window.loadPronos();
    }
  }, 800);
})();
