import test from 'node:test';
import assert from 'node:assert/strict';
import { scorePrediction, rankPredictions, generateCoupon, pronoEngineStatus } from './prono-engine.js';

test('scores human and AI consensus with market value',()=>{
  const scoring=scorePrediction({odds:2,modelProbability:.78,freshnessScore:90,dataQuality:90,sources:[
    {kind:'human',probability:.8,sampleSize:500,roi:8,recentScore:90,verified:true},
    {kind:'human',probability:.76,sampleSize:300,roi:6,recentScore:88,verified:true},
    {kind:'ai',probability:.79,sampleSize:1000,roi:5,recentScore:92,verified:true}
  ]});
  assert.ok(scoring.score>60);
  assert.ok(scoring.probability>.7);
  assert.ok(scoring.valueScore>0);
});

test('ranks best selections first',()=>{
  const ranked=rankPredictions([
    {id:'weak',odds:1.5,modelProbability:.55,sources:[{kind:'human',probability:.55,sampleSize:20}]},
    {id:'strong',odds:2,modelProbability:.8,sources:[{kind:'human',probability:.82,sampleSize:500,roi:8,verified:true},{kind:'ai',probability:.8,sampleSize:500}]}
  ]);
  assert.equal(ranked[0].id,'strong');
});

test('caps coupon selections at 50 and respects odds interval when possible',()=>{
  const predictions=Array.from({length:60},(_,i)=>({id:`p${i}`,odds:1.15,modelProbability:.8,freshnessScore:90,dataQuality:90,sources:[{kind:'human',probability:.8,sampleSize:500,roi:5,verified:true}]}));
  const coupon=generateCoupon({predictions,maxSelections:50,minOdds:7,maxOdds:8,bookmaker:'sportybet'});
  assert.equal(coupon.bookmaker,'sportybet');
  assert.ok(coupon.selectionCount<=50);
  assert.ok(coupon.totalOdds>=7&&coupon.totalOdds<=8);
});

test('does not invent filler selections',()=>{
  const coupon=generateCoupon({predictions:[{id:'a',odds:2,modelProbability:.9,sources:[{kind:'ai',probability:.9,sampleSize:500}]}],maxSelections:50,minOdds:7,maxOdds:8});
  assert.equal(coupon.selectionCount,1);
});

test('engine exposes multisport and 50 selection cap',()=>{
  const status=pronoEngineStatus();
  assert.ok(status.sports.includes('football'));
  assert.ok(status.sports.includes('tennis'));
  assert.equal(status.maxSelections,50);
});
