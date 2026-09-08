import test from 'node:test';
import assert from 'node:assert/strict';
import { autoStakeStatus, setAutoStake, assertAutoStakeAllowed, clearAutoStake } from './auto-stake.js';

test('Mise Auto est désactivée par défaut', () => {
  const user = `test-${crypto.randomUUID()}`;
  assert.equal(autoStakeStatus(user).enabled, false);
  assert.equal(assertAutoStakeAllowed(user).ok, false);
});

test('activation exige une confirmation', () => {
  const user = `test-${crypto.randomUUID()}`;
  const denied = setAutoStake(user, { enabled: true });
  assert.equal(denied.ok, false);
  assert.equal(denied.code, 'AUTO_STAKE_CONFIRMATION_REQUIRED');
});

test('activation confirmée autorise temporairement la Mise Auto', () => {
  const user = `test-${crypto.randomUUID()}`;
  const enabled = setAutoStake(user, { enabled: true, confirmationId: crypto.randomUUID() });
  assert.equal(enabled.ok, true);
  assert.equal(assertAutoStakeAllowed(user).ok, true);
  clearAutoStake(user, 'test');
  assert.equal(assertAutoStakeAllowed(user).ok, false);
});

test('désactivation bloque immédiatement les actions sensibles', () => {
  const user = `test-${crypto.randomUUID()}`;
  setAutoStake(user, { enabled: true, confirmationId: crypto.randomUUID() });
  setAutoStake(user, { enabled: false });
  assert.equal(assertAutoStakeAllowed(user).code, 'AUTO_STAKE_DISABLED');
});
