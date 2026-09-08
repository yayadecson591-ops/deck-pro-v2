import test from 'node:test';
import assert from 'node:assert/strict';
import { decideExecution } from './decision-engine.js';
import { setAutoStake, clearAutoStake } from './auto-stake.js';

const legs=[
  {bookmaker:'sportybet',price:2.1,outcome:'A',eventId:'e1',market:'winner'},
  {bookmaker:'1xbet',price:2.1,outcome:'B',eventId:'e1',market:'winner'}
];

test('decision engine confirms only when every gate is valid',()=>{
  const userId='decision-test-user';clearAutoStake(userId);setAutoStake(userId,{enabled:true,confirmationId:'confirm-1'});
  const result=decideExecution({userAuthenticated:true,userId,autoStakeEnabled:true,confirmationValid:true,pairValid:true,executionReady:true,legs});
  assert.equal(result.decision,'CONFIRMED');assert.equal(result.code,'CONFIRMED');assert.equal(result.allowed,true);clearAutoStake(userId);
});

test('decision refuses when odds moved down',()=>{
  const result=decideExecution({userAuthenticated:true,autoStakeEnabled:true,confirmationValid:true,pairValid:true,executionReady:true,legs:legs.map((x,i)=>i===0?{...x,currentPrice:2.0}:x)});
  assert.equal(result.decision,'REFUSED');assert.equal(result.code,'ODDS_CHANGED');assert.ok(result.reasons.includes('ODDS_CHANGED'));
});

test('decision refuses expired opportunity',()=>{
  const result=decideExecution({userAuthenticated:true,autoStakeEnabled:true,confirmationValid:true,pairValid:true,executionReady:true,expiresAt:1000,now:1001,legs});
  assert.equal(result.decision,'REFUSED');assert.equal(result.code,'EXPIRED');
});

test('decision refuses when pair is invalid',()=>{
  const result=decideExecution({userAuthenticated:true,autoStakeEnabled:true,confirmationValid:true,pairValid:true,executionReady:true,legs:[legs[0]]});
  assert.equal(result.decision,'REFUSED');assert.equal(result.code,'PAIR_INVALID');
});

test('decision refuses automatic execution without valid Mise Auto',()=>{
  const userId='decision-disabled-user';clearAutoStake(userId);
  const result=decideExecution({userAuthenticated:true,userId,autoStakeEnabled:true,confirmationValid:true,pairValid:true,executionReady:true,legs});
  assert.equal(result.decision,'REFUSED');assert.equal(result.code,'AUTO_STAKE_BLOCKED');clearAutoStake(userId);
});
