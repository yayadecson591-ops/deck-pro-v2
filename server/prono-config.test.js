import test from 'node:test';
import assert from 'node:assert/strict';
import { DECK_AREAS, PRONO_COUPON_POLICY, validateAutoWindow, validateManualHorizon, pronoProductStatus } from './prono-config.js';

test('pre-match manual horizon is up to 30 days',()=>{
  assert.equal(validateManualHorizon({area:'pre-match',days:30}).ok,true);
  assert.equal(validateManualHorizon({area:'pre-match',days:31}).ok,false);
});

test('pre-match automatic horizon is strictly 1 to 7 days',()=>{
  assert.equal(validateAutoWindow({area:'pre-match',days:1}).ok,true);
  assert.equal(validateAutoWindow({area:'pre-match',days:7}).ok,true);
  assert.equal(validateAutoWindow({area:'pre-match',days:8}).ok,false);
});

test('live and radar pronos remain separate areas',()=>{
  assert.equal(DECK_AREAS.LIVE.arbitrage,true);
  assert.equal(DECK_AREAS.PRE_MATCH.color,'blue');
  assert.equal(DECK_AREAS.LIVE.color,'red');
  assert.equal(DECK_AREAS.RADAR_PRONOS.arbitrage,false);
  assert.equal(DECK_AREAS.RADAR_PRONOS.color,'green');
});

test('coupon policy caps selections at 50',()=>{
  assert.equal(PRONO_COUPON_POLICY.maxSelections,50);
  assert.equal(PRONO_COUPON_POLICY.fillerSelections,false);
  assert.equal(pronoProductStatus().couponPolicy.maxSelections,50);
});
