// Real sports-feed adapters. No credentials are embedded in source control.
const adapters=new Map();

export const PRONO_FEED_ADAPTERS=Object.freeze({
  oddspapi:{providerId:'oddspapi',envKey:'ODDSPAPI_API_KEY',baseUrl:'https://v4.oddspapi.io',capabilities:['sports','fixtures','odds','live_odds','historical_odds','line_movement','player_props']},
  sportradar:{providerId:'sportradar',envKey:'SPORTRADAR_API_KEY',baseUrl:null,capabilities:['sports','fixtures','statistics','live_events','odds','historical']},
  sportsapi365:{providerId:'sportsapi365',envKey:'SPORTSAPI365_API_KEY',baseUrl:null,capabilities:['fixtures','results','statistics','odds','live']}
});

export function registerPronoFeedAdapter(id,adapter){
  if(!id || !adapter || typeof adapter.fetch!=='function') throw new Error('Invalid prono feed adapter');
  adapters.set(String(id).toLowerCase(),adapter);
  return adapter;
}

export function getPronoFeedAdapter(id){return adapters.get(String(id||'').toLowerCase())||null;}

export function listPronoFeedAdapters(){return [...adapters.keys()];}

export function pronoFeedAdapterStatus(id){
  const spec=PRONO_FEED_ADAPTERS[String(id||'').toLowerCase()];
  const adapter=getPronoFeedAdapter(id);
  const configured=Boolean(process.env[spec?.envKey||'']);
  return {providerId:spec?.providerId||String(id||''),configured,registered:Boolean(adapter),ready:Boolean(spec&&configured&&adapter)};
}

export async function fetchRealPronoFeed({adapterId,request={}}={}){
  const spec=PRONO_FEED_ADAPTERS[String(adapterId||'').toLowerCase()];
  if(!spec)return {ok:false,code:'FEED_ADAPTER_UNSUPPORTED'};
  if(!process.env[spec.envKey])return {ok:false,code:'FEED_CREDENTIAL_REQUIRED',providerId:spec.providerId};
  const adapter=getPronoFeedAdapter(adapterId);
  if(!adapter)return {ok:false,code:'FEED_ADAPTER_NOT_REGISTERED',providerId:spec.providerId};
  const result=await adapter.fetch({request,apiKey:process.env[spec.envKey],spec});
  return {ok:true,providerId:spec.providerId,data:result};
}

export function pronoFeedAdapterCatalog(){return Object.values(PRONO_FEED_ADAPTERS).map(spec=>({...spec,configured:Boolean(process.env[spec.envKey]),registered:adapters.has(spec.providerId)}));}
