// Deck Pro — final pre-execution decision engine (Step 5).
// Every automatic decision fails closed. No bookmaker placement happens here.

import { decideAutoStake } from './auto-stake-policy.js';
import { assertAutoStakeAllowed } from './auto-stake.js';
import { validateExecutionPair } from './execution.js';

export const DECISION_CODES = Object.freeze({
  CONFIRMED: 'CONFIRMED',
  REFUSED: 'REFUSED',
  ODDS_CHANGED: 'ODDS_CHANGED',
  EXPIRED: 'EXPIRED',
  PAIR_INVALID: 'PAIR_INVALID',
  EXECUTION_NOT_READY: 'EXECUTION_NOT_READY',
  AUTO_STAKE_BLOCKED: 'AUTO_STAKE_BLOCKED'
});

function finitePrice(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 1 ? n : null;
}

function normalizeLeg(leg) {
  return {
    ...leg,
    bookmaker: String(leg?.bookmaker || leg?.slug || '').trim().toLowerCase(),
    price: finitePrice(leg?.price ?? leg?.odds)
  };
}

function oddsChanged(leg) {
  const current = finitePrice(leg?.currentPrice ?? leg?.currentOdds ?? leg?.livePrice ?? leg?.liveOdds);
  const expected = finitePrice(leg?.expectedPrice ?? leg?.expectedOdds ?? leg?.price ?? leg?.odds);
  return current !== null && expected !== null && current < expected;
}

export function decideExecution({
  userAuthenticated,
  userId,
  autoStakeEnabled,
  confirmationValid,
  pairValid,
  executionReady,
  legs = [],
  expiresAt = null,
  now = Date.now()
} = {}) {
  const normalized = Array.isArray(legs) ? legs.map(normalizeLeg) : [];
  const reasons = [];

  if (expiresAt !== null && Number.isFinite(Number(expiresAt)) && now >= Number(expiresAt)) reasons.push(DECISION_CODES.EXPIRED);
  if (normalized.some(oddsChanged)) reasons.push(DECISION_CODES.ODDS_CHANGED);

  const pair = validateExecutionPair(normalized);
  if (!pair.ok) reasons.push(DECISION_CODES.PAIR_INVALID);

  let autoGate = { ok: true };
  if (autoStakeEnabled || confirmationValid || userId) {
    autoGate = userId ? assertAutoStakeAllowed(userId) : { ok: false, code: 'USER_REQUIRED' };
    if (!autoGate.ok) reasons.push(DECISION_CODES.AUTO_STAKE_BLOCKED);
  }

  const policy = decideAutoStake({
    userAuthenticated,
    autoStakeEnabled,
    confirmationValid,
    pairValid: pairValid && pair.ok,
    executionReady
  });
  if (!policy.allowed && !reasons.includes(DECISION_CODES.AUTO_STAKE_BLOCKED)) reasons.push(...policy.reason);
  if (!executionReady) reasons.push(DECISION_CODES.EXECUTION_NOT_READY);

  const uniqueReasons = [...new Set(reasons)];
  const allowed = uniqueReasons.length === 0 && policy.allowed && autoGate.ok;
  return {
    ok: true,
    allowed,
    decision: allowed ? 'CONFIRMED' : 'REFUSED',
    code: allowed ? DECISION_CODES.CONFIRMED : uniqueReasons[0] || DECISION_CODES.REFUSED,
    reasons: uniqueReasons,
    checks: policy.checks,
    pair,
    autoGate: { ok: autoGate.ok, expiresAt: autoGate.expiresAt || null }
  };
}
