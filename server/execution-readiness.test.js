import test from 'node:test';
import assert from 'node:assert/strict';
import { executionReadiness, executionPairReadiness } from './execution-readiness.js';

const verified = { channels: { user_token: { enabled:true, verified:true } } };
const connection = { id:'c1', bookmaker_slug:'1xbet', access_channel:'user_token', auto_bet_enabled:true };

test('readiness accepts a persistent connection with a verified execution channel', () => {
  const result = executionReadiness({ connection, strategy:verified, requestedAutoBet:true });
  assert.equal(result.ready,true);
  assert.equal(result.code,'EXECUTION_READY');
});

test('readiness fails closed when the execution contract is not verified', () => {
  const strategy = { channels: { user_token: { enabled:true, verified:false } } };
  const result = executionReadiness({ connection, strategy, requestedAutoBet:true });
  assert.equal(result.ready,false);
  assert.equal(result.code,'EXECUTION_NOT_READY');
  assert.ok(result.reasons.includes('execution_contract_unverified'));
});

test('readiness blocks auto-bet when the saved bookmaker connection is disabled', () => {
  const result = executionReadiness({ connection:{...connection,auto_bet_enabled:false}, strategy:verified, requestedAutoBet:true });
  assert.equal(result.ready,false);
  assert.ok(result.reasons.includes('auto_bet_not_enabled'));
});

test('pair readiness requires exactly two distinct bookmakers', () => {
  const result = executionPairReadiness({
    legs:[{connectionId:'c1',bookmaker:'1xbet'},{connectionId:'c2',bookmaker:'1xbet'}],
    connectionsById:new Map([
      ['c1',{...connection,id:'c1'}],
      ['c2',{...connection,id:'c2'}]
    ]),
    strategies:{'1xbet':verified}
  });
  assert.equal(result.ready,false);
  assert.equal(result.code,'DISTINCT_BOOKMAKERS_REQUIRED');
});

test('pair readiness is ready only when both persistent connections pass the gate', () => {
  const c1 = {...connection,id:'c1',bookmaker_slug:'1xbet'};
  const c2 = {...connection,id:'c2',bookmaker_slug:'sportybet'};
  const result = executionPairReadiness({
    legs:[{connectionId:'c1',bookmaker:'1xbet',autoStake:true},{connectionId:'c2',bookmaker:'sportybet',autoStake:true}],
    connectionsById:new Map([['c1',c1],['c2',c2]]),
    strategies:{'1xbet':verified,'sportybet':verified}
  });
  assert.equal(result.ready,true);
  assert.equal(result.code,'EXECUTION_READY');
});
