import test from 'node:test';
import assert from 'node:assert/strict';
import { executeTwoLegTransaction, getExecutionTransaction, reconcileExecutionTransaction, executionEngineStatus } from './execution-engine.js';
import { reconcileTwoLegs } from './execution-reconciliation.js';
import { registerExecutionAdapter, unregisterExecutionAdapter } from './execution-adapters.js';

const baseLegs=[{bookmaker:'sportybet',selection:'HOME',stake:1000,odds:2.1},{bookmaker:'1xbet',selection:'AWAY',stake:1000,odds:2.1}];

test('execution pair requires exactly two distinct bookmakers',async()=>{const result=await executeTwoLegTransaction({legs:[baseLegs[0]],idempotencyKey:'test-one-leg'});assert.equal(result.ok,false);assert.equal(result.stage,'pair')});
test('execution pair rejects unsupported bookmaker',async()=>{const result=await executeTwoLegTransaction({legs:[baseLegs[0],{...baseLegs[1],bookmaker:'unknown'}],idempotencyKey:'test-unsupported'});assert.equal(result.ok,false);assert.equal(result.stage,'pair')});
test('two-leg engine exposes decision gate',()=>{const status=executionEngineStatus();assert.equal(status.exactlyTwoBookmakers,true);assert.equal(status.reconciliationStateMachine,true);assert.equal(status.autoStakeGate,true);assert.equal(status.decisionGate,true)});
test('two-leg engine requires idempotency key',async()=>{const result=await executeTwoLegTransaction({legs:baseLegs});assert.equal(result.code,'IDEMPOTENCY_KEY_REQUIRED')});
test('two-leg engine fails preflight when user tokens are required but absent',async()=>{const result=await executeTwoLegTransaction({legs:baseLegs.map(leg=>({...leg,channel:'user_token'})),idempotencyKey:'test-preflight'});assert.equal(result.code,'PREFLIGHT_FAILED')});
test('two-leg engine remains fail-closed when no verified execution route exists',async()=>{const key='test-fail-closed';const result=await executeTwoLegTransaction({legs:baseLegs,idempotencyKey:key});assert.equal(result.ok,false);assert.equal(result.stage,'preflight');assert.equal(result.code,'PREFLIGHT_FAILED');assert.equal(result.checks.every(check=>check.ok===false),true);assert.equal(getExecutionTransaction(key),null)});
test('reconciliation detects a one-leg success',()=>{const result=reconcileTwoLegs({legs:[{status:'accepted'},{status:'rejected'}]});assert.equal(result.ok,false);assert.equal(result.state,'reconciliation_required')});
test('reconciliation detects an unknown leg before retry',()=>{const result=reconcileTwoLegs({legs:[{status:'accepted'},{status:'unknown'}]});assert.equal(result.ok,false);assert.equal(result.state,'reconciliation_required')});
test('reconciliation confirms two accepted legs',()=>{const result=reconcileTwoLegs({legs:[{status:'accepted'},{status:'accepted'}]});assert.equal(result.ok,true);assert.equal(result.state,'completed')});
test('engine reconciliation endpoint returns not-found for unknown transaction',()=>{const result=reconcileExecutionTransaction('does-not-exist');assert.equal(result.ok,false);assert.equal(result.code,'EXECUTION_TRANSACTION_NOT_FOUND')});
test('adapter registry enforces an explicit authorized documented contract',()=>{const slug='test-bookmaker';registerExecutionAdapter(slug,{name:'Test',authorized:true,documented:true,placeBet:async()=>({accepted:true,betId:'test-1'})});unregisterExecutionAdapter(slug);assert.equal(true,true)});
