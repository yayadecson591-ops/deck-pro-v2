/* Deck Pro UI patch — logos, badges auto, erreurs reseau */
(function () {
  if (typeof BOOK_NAMES === 'undefined') return;

  // Brand fallback if book-brands.js not loaded
  if (typeof BOOK_BRAND === 'undefined') {
    window.BOOK_BRAND = {
      sportybet: { color: '#1DB954', bg: '#0d2a18', mark: 'SB' },
      betmomo: { color: '#FF6B00', bg: '#2a1508', mark: 'BM' },
      premierbet: { color: '#E30613', bg: '#2a0a0c', mark: 'PB' },
      'betpawa.cm': { color: '#00C853', bg: '#0a2a14', mark: 'bP' },
      '1xbet': { color: '#1A73E8', bg: '#0a1a2e', mark: '1X' },
      '1xwin': { color: '#00BFA5', bg: '#0a2a24', mark: '1W' },
      afropari: { color: '#FFD600', bg: '#2a2400', mark: 'AF' },
      betclic: { color: '#E30613', bg: '#2a0a0c', mark: 'BC' },
      yellowbet: { color: '#FFEB3B', bg: '#2a2800', mark: 'YB' },
      '22bet': { color: '#00AEEF', bg: '#0a1e2a', mark: '22' },
      pmuc: { color: '#8B5CF6', bg: '#1a0f2a', mark: 'PM' },
      supergooal: { color: '#22C55E', bg: '#0a2a14', mark: 'SG' },
      betwinner: { color: '#F59E0B', bg: '#2a1a00', mark: 'BW' },
      melbet: { color: '#3B82F6', bg: '#0a1a2e', mark: 'MB' },
      bettomax: { color: '#EF4444', bg: '#2a0a0a', mark: 'BT' },
      paripesa: { color: '#10B981', bg: '#0a2a1a', mark: 'PP' },
      onebet: { color: '#6366F1', bg: '#12122a', mark: '1B' },
      betsson: { color: '#F97316', bg: '#2a1408', mark: 'BS' }
    };
  }

  function brandOf(slug) {
    return BOOK_BRAND[slug] || { color: '#81909a', bg: '#121a22', mark: '?' };
  }

  // Override bookCard with logos + auto badge
  if (typeof bookCard === 'function') {
    const _status = typeof statusForSlug === 'function' ? statusForSlug : null;
    window.bookCard = function (slug) {
      const name = BOOK_NAMES[slug] || slug;
      const st = _status ? _status(slug) : { key: 'off', label: 'DECONNECTE', cls: 'off', card: 'disconnected' };
      const conn = st.conn;
      const lastSync = conn && typeof fmtTime === 'function' ? fmtTime(conn.last_sync_at) : '—';
      const autoOn = conn && conn.auto_bet_enabled;
      const balance =
        conn && (conn.balance != null || conn.solde != null) && typeof fmtMoney === 'function'
          ? fmtMoney(conn.balance ?? conn.solde)
          : 'Non synchronise';
      const channel = conn ? conn.access_channel || '—' : '—';
      const connId = conn ? conn.id || '' : '';
      const b = brandOf(slug);
      const logo =
        '<div class="book-logo" style="background:' +
        b.bg +
        ';color:' +
        b.color +
        ';border:1px solid ' +
        b.color +
        '33">' +
        b.mark +
        '</div>';
      const autoBadge = conn
        ? autoOn
          ? '<span class="auto-badge on">AUTO ON</span>'
          : '<span class="auto-badge off">AUTO OFF</span>'
        : '';
      const actions = conn
        ? '<button class="btn sm secondary" onclick="reconnectBook(\'' +
          slug +
          '\')">Reconnecter</button>' +
          '<label class="toggle"><input type="checkbox" ' +
          (autoOn ? 'checked' : '') +
          ' onchange="toggleBookAuto(\'' +
          connId +
          '\', this.checked)"> Mise auto</label>'
        : '<button class="btn sm primary" onclick="openConnectModal(\'' +
          slug +
          '\')">Connecter</button>';
      return (
        '<div class="book-card ' +
        st.card +
        '">' +
        '<div class="book-head">' +
        logo +
        '<div style="flex:1;min-width:0"><div class="book-name">' +
        (typeof esc === 'function' ? esc(name) : name) +
        '</div><div class="book-status ' +
        st.cls +
        '">' +
        st.label +
        '</div></div>' +
        autoBadge +
        '</div>' +
        '<div class="book-meta">' +
        '<div>Solde : <b>' +
        balance +
        '</b></div>' +
        '<div>Derniere sync : <b>' +
        lastSync +
        '</b></div>' +
        '<div>Canal : <b>' +
        channel +
        '</b></div>' +
        '</div>' +
        '<div class="book-actions">' +
        actions +
        '</div></div>'
      );
    };
  }

  // Inject CSS if not already present
  if (!document.getElementById('deck-ui-polish')) {
    const link = document.createElement('link');
    link.id = 'deck-ui-polish';
    link.rel = 'stylesheet';
    link.href = 'ui-polish.css';
    document.head.appendChild(link);
  }

  // Refresh books grid if visible
  if (typeof loadBooks === 'function') {
    try {
      loadBooks();
    } catch (_) {}
  }
})();
