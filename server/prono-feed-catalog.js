// Provider catalog for Radar Pronos. This is configuration metadata only;
// credentials and live adapters are supplied separately and must be authorized.
export const PRONO_FEED_CATALOG=Object.freeze([
 {id:'sportradar',kind:'sport_data',coverage:['football','basketball','tennis','ice_hockey','baseball','rugby','volleyball','handball'],capabilities:['fixtures','results','live_events','statistics','historical','odds','probabilities'],access:'licensed_api',priority:10},
 {id:'bettingexpert',kind:'human_tipster',coverage:['football','tennis','basketball','ice_hockey','baseball','rugby','volleyball','handball'],capabilities:['human_tips','tipster_profiles','profitability','win_rate','average_odds','daily_best_bets'],access:'public_feed_or_authorized_adapter',priority:9},
 {id:'olbg',kind:'human_tipster',coverage:['football','tennis','basketball','ice_hockey','baseball','rugby','volleyball','handball'],capabilities:['human_tips','tipster_history','hot_tipsters','consensus','comments'],access:'public_feed_or_authorized_adapter',priority:9},
 {id:'turingstats',kind:'statistical_model',coverage:['football','tennis','basketball','ice_hockey','baseball'],capabilities:['predictions','model_consensus','historical_model_results'],access:'authorized_feed_required',priority:8},
 {id:'sportsapi365',kind:'sport_data',coverage:['football','tennis','basketball','cricket'],capabilities:['fixtures','results','statistics','historical','odds','live'],access:'licensed_api',priority:7},
 {id:'odds_comparison',kind:'market_consensus',coverage:['multi_sport'],capabilities:['prematch_odds','live_odds','market_movement','bookmaker_comparison'],access:'licensed_api',priority:9}
]);

export function listPronoFeedCatalog(){return PRONO_FEED_CATALOG.map(x=>({...x}))}
export function getPronoFeedCatalog(id){return PRONO_FEED_CATALOG.find(x=>x.id===String(id||'').toLowerCase())||null}
