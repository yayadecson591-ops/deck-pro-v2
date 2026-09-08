// Production feed registry. Credentials/adapters are supplied separately through
// authorized provider integrations; no provider response is fabricated here.
export const REAL_FEED_CATEGORIES=Object.freeze({
  SPORTS_DATA:['fixtures','results','team_stats','player_stats','live_events','lineups','injuries','weather','market_odds'],
  HUMAN_PRONOS:['tipster_picks','tipster_history','roi','hit_rate','confidence','consensus'],
  AI_PRONOS:['model_probability','model_pick','model_history','model_calibration'],
  MARKET:['opening_odds','current_odds','odds_movement','market_consensus']
});

export const REAL_FEED_PROVIDERS=Object.freeze([
  {id:'sportradar',name:'Sportradar',category:'sports_data',mode:'authorized_api',configured:false},
  {id:'bettingexpert',name:'BettingExpert',category:'human_pronos',mode:'authorized_feed_or_import',configured:false},
  {id:'olbg',name:'OLBG',category:'human_pronos',mode:'authorized_feed_or_import',configured:false},
  {id:'turingstats',name:'TuringStats',category:'ai_pronos',mode:'authorized_feed_or_import',configured:false},
  {id:'sportsapi365',name:'SportsAPI365',category:'sports_data',mode:'authorized_api',configured:false}
]);

export function realFeedRegistryStatus(){return{ok:true,categories:REAL_FEED_CATEGORIES,providers:REAL_FEED_PROVIDERS.map(p=>({...p,ready:p.configured===true}))}};
