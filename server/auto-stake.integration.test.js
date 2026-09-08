import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { setAutoStake, assertAutoStakeAllowed, clearAutoStake } from './auto-stake.js';
import { executeTwoLegTransaction } from './execution-engine.js';

test('parcours sécurisé: utilisateur -> activation -> contrôle -> moteur', async () => {
  const userId = `integration-${crypto.randomUUID()}`;
  const confirmationId = crypto.randomUUID();
  clearAutoStake(userId, 'test-start');

  const before = assertAutoStakeAllowed(userId);
  assert.equal(before.ok, false);
  assert.equal(before.code, 'AUTO_STAKE_DISABLED');

  const enabled = setAutoStake(userId, { enabled: true, confirmationId });
  assert.equal(enabled.ok, true);

  const gate = assertAutoStakeAllowed(userId);
  assert.equal(gate.ok, true);

  const result = await executeTwoLegTransaction({
    userId,
    autoStake: true,
    idempotencyKey: `integration-${crypto.randomUUID()}`,
    requestId: crypto.randomUUID(),
    legs: [
      { bookmaker: 'sportybet', selection: 'HOME', stake: 1000, odds: 2.1, channel: 'user_token', userToken: 'integration-token-a' },
      { bookmaker: '1xbet', selection: 'AWAY', stake: 1000, odds: 2.1, channel: 'user_token', userToken: 'integration-token-b' }
    ]
  });

  // The security gate passes, while the execution layer must still fail closed
  // because these test tokens do not represent an authorized adapter contract.
  assert.notEqual(result.code, 'AUTO_STAKE_DISABLED');
  assert.ok(['PREFLIGHT_FAILED', 'BOOKMAKER_ADAPTER_CONTRACT_REQUIRED', 'IDEMPOTENCY_KEY_REQUIRED'].includes(result.code) || result.stage === 'preflight' || result.stage === 'placement');

  clearAutoStake(userId, 'test-end');
  const after = assertAutoStakeAllowed(userId);
  assert.equal(after.ok, false);
  assert.equal(after.code, 'AUTO_STAKE_DISABLED');
});

test('refus automatique: moteur auto sans activation', async () => {
  const userId = `integration-${crypto.randomUUID()}`;
  clearAutoStake(userId, 'test-start');
  const result = await executeTwoLegTransaction({
    userId,
    autoStake: true,
    idempotencyKey: `blocked-${crypto.randomUUID()}`,
    legs: [
      { bookmaker: 'sportybet', selection: 'HOME', stake: 1000, odds: 2.1, channel: 'user_token', userToken: 'x' },
      { bookmaker: '1xbet', selection: 'AWAY', stake: 1000, odds: 2.1, channel: 'user_token', userToken: 'y' }
    ]
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, 'AUTO_STAKE_DISABLED');
});
