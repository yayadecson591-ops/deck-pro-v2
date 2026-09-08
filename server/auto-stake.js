// Deck Pro — Mise Auto / sécurité de déclenchement.
// Le mode automatique reste désactivé par défaut et fail-closed.

const states = new Map();
const DEFAULT_TTL = 15 * 60 * 1000;

function key(userId) { return String(userId || '').trim(); }

function current(userId) {
  const k = key(userId);
  if (!k) return null;
  const value = states.get(k);
  if (!value) return { userId: k, enabled: false, confirmed: false, updatedAt: null, expiresAt: null };
  if (value.expiresAt && Date.now() > value.expiresAt) {
    states.delete(k);
    return { userId: k, enabled: false, confirmed: false, updatedAt: Date.now(), expiresAt: null, reason: 'AUTO_STAKE_CONFIRMATION_EXPIRED' };
  }
  return { ...value };
}

export function autoStakeStatus(userId) { return current(userId); }

export function setAutoStake(userId, { enabled, confirmationId, reason = 'user_action' } = {}) {
  const k = key(userId);
  if (!k) return { ok: false, code: 'USER_REQUIRED' };
  if (enabled !== true && enabled !== false) return { ok: false, code: 'AUTO_STAKE_ENABLED_REQUIRED' };
  if (enabled === true && !String(confirmationId || '').trim()) {
    return { ok: false, code: 'AUTO_STAKE_CONFIRMATION_REQUIRED' };
  }
  const now = Date.now();
  const state = {
    userId: k,
    enabled,
    confirmed: enabled === true,
    confirmationId: enabled === true ? String(confirmationId).slice(0, 160) : null,
    reason: String(reason).slice(0, 200),
    updatedAt: now,
    expiresAt: enabled === true ? now + DEFAULT_TTL : null
  };
  states.set(k, state);
  return { ok: true, state: { ...state, confirmationId: undefined } };
}

export function assertAutoStakeAllowed(userId, { sensitiveAction = true } = {}) {
  const state = current(userId);
  if (!state?.enabled || !state?.confirmed) {
    return { ok: false, code: 'AUTO_STAKE_DISABLED', reason: 'Mise Auto désactivée.' };
  }
  if (sensitiveAction && (!state.confirmationId || !state.expiresAt || Date.now() >= state.expiresAt)) {
    return { ok: false, code: 'AUTO_STAKE_RECONFIRM_REQUIRED', reason: 'Confirmation Mise Auto expirée.' };
  }
  return { ok: true, expiresAt: state.expiresAt };
}

export function clearAutoStake(userId, reason = 'logout') {
  const k = key(userId);
  states.delete(k);
  return { ok: true, userId: k, enabled: false, reason };
}
