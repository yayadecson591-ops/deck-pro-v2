import crypto from 'crypto';
import { validateExecutionPair, validateAuthorizedOrder, placeAuthorizedBet } from './execution.js';

const DEFAULT_TTL_MS = Number(process.env.EXECUTION_IDEMPOTENCY_TTL_MS || 10 * 60 * 1000);
const transactions = new Map();

function now() { return Date.now(); }
function txId() { return crypto.randomUUID(); }
function keyOf(value) { return String(value || '').trim(); }
function prune() {
  const cutoff = now() - DEFAULT_TTL_MS;
  for (const [key, value] of transactions) {
    if (value.createdAt < cutoff) transactions.delete(key);
  }
}

export function executionEngineStatus() {
  prune();
  return {
    ok: true,
    mode: 'two-leg-transaction',
    exactlyTwoBookmakers: true,
    idempotency: true,
    concurrentPlacement: true,
    partialFailureIsReported: true,
    inFlight: [...transactions.values()].filter(x => x.status === 'running').length
  };
}

export function getExecutionTransaction(idempotencyKey) {
  prune();
  const key = keyOf(idempotencyKey);
  if (!key) return null;
  return transactions.get(key) || null;
}

export async function executeTwoLegTransaction({ legs, idempotencyKey, requestId, preflightContext = {} }) {
  prune();
  const key = keyOf(idempotencyKey);
  if (!key) return { ok: false, stage: 'request', code: 'IDEMPOTENCY_KEY_REQUIRED' };

  const existing = transactions.get(key);
  if (existing) {
    return { ok: existing.status === 'completed', replay: true, transaction: existing };
  }

  const pair = validateExecutionPair(legs);
  if (!pair.ok) return { ok: false, stage: 'pair', validation: pair };

  const checks = legs.map(leg => validateAuthorizedOrder({
    ...leg,
    availableBalance: preflightContext[leg.bookmaker]?.availableBalance ?? leg.availableBalance,
    maxStake: preflightContext[leg.bookmaker]?.maxStake ?? leg.maxStake,
    expectedOdds: preflightContext[leg.bookmaker]?.expectedOdds ?? leg.expectedOdds,
    odds: preflightContext[leg.bookmaker]?.odds ?? leg.odds
  }));
  if (!checks.every(x => x.ok)) {
    return { ok: false, stage: 'preflight', code: 'PREFLIGHT_FAILED', pair, checks };
  }

  const transaction = {
    id: txId(),
    requestId: keyOf(requestId) || txId(),
    idempotencyKey: key,
    createdAt: now(),
    status: 'running',
    bookmakers: pair.bookmakers,
    legs: legs.map((leg, index) => ({
      index,
      bookmaker: pair.bookmakers[index],
      stake: checks[index].stake,
      odds: checks[index].odds,
      selection: String(leg.selection || ''),
      status: 'pending'
    }))
  };
  transactions.set(key, transaction);

  try {
    // Both legs start together. This minimizes the exposure window between the
    // two complementary bets. The adapters themselves remain fail-closed.
    const results = await Promise.all(legs.map((leg, index) => placeAuthorizedBet({
      bookmaker: leg.bookmaker,
      selection: leg.selection,
      stake: checks[index].stake,
      idempotencyKey: `${key}:${index}`,
      userToken: leg.userToken,
      channel: leg.channel
    })));

    transaction.legs = transaction.legs.map((leg, index) => ({
      ...leg,
      status: results[index]?.ok ? 'accepted' : 'failed',
      result: results[index]
    }));
    transaction.completedAt = now();
    transaction.status = results.every(x => x?.ok) ? 'completed' : 'partial_failure';
    transaction.ok = transaction.status === 'completed';
    return { ok: transaction.ok, stage: 'placement', transaction };
  } catch (error) {
    transaction.completedAt = now();
    transaction.status = 'failed';
    transaction.ok = false;
    transaction.error = String(error?.message || error);
    return { ok: false, stage: 'placement', transaction };
  }
}
