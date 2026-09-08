import test from 'node:test';
import assert from 'node:assert/strict';
import { validateExecutionPair } from './execution.js';
import { executionAdapterStatus, registerExecutionAdapter, unregisterExecutionAdapter, getExecutionAdapter } from './execution-adapters.js';
import { reconcileTwoLegs } from './execution-reconciliation.js';
import { executionEngineStatus, executeTwoLegTransaction, getExecutionTransaction, reconcileExecutionTransaction } from './execution-engine.js';

const supportedA = 'sportybet';
const supportedB = '1xbet';
const baseLegs = [
  { bookmaker: supportedA, selection: 'home', stake: 1500, odds: 2.1, channel: 'official_api' },
  { bookmaker: supportedB, selection: 'away', stake: 1500, odds: 2.1, channel: 'official_api' }
];

test('execution pair requires exactly two distinct bookmakers', () => {
  assert.equal(validateExecutionPair([{ bookmaker: supportedA }]).ok, false);
  assert.equal(validateExecutionPair([{ bookmaker: supportedA }, { bookmaker: supportedA }]).ok, false);
  assert.deepEqual(validateExecutionPair([{ bookmaker: supportedA }, { bookmaker: supportedB }]), { ok: true, bookmakers: [supportedA, supportedB] });
});

test('execution pair rejects unsupported bookmaker', () => {
  const result = validateExecutionPair([{ bookmaker: supportedA }, { bookmaker: 'unknown-bookmaker' }]);
  assert.equal(result.ok, false);
  assert.equal(result.code, 'BOOKMAKER_UNSUPPORTED');
});

test('two-leg engine exposes lifecycle and reconciliation tracking', () => {
  const status = executionEngineStatus();
  assert.equal(status.exactlyTwoBookmakers, true);
  assert.equal(status.concurrentPlacement, true);
  assert.equal(status.partialFailureIsReported, true);
  assert.equal(status.reconciliationTracking, true);
  assert.equal(status.reconciliationStateMachine, true);
});

test('two-leg engine requires idempotency key', async () => {
  const result = await executeTwoLegTransaction({ legs: baseLegs });
  assert.equal(result.code, 'IDEMPOTENCY_KEY_REQUIRED');
});

test('two-leg engine fails preflight when user tokens are required but absent', async () => {
  const result = await executeTwoLegTransaction({ legs: baseLegs.map(leg => ({ ...leg, channel: 'user_token' })), idempotencyKey: 'test-preflight' });
  assert.equal(result.code, 'PREFLIGHT_FAILED');
});

test('two-leg engine remains fail-closed without an authorized adapter contract', async () => {
  const key = 'test-fail-closed';
  const result = await executeTwoLegTransaction({ legs: baseLegs, idempotencyKey: key });
  assert.equal(result.ok, false);
  assert.equal(result.accepted, 0);
  assert.equal(result.failed, 2);
  assert.equal(result.transaction.status, 'failed');
  assert.equal(result.transaction.legs.length, 2);
  assert.equal(result.transaction.legs.every(leg => leg.status === 'failed'), true);
  assert.equal(result.transaction.reconciliation.state, 'failed');
});

test('two-leg engine replays an existing idempotency transaction', async () => {
  const key = 'test-replay';
  const first = await executeTwoLegTransaction({ legs: baseLegs, idempotencyKey: key });
  const replay = await executeTwoLegTransaction({ legs: baseLegs, idempotencyKey: key });
  assert.equal(replay.replay, true);
  assert.equal(replay.transaction.idempotencyKey, key);
  assert.deepEqual(getExecutionTransaction(key), replay.transaction);
  assert.equal(first.transaction.id, replay.transaction.id);
});

test('reconciliation detects a one-leg success', () => {
  const result = reconcileTwoLegs({ legs: [{ status: 'accepted' }, { status: 'rejected' }] });
  assert.equal(result.ok, false);
  assert.equal(result.state, 'reconciliation_required');
  assert.equal(result.action, 'manual_or_authorized_gateway_reconciliation');
});

test('reconciliation detects an unknown leg before retry', () => {
  const result = reconcileTwoLegs({ legs: [{ status: 'accepted' }, { status: 'unknown' }] });
  assert.equal(result.ok, false);
  assert.equal(result.state, 'reconciliation_required');
});

test('reconciliation confirms two accepted legs', () => {
  assert.deepEqual(reconcileTwoLegs({ legs: [{ status: 'accepted' }, { status: 'accepted' }] }), { ok: true, state: 'completed', action: 'none' });
});

test('engine reconciliation endpoint returns not-found for unknown transaction', () => {
  assert.deepEqual(reconcileExecutionTransaction('missing-reconciliation-key'), { ok: false, code: 'EXECUTION_TRANSACTION_NOT_FOUND' });
});

test('adapter registry enforces an explicit authorized documented contract', async () => {
  const slug = 'test-contract';
  registerExecutionAdapter(slug, { name: 'Test Contract', authorized: true, documented: true, async placeBet() { return { accepted: true, betId: 'T-1' }; } });
  assert.deepEqual(executionAdapterStatus(slug), { registered: true, authorized: true, documented: true, ready: true });
  const result = await getExecutionAdapter(slug).placeBet({});
  assert.equal(result.accepted, true);
  assert.equal(result.betId, 'T-1');
  assert.equal(result.status, 'accepted');
  assert.equal(unregisterExecutionAdapter(slug), true);
  assert.equal(executionAdapterStatus(slug).registered, false);
});
