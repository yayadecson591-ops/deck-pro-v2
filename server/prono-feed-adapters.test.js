import test from 'node:test';
import assert from 'node:assert/strict';
import { PRONO_FEED_ADAPTERS, pronoFeedAdapterStatus, fetchRealPronoFeed, registerPronoFeedAdapter } from './prono-feed-adapters.js';

test('sports feed catalog has real provider contracts',()=>{
  assert.ok(PRONO_FEED_ADAPTERS.oddspapi);
  assert.ok(PRONO_FEED_ADAPTERS.sportradar);
  assert.ok(PRONO_FEED_ADAPTERS.sportsapi365);
  assert.equal(pronoFeedAdapterStatus('oddspapi').ready,false);
});

test('real feed stays fail-closed without credential',async()=>{
  const r=await fetchRealPronoFeed({adapterId:'oddspapi'});
  assert.equal(r.ok,false);
  assert.equal(r.code,'FEED_CREDENTIAL_REQUIRED');
});

test('registered adapter is callable only after explicit registration',async()=>{
  registerPronoFeedAdapter('oddspapi',{fetch:async()=>({fixtures:[]})});
  const previous=process.env.ODDSPAPI_API_KEY;
  process.env.ODDSPAPI_API_KEY='test-key';
  const r=await fetchRealPronoFeed({adapterId:'oddspapi',request:{type:'fixtures'}});
  assert.equal(r.ok,true);
  assert.deepEqual(r.data,{fixtures:[]});
  if(previous===undefined) delete process.env.ODDSPAPI_API_KEY; else process.env.ODDSPAPI_API_KEY=previous;
});
