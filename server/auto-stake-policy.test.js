import test from 'node:test';
import assert from 'node:assert/strict';
import { decideAutoStake } from './auto-stake-policy.js';

test('decision finale refuse si une condition manque', () => {
  const result = decideAutoStake({ userAuthenticated:true, autoStakeEnabled:true, confirmationValid:false, pairValid:true, executionReady:true });
  assert.equal(result.allowed, false);
  assert.equal(result.decision, 'DENY');
  assert.deepEqual(result.reason, ['confirmationValid']);
});

test('decision finale autorise seulement si toutes les conditions sont valides', () => {
  const result = decideAutoStake({ userAuthenticated:true, autoStakeEnabled:true, confirmationValid:true, pairValid:true, executionReady:true });
  assert.equal(result.allowed, true);
  assert.equal(result.decision, 'ALLOW');
  assert.deepEqual(result.reason, []);
});
