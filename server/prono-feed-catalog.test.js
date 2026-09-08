import test from 'node:test';
import assert from 'node:assert/strict';
import { listPronoFeedCatalog, getPronoFeedCatalog } from './prono-feed-catalog.js';

test('catalog includes human, statistical and market sources',()=>{
 const catalog=listPronoFeedCatalog();
 assert.ok(catalog.some(x=>x.kind==='human_tipster'));
 assert.ok(catalog.some(x=>x.kind==='statistical_model'));
 assert.ok(catalog.some(x=>x.kind==='market_consensus'));
});

test('catalog includes multisport licensed data providers',()=>{
 const source=getPronoFeedCatalog('sportradar');
 assert.ok(source);
 assert.ok(source.coverage.length>=5);
 assert.ok(source.capabilities.includes('statistics'));
});
