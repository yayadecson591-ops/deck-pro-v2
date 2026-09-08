import test from 'node:test';
import assert from 'node:assert/strict';
import { registerPronoSource, listPronoSources, normalizePronoFeed } from './prono-sources.js';

test('keeps prediction sources fail-closed until authorized and documented',()=>{
  registerPronoSource({id:'example-human',name:'Example Human',type:'human_tipster',sports:['football'],enabled:true,authorized:false,documented:false});
  const source=listPronoSources().find(s=>s.id==='example-human');
  assert.equal(source.ready,false);
});

test('normalizes an enabled source feed',()=>{
  registerPronoSource({id:'example-ai',name:'Example AI',type:'ai_model',sports:['tennis'],enabled:true,authorized:true,documented:true,lastUpdated:'2026-01-01T00:00:00Z'});
  const items=normalizePronoFeed({sourceId:'example-ai',items:[{eventId:'x',probability:.75,odds:1.8}]});
  assert.equal(items.length,1);
  assert.equal(items[0].sourceType,'ai_model');
});
