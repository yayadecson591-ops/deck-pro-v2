import test from 'node:test';
import assert from 'node:assert/strict';
import { decideExecution } from './decision-engine.js';
import { executeTwoLegTransaction } from './execution-engine.js';
import { setAutoStake, clearAutoStake } from './auto-stake.js';
import { registerExecutionAdapter, unregisterExecutionAdapter } from './execution-adapters.js';

const radarOpportunity = {
  eventId: 'radar-event-1',
  market: 'winner',
  expiresAt: Date.now() + 60_000,
  legs: [
    { bookmaker: 'sportybet', selection: 'A', outcome: 'A', price: 2.10, expectedOdds: 2.10, eventId: 'radar-event-1', market: 'winner', stake: 1500, channel: 'authorized_api' },
    { bookmaker: '1xbet', selection: 'B', outcome: 'B', price: 2.10, expectedOdds: 2.10, eventId: 'radar-event-1', market: 'winner', stake: 1500, channel: 'authorized_api' }
  ]
};

test('Radar -> decision -> confirmation -> execution: confirmed path reaches execution gate', async () => {
  const userId = 'radar-flow-confirmed';
  const key = `radar-confirmed-${Date.now()}`;
  clearAutoStake(userId);
  setAutoStake(userId, { enabled: true, confirmationId: 'confirmation-radar-1' });

  const decision = decideExecution({
    userAuthenticated: true,
    userId,
    autoStakeEnabled: true,
    confirmationValid: true,
    pairValid: true,
    executionReady: true,
    legs: radarOpportunity.legs,
    expiresAt: radarOpportunity.expiresAt
  });
  assert.equal(decision.decision, 'CONFIRMED');

  registerExecutionAdapter('sportybet', { authorized: true, documented: true, placeBet: async () => ({ accepted: true, betId: 'sb-1' }) });
  registerExecutionAdapter('1xbet', { authorized: true, documented: true, placeBet: async () => ({ accepted: true, betId: 'xb-1' }) });

  const result = await executeTwoLegTransaction({
    legs: radarOpportunity.legs,
    idempotencyKey: key,
    userId,
    autoStake: true,
    decisionContext: { userAuthenticated: true, autoStakeEnabled: true, confirmationValid: true, pairValid: true, executionReady: true, expiresAt: radarOpportunity.expiresAt }
  });
  assert.equal(result.stage, 'placement');
  assert.equal(result.transaction.decision, 'CONFIRMED');
  assert.equal(result.accepted, 2);

  unregisterExecutionAdapter('sportybet');
  unregisterExecutionAdapter('1xbet');
  clearAutoStake(userId);
});

test('Radar -> refusal: changed odds stop before execution', async () => {
  const userId = 'radar-flow-odds-refused';
  clearAutoStake(userId);
  setAutoStake(userId, { enabled: true, confirmationId: 'confirmation-radar-2' });
  const legs = radarOpportunity.legs.map((leg, index) => index === 0 ? { ...leg, currentPrice: 2.00 } : leg);
  const decision = decideExecution({ userAuthenticated: true, userId, autoStakeEnabled: true, confirmationValid: true, pairValid: true, executionReady: true, legs, expiresAt: radarOpportunity.expiresAt });
  assert.equal(decision.decision, 'REFUSED');
  assert.equal(decision.code, 'ODDS_CHANGED');
  clearAutoStake(userId);
});

test('Radar -> refusal: expired opportunity cannot be confirmed', () => {
  const userId = 'radar-flow-expired';
  clearAutoStake(userId);
  setAutoStake(userId, { enabled: true, confirmationId: 'confirmation-radar-3' });
  const decision = decideExecution({ userAuthenticated: true, userId, autoStakeEnabled: true, confirmationValid: true, pairValid: true, executionReady: true, legs: radarOpportunity.legs, expiresAt: 1000, now: 1001 });
  assert.equal(decision.decision, 'REFUSED');
  assert.equal(decision.code, 'EXPIRED');
  clearAutoStake(userId);
});

test('Radar -> refusal: disabled Mise Auto blocks automatic execution', async () => {
  const userId = 'radar-flow-auto-disabled';
  const key = `radar-disabled-${Date.now()}`;
  clearAutoStake(userId);
  const decision = decideExecution({ userAuthenticated: true, userId, autoStakeEnabled: true, confirmationValid: true, pairValid: true, executionReady: true, legs: radarOpportunity.legs });
  assert.equal(decision.decision, 'REFUSED');
  assert.equal(decision.code, 'AUTO_STAKE_BLOCKED');
  const result = await executeTwoLegTransaction({ legs: radarOpportunity.legs, idempotencyKey: key, userId, autoStake: true, decisionContext: { userAuthenticated: true, autoStakeEnabled: true, confirmationValid: true, pairValid: true, executionReady: true } });
  assert.equal(result.ok, false);
  assert.equal(result.code, 'AUTO_STAKE_DISABLED');
});
