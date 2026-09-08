// Radar Pronos: multisource prediction scoring and coupon generation.
// This module deliberately separates prediction research from arbitrage execution.

export const PRONO_SPORTS = Object.freeze([
  'football', 'tennis', 'basketball', 'ice_hockey', 'volleyball',
  'handball', 'baseball', 'rugby', 'table_tennis', 'esports'
]);

export const PRONO_MARKETS = Object.freeze({
  football: ['1x2','double_chance','draw_no_bet','asian_handicap','goals_over_under','btts','corners','team_corners','cards','shots','shots_on_target','player_goals'],
  tennis: ['match_winner','set_winner','games_handicap','games_over_under','sets_over_under','correct_sets','player_games'],
  basketball: ['moneyline','spread','game_total','team_total','quarter_total','half_total','player_points','player_rebounds','player_assists'],
  ice_hockey: ['moneyline','puck_line','game_total','period_total','team_total','player_goals','player_points','shots'],
  volleyball: ['match_winner','set_handicap','sets_over_under','points_handicap','points_over_under'],
  handball: ['moneyline','handicap','goals_over_under','team_total'],
  baseball: ['moneyline','run_line','game_total','team_total','player_strikeouts'],
  rugby: ['moneyline','handicap','points_over_under','team_total'],
  table_tennis: ['match_winner','set_handicap','sets_over_under','points_handicap'],
  esports: ['match_winner','map_handicap','maps_over_under','rounds_over_under']
});

const clamp=(n,min=0,max=100)=>Math.max(min,Math.min(max,n));
const num=(v,fallback=0)=>Number.isFinite(Number(v))?Number(v):fallback;
const normalizeProbability=v=>clamp(num(v),0,1);

function sourceWeight(source={}){
  const track=num(source.sampleSize,0);
  const volumeConfidence=track>=500?1:track>=200?.9:track>=100?.8:track>=50?.65:.45;
  const roiConfidence=clamp((num(source.roi,0)+10)/25,0,1);
  const recentConfidence=clamp(num(source.recentScore,50)/100,0,1);
  const explicitVerified=source.verified===true?1:.65;
  return clamp((volumeConfidence*.3+roiConfidence*.3+recentConfidence*.25+explicitVerified*.15));
}

export function scorePrediction(prediction={}){
  const sources=Array.isArray(prediction.sources)?prediction.sources:[];
  const human=sources.filter(s=>String(s.kind||'').toLowerCase()==='human');
  const ai=sources.filter(s=>['ai','model','statistical'].includes(String(s.kind||'').toLowerCase()));
  const sourceSet=[...sources].filter(Boolean);
  const weighted=(list)=>{
    let total=0,weight=0;
    for(const s of list){const w=sourceWeight(s);const p=normalizeProbability(s.probability);total+=p*w;weight+=w}
    return weight?total/weight:null;
  };
  const humanProb=weighted(human);
  const aiProb=weighted(ai);
  const modelProb=normalizeProbability(prediction.modelProbability);
  const marketProb=normalizeProbability(prediction.marketProbability || (num(prediction.odds)>1?1/num(prediction.odds):0));
  const consensusValues=[humanProb,aiProb,modelProb].filter(v=>v!==null&&v>0);
  const consensus=consensusValues.length?consensusValues.reduce((a,b)=>a+b,0)/consensusValues.length:0;
  const agreement=consensusValues.length>1?clamp(1-(Math.max(...consensusValues)-Math.min(...consensusValues))):0;
  const freshness=clamp(num(prediction.freshnessScore,70)/100);
  const dataQuality=clamp(num(prediction.dataQuality,70)/100);
  const value=clamp((consensus-marketProb)*2+0.5);
  const score=clamp((consensus*.42+agreement*.16+value*.18+freshness*.12+dataQuality*.12)*100);
  return {
    probability:consensus,
    humanProbability:humanProb,
    aiProbability:aiProb,
    marketProbability:marketProb,
    agreement,
    valueScore:value,
    freshness,
    dataQuality,
    score:Math.round(score*100)/100,
    sourceCount:sourceSet.length,
    sourceQuality:sourceSet.length?Math.round(sourceSet.reduce((s,x)=>s+sourceWeight(x),0)/sourceSet.length*100):0
  };
}

export function rankPredictions(predictions=[]){
  return predictions.map((p,index)=>({
    ...p,
    id:String(p.id||`${p.sport||'sport'}-${p.eventId||index}-${p.market||'market'}`),
    scoring:scorePrediction(p)
  })).sort((a,b)=>b.scoring.score-a.scoring.score);
}

function productOdds(selections){return selections.reduce((acc,s)=>acc*num(s.odds,1),1)}

export function generateCoupon({predictions=[],maxSelections=50,minOdds=null,maxOdds=null,bookmaker=null}={}){
  const limit=Math.min(Math.max(Number(maxSelections)||50,1),50);
  const ranked=rankPredictions(predictions).filter(p=>num(p.odds)>1 && p.scoring.probability>0);
  const pool=ranked.slice(0,limit);
  const min=num(minOdds,0);
  const max=maxOdds===null||maxOdds===undefined||maxOdds===''?Infinity:num(maxOdds,Infinity);
  let best=null;
  // Prefer the highest-scoring compact combination that reaches the requested odds range.
  // No filler selections are added merely to reach the 50-selection ceiling.
  for(let size=1;size<=pool.length;size++){
    const candidate=pool.slice(0,size);
    const odds=productOdds(candidate);
    if(odds>=min && odds<=max){best={selections:candidate,totalOdds:odds};break}
    if(odds>max)break;
  }
  if(!best && min>0){
    const selected=[];let odds=1;
    for(const p of pool){if(odds*num(p.odds,1)>max)continue;selected.push(p);odds*=num(p.odds,1);if(odds>=min)break}
    if(odds>=min&&odds<=max)best={selections:selected,totalOdds:odds};
  }
  if(!best)best={selections:pool,totalOdds:productOdds(pool)};
  return {
    ok:true,
    bookmaker:bookmaker?String(bookmaker).trim().toLowerCase():null,
    requested:{maxSelections:limit,minOdds:min||null,maxOdds:Number.isFinite(max)?max:null},
    selectionCount:best.selections.length,
    totalOdds:Math.round(best.totalOdds*10000)/10000,
    selections:best.selections,
    generatedAt:new Date().toISOString(),
    methodology:'multisource_human_ai_statistics_market_value',
    note:best.selections.length<limit?'Fewer than the maximum were selected because the engine does not add low-quality filler selections.':null
  };
}

export function pronoEngineStatus(){
  return {ok:true,sports:PRONO_SPORTS,markets:PRONO_MARKETS,maxSelections:50,ranking:'score_desc',coupon:'configurable_odds_range'};
}
