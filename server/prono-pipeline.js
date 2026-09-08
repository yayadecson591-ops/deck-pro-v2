// End-to-end Radar Pronos pipeline. External adapters must provide authorized,
// normalized data; this module never fabricates source results or bypasses controls.
import { normalizePronoFeed, getPronoSource } from './prono-sources.js';
import { rankPredictions, generateCoupon } from './prono-engine.js';
import { executionStrategy } from './execution-strategies.js';

export function buildPronoDataset({feeds=[]}={}){
  const predictions=[];
  for(const feed of Array.isArray(feeds)?feeds:[]){
    const source=getPronoSource(feed.sourceId);
    if(!source || !source.enabled || !source.authorized || !source.documented) continue;
    predictions.push(...normalizePronoFeed(feed));
  }
  return predictions;
}

export function buildPronoRanking({feeds=[]}={}){
  return rankPredictions(buildPronoDataset({feeds}));
}

export function buildPronoCoupon({feeds=[],maxSelections=50,minOdds=null,maxOdds=null,bookmaker=null}={}){
  const slug=String(bookmaker||'').trim().toLowerCase();
  if(!slug)return {ok:false,code:'BOOKMAKER_REQUIRED',error:'Bookmaker requis pour générer le coupon.'};
  if(!executionStrategy(slug))return {ok:false,code:'BOOKMAKER_UNSUPPORTED',error:'Bookmaker non supporté.'};
  return generateCoupon({predictions:buildPronoDataset({feeds}),maxSelections,minOdds,maxOdds,bookmaker:slug});
}

export function pronoPipelineStatus(){
  return {ok:true,stages:['sources','normalization','scoring','probability','ranking','selection','coupon','bookmaker','manual_or_auto_execution'],maxSelections:50};
}
