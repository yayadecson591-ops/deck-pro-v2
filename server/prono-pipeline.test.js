import test from 'node:test';
import assert from 'node:assert/strict';
import { registerPronoSource } from './prono-sources.js';
import { buildPronoDataset, buildPronoRanking, buildPronoCoupon, pronoPipelineStatus } from './prono-pipeline.js';

registerPronoSource({id:'pipeline-human',name:'Pipeline Human',type:'human_tipster',enabled:true,authorized:true,documented:true,sports:['football'],sampleSize:500,roi:8,recentScore:90});
registerPronoSource({id:'pipeline-ai',name:'Pipeline AI',type:'ai_model',enabled:true,authorized:true,documented:true,sports:['football'],sampleSize:1000,roi:5,recentScore:92});

const feeds=[
 {sourceId:'pipeline-human',items:[{id:'m1',sport:'football',eventId:'e1',market:'1x2',selection:'home',probability:.82,odds:1.9,publishedAt:'2026-01-01T08:00:00Z'}]},
 {sourceId:'pipeline-ai',items:[{id:'m2',sport:'football',eventId:'e2',market:'btts',selection:'yes',probability:.8,odds:2.1,publishedAt:'2026-01-01T08:01:00Z'}]}
];

test('connects authorized feeds to normalized dataset',()=>{const data=buildPronoDataset({feeds});assert.equal(data.length,2);assert.equal(data[0].sourceType,'human_tipster')});
test('connects dataset to scoring and ranking',()=>{const ranked=buildPronoRanking({feeds});assert.equal(ranked.length,2);assert.ok(ranked.every(x=>Number.isFinite(x.scoring.score))) });
test('connects ranking to coupon with bookmaker and odds range',()=>{const coupon=buildPronoCoupon({feeds,maxSelections:50,minOdds:3.9,maxOdds:4.1,bookmaker:'1xbet'});assert.equal(coupon.ok,true);assert.equal(coupon.bookmaker,'1xbet');assert.ok(coupon.selectionCount<=50);assert.ok(coupon.totalOdds>=3.9&&coupon.totalOdds<=4.1)});
test('pipeline exposes required stages',()=>{const s=pronoPipelineStatus();assert.deepEqual(s.stages,['sources','normalization','scoring','probability','ranking','selection','coupon','bookmaker','manual_or_auto_execution'])});
