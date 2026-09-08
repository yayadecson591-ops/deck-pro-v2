import test from 'node:test';
import assert from 'node:assert/strict';
import { realFeedRegistryStatus } from './prono-real-feed-registry.js';

test('real feed registry covers sports, human, AI and market data',()=>{
  const s=realFeedRegistryStatus();
  assert.ok(s.categories.SPORTS_DATA.includes('market_odds'));
  assert.ok(s.categories.HUMAN_PRONOS.includes('tipster_history'));
  assert.ok(s.categories.AI_PRONOS.includes('model_calibration'));
  assert.ok(s.categories.MARKET.includes('odds_movement'));
  assert.ok(s.providers.length>=5);
  assert.equal(s.providers.every(p=>p.ready===false),true);
});
