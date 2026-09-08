// Unified product policy for the three user-facing areas.
// PRE_MATCH and LIVE are arbitrage areas; RADAR_PRONOS is prediction-only.
export const DECK_AREAS=Object.freeze({
  PRE_MATCH:Object.freeze({key:'pre-match',label:'PRÉ-MATCH',color:'blue',arbitrage:true,manualHorizonDays:30,autoHorizonDaysMax:7}),
  LIVE:Object.freeze({key:'live',label:'LIVE',color:'red',arbitrage:true,manualHorizonDays:null,autoHorizonDaysMax:null}),
  RADAR_PRONOS:Object.freeze({key:'radar-pronos',label:'RADAR PRONOS',color:'green',arbitrage:false,manualHorizonDays:null,autoHorizonDaysMax:null})
});

export const PRONO_COUPON_POLICY=Object.freeze({
  maxSelections:50,
  minOdds:null,
  maxOdds:null,
  ranking:'profit_desc_then_score_desc',
  fillerSelections:false,
  bookmakerRequired:true,
  manualOrAuto:true,
  sources:['human_tipsters','ai_models','statistical_models','market_consensus','sport_data']
});

export function normalizeArea(area){
  const key=String(area||'').trim().toLowerCase();
  if(key==='pre-match'||key==='prematch'||key==='pre_match')return DECK_AREAS.PRE_MATCH;
  if(key==='live')return DECK_AREAS.LIVE;
  if(key==='radar-pronos'||key==='pronos'||key==='pronostics'||key==='radar_pronos')return DECK_AREAS.RADAR_PRONOS;
  return null;
}

export function validateAutoWindow({area,days}={}){
  const cfg=normalizeArea(area);
  const n=Number(days);
  if(!cfg)return {ok:false,code:'AREA_INVALID',reason:'Zone Deck Pro invalide.'};
  if(cfg.key==='pre-match'){
    if(!Number.isInteger(n)||n<1||n>7)return {ok:false,code:'PREMATCH_AUTO_WINDOW_INVALID',reason:'La Mise Auto pré-match doit couvrir de 1 à 7 jours.'};
    return {ok:true,days:n,maxDays:7};
  }
  if(cfg.key==='live')return {ok:true,days:null,maxDays:null};
  if(cfg.key==='radar-pronos')return {ok:true,days:null,maxDays:null};
  return {ok:false,code:'AREA_UNSUPPORTED',reason:'Zone non supportée.'};
}

export function validateManualHorizon({area,days}={}){
  const cfg=normalizeArea(area);
  if(!cfg)return {ok:false,code:'AREA_INVALID'};
  if(cfg.key==='pre-match'){
    const n=Number(days);
    if(!Number.isInteger(n)||n<1||n>30)return {ok:false,code:'PREMATCH_MANUAL_HORIZON_INVALID',reason:'La mise manuelle pré-match peut aller jusqu’à 30 jours.'};
    return {ok:true,days:n,maxDays:30};
  }
  return {ok:true,days:Number.isFinite(Number(days))?Number(days):null,maxDays:null};
}

export function pronoProductStatus(){
  return {areas:Object.values(DECK_AREAS),couponPolicy:PRONO_COUPON_POLICY};
}
