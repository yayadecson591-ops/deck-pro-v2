import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import { decideExecution } from './decision-engine.js';
import { setAutoStake, clearAutoStake } from './auto-stake.js';
import { registerExecutionAdapter, unregisterExecutionAdapter } from './execution-adapters.js';
import { executeTwoLegTransaction } from './execution-engine.js';

const userId='step5-validation-user';
const confirmationId=crypto.randomUUID();
const legs=[{bookmaker:'sportybet',eventId:'E1',marketId:'M1',selection:'A',price:2.1,stake:1500,userToken:'token-a'},{bookmaker:'1xbet',eventId:'E1',marketId:'M1',selection:'B',price:2.1,stake:1500,userToken:'token-b'}];

test('Step 5: confirmed radar opportunity reaches two-leg execution', async()=>{
  await clearAutoStake(userId,'validation-reset');
  const activation=await setAutoStake(userId,{enabled:true,confirmationId,reason:'step5-validation'});
  assert.equal(activation.ok,true);
  const decision=decideExecution({userAuthenticated:true,userId,autoStakeEnabled:true,confirmationValid:true,pairValid:true,executionReady:true,legs});
  assert.equal(decision.allowed,true); assert.equal(decision.code,'CONFIRMED');
  const adapter=async({stake})=>({ok:true,result:{accepted:true,stake}});
  registerExecutionAdapter('sportybet',{authorized:true,documented:true,placeBet:adapter});
  registerExecutionAdapter('1xbet',{authorized:true,documented:true,placeBet:adapter});
  try{
    const result=await executeTwoLegTransaction({legs,idempotencyKey:'step5-validation-'+crypto.randomUUID(),requestId:'step5',userId,autoStake:true,decisionContext:{userAuthenticated:true,autoStakeEnabled:true,confirmationValid:true,pairValid:true,executionReady:true}});
    assert.equal(result.stage,'placement'); assert.equal(result.transaction.decision,'CONFIRMED'); assert.equal(result.accepted,2); assert.equal(result.transaction.reconciliationRequired,false);
  } finally { unregisterExecutionAdapter('sportybet'); unregisterExecutionAdapter('1xbet'); await clearAutoStake(userId,'validation-end'); }
});

test('Step 5: odds change refuses execution',()=>{
 const result=decideExecution({userAuthenticated:true,autoStakeEnabled:false,confirmationValid:false,pairValid:true,executionReady:true,legs:legs.map((x,i)=>i?x:{...x,expectedPrice:2.1,currentPrice:2.0})});
 assert.equal(result.allowed,false); assert.equal(result.code,'ODDS_CHANGED');
});

test('Step 5: expired opportunity refuses execution',()=>{
 const result=decideExecution({userAuthenticated:true,autoStakeEnabled:false,confirmationValid:false,pairValid:true,executionReady:true,legs,expiresAt:100,now:101});
 assert.equal(result.allowed,false); assert.equal(result.code,'EXPIRED');
});

test('Step 5: invalid pair refuses execution',()=>{
 const result=decideExecution({userAuthenticated:true,autoStakeEnabled:false,confirmationValid:false,pairValid:true,executionReady:true,legs:[legs[0]]});
 assert.equal(result.allowed,false); assert.equal(result.code,'PAIR_INVALID');
});

test('Step 5: Mise Auto disabled blocks automatic execution', async()=>{
 await clearAutoStake(userId,'validation-disabled');
 const result=await executeTwoLegTransaction({legs,idempotencyKey:'step5-disabled-'+crypto.randomUUID(),requestId:'step5-disabled',userId,autoStake:true});
 assert.equal(result.ok,false); assert.equal(result.stage,'auto_stake'); assert.equal(result.code,'AUTO_STAKE_DISABLED');
});
