// Deck Pro execution-readiness policy (V131).
// Pure policy layer: no secrets, no network calls, no invented bookmaker endpoints.
// A bookmaker is executable only when its saved connection, selected channel,
// and execution strategy all satisfy the verified-contract gate.

export function executionReadiness({ connection, strategy, requestedAutoBet = false } = {}) {
  if (!connection) return { ready:false, code:'BOOKMAKER_CONNECTION_NOT_FOUND', reasons:['connection_missing'] };
  if (!strategy) return { ready:false, code:'BOOKMAKER_STRATEGY_NOT_FOUND', reasons:['strategy_missing'] };

  const channel = String(connection.access_channel || connection.channel || '').trim();
  const channelState = strategy.channels?.[channel];
  const reasons = [];

  if (!channel) reasons.push('channel_missing');
  if (!channelState) reasons.push('channel_not_declared');
  if (channelState && channelState.enabled !== true) reasons.push('channel_disabled');
  if (channelState && channelState.verified !== true) reasons.push('execution_contract_unverified');
  if (requestedAutoBet && connection.auto_bet_enabled !== true) reasons.push('auto_bet_not_enabled');

  return {
    ready: reasons.length === 0,
    code: reasons.length === 0 ? 'EXECUTION_READY' : 'EXECUTION_NOT_READY',
    bookmaker: connection.bookmaker_slug || null,
    connectionId: connection.id || null,
    channel: channel || null,
    autoBetEnabled: connection.auto_bet_enabled === true,
    reasons
  };
}

export function executionPairReadiness({ legs, connectionsById = new Map(), strategies = {} } = {}) {
  if (!Array.isArray(legs) || legs.length !== 2) {
    return { ready:false, code:'EXACTLY_TWO_BOOKMAKERS_REQUIRED', legs:[] };
  }
  const reports = legs.map((leg) => {
    const connection = connectionsById.get(String(leg?.connectionId || ''));
    const strategy = strategies[String(leg?.bookmaker || '').trim().toLowerCase()];
    return executionReadiness({ connection, strategy, requestedAutoBet: leg?.autoStake === true });
  });
  const distinct = new Set(reports.map(x => x.bookmaker).filter(Boolean)).size === 2;
  if (!distinct) return { ready:false, code:'DISTINCT_BOOKMAKERS_REQUIRED', legs:reports };
  return { ready:reports.every(x => x.ready), code:reports.every(x => x.ready) ? 'EXECUTION_READY' : 'EXECUTION_NOT_READY', legs:reports };
}
