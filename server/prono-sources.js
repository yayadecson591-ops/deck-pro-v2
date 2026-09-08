// Registry for real prediction sources. It stores source metadata and normalized feeds;
// adapters must be wired only to documented/authorized access routes.
export const PRONO_SOURCE_TYPES=Object.freeze(['human_tipster','ai_model','statistical_model','market_consensus','sport_data']);

const sources=new Map();

export function registerPronoSource(source={}){
  const id=String(source.id||'').trim().toLowerCase();
  const type=String(source.type||'').trim().toLowerCase();
  if(!id||!PRONO_SOURCE_TYPES.includes(type))return{ok:false,code:'PRONO_SOURCE_INVALID'};
  const entry={
    id,name:String(source.name||id),type,
    authorized:source.authorized===true,
    documented:source.documented===true,
    enabled:source.enabled!==false,
    sports:Array.isArray(source.sports)?source.sports.map(String):[],
    markets:Array.isArray(source.markets)?source.markets.map(String):[],
    sampleSize:Number(source.sampleSize||0),roi:Number(source.roi||0),recentScore:Number(source.recentScore||0),
    lastUpdated:source.lastUpdated||null
  };
  sources.set(id,entry); return{ok:true,source:entry};
}

export function listPronoSources(){return [...sources.values()].map(s=>({...s,ready:s.enabled&&s.authorized&&s.documented}))}
export function getPronoSource(id){return sources.get(String(id||'').trim().toLowerCase())||null}
export function normalizePronoFeed({sourceId,items=[]}={}){
  const source=getPronoSource(sourceId);
  if(!source||!source.enabled)return[];
  return (Array.isArray(items)?items:[]).map(item=>({
    ...item,sourceId:source.id,sourceName:source.name,sourceType:source.type,
    probability:Number.isFinite(Number(item.probability))?Number(item.probability):null,
    odds:Number.isFinite(Number(item.odds))?Number(item.odds):null,
    publishedAt:item.publishedAt||source.lastUpdated||null
  })).filter(item=>item.probability!==null||item.odds!==null);
}

export function pronoSourceStatus(){return{types:PRONO_SOURCE_TYPES,sources:listPronoSources()}};
