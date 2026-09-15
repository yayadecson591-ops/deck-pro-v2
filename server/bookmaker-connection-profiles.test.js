import test from 'node:test';
import assert from 'node:assert/strict';
import { getBookmakerConnectionProfile, listBookmakerConnectionProfiles, validateCredentialShape } from './bookmaker-connection-profiles.js';

test('every Deck Pro bookmaker has exactly one connection profile', () => {
  const profiles = listBookmakerConnectionProfiles();
  assert.equal(profiles.length, 18);
  for (const p of profiles) {
    assert.ok(p.slug);
    assert.ok(p.name);
    assert.ok(Array.isArray(p.fields));
    assert.ok(p.fields.length >= 1);
  }
});

test('1xBet uses token-only UI profile', () => {
  const p = getBookmakerConnectionProfile('1xbet');
  assert.deepEqual(p.fields.map(x => x.key), ['accessToken']);
  assert.equal(validateCredentialShape('1xbet', {}).ok, false);
  assert.equal(validateCredentialShape('1xbet', { accessToken: 'x' }).ok, true);
});

test('betPawa uses account number and PIN profile', () => {
  const p = getBookmakerConnectionProfile('betpawa.cm');
  assert.deepEqual(p.fields.map(x => x.key), ['identifier', 'pin']);
  assert.equal(validateCredentialShape('betpawa.cm', { identifier: '237600000000' }).ok, false);
  assert.equal(validateCredentialShape('betpawa.cm', { identifier: '237600000000', pin: '1234' }).ok, true);
});
