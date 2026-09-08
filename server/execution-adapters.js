// Deck Pro bookmaker adapter contracts.
// Real-money execution is fail-closed: an adapter must be explicitly registered
// and marked authorized before any bookmaker order can be sent.

const contracts = Object.create(null);

const REQUIRED_RESULT_FIELDS = ['accepted'];

function normalizeResult(result) {
  if (!result || typeof result !== 'object') throw new Error('INVALID_BOOKMAKER_RESULT');
  if (typeof result.accepted !== 'boolean') throw new Error('BOOKMAKER_RESULT_ACCEPTED_REQUIRED');
  return {
    accepted: result.accepted,
    betId: result.betId == null ? null : String(result.betId),
    status: result.status == null ? (result.accepted ? 'accepted' : 'rejected') : String(result.status),
    placedAt: result.placedAt == null ? new Date().toISOString() : String(result.placedAt),
    message: result.message == null ? null : String(result.message),
    raw: result.raw === undefined ? null : result.raw
  };
}

export function registerExecutionAdapter(slug, adapter) {
  const key = String(slug || '').trim().toLowerCase();
  if (!key || !adapter || typeof adapter.placeBet !== 'function') {
    throw new Error('INVALID_EXECUTION_ADAPTER');
  }
  contracts[key] = Object.freeze({
    slug: key,
    name: String(adapter.name || key),
    authorized: adapter.authorized === true,
    documented: adapter.documented === true,
    placeBet: async input => normalizeResult(await adapter.placeBet(input))
  });
}

export function getExecutionAdapter(slug) {
  return contracts[String(slug || '').trim().toLowerCase()] || null;
}

export function executionAdapterStatus(slug) {
  const adapter = getExecutionAdapter(slug);
  if (!adapter) return { registered: false, authorized: false, documented: false };
  return {
    registered: true,
    authorized: adapter.authorized,
    documented: adapter.documented,
    ready: adapter.authorized && adapter.documented
  };
}

export function listExecutionAdapters() {
  return Object.values(contracts).map(({ placeBet, ...meta }) => ({
    ...meta,
    ready: meta.authorized && meta.documented
  }));
}
