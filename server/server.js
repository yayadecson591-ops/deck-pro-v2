import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import accountRouter, { userAuth } from './account-api.js';
import { dbStatus } from './db/index.js';
import { resolveBookmakerAccess } from './execution-access.js';
import { executionCapabilities, executionOnboarding, executionProviderAdapters, validateExecutionPair, validateAuthorizedOrder, placeAuthorizedBet } from './execution.js';
import { executionEngineStatus, executeTwoLegTransaction, getExecutionTransaction, reconcileExecutionTransaction } from './execution-engine.js';
import { relayRole, relayExecutionAllowed, relayStatus } from './relay.js';

const app=express();
const PORT=Number(process.env.PORT||10000);
const DATA_DIR=process.env.DATA_DIR||'./data';
const ORIGINS=(process.env.ALLOWED_ORIGINS||'*').split(',').map(x=>x.trim()).filter(Boolean);
const API_KEY=process.env.ODDSPAPI_API_KEY||'';
const OWNER_CODE=String(process.env.OWNER_CODE||'').trim();
const OWNER_SALT=process.env.OWNER_CODE_SALT||'';
const OWNER_HASH=process.env.OWNER_CODE_HASH||'';
const OWNER_SECRET=process.env.OWNER_TOKEN_SECRET||'';
const BOOKMAKERS=(process.env.BOOKMAKERS||'sportybet,betmomo,premierbet,betpawa.cm,1xbet,1xwin,afropari,betclic,yellowbet,22bet,pmuc,supergooal,betwinner,melbet,bettomax,paripesa,onebet,betsson').split(',').map(x=>x.trim()).filter(Boolean);
const ODDS_BASE='https://api.oddspapi.io/v4';
fs.mkdirSync(DATA_DIR,{recursive:true});
app.disable('x-powered-by');
app.use(cors({origin:(o,cb)=>!o||ORIGINS.includes('*')||ORIGINS.includes(o)?cb(null,true):cb(new Error('Origin non autorisée'))}));
app.use(express.json({limit:'256kb'}));
app.use((req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('Cache-Control','no-store');res.setHeader('X-Deck-Relay-Role',relayRole());next()});
app.use(accountRouter);
const effectiveSalt=OWNER_SALT||'deck-pro-owner-v1';
const effectiveHash=OWNER_HASH||(OWNER_CODE?crypto.createHash('sha256').update(effectiveSalt+OWNER_CODE).digest('hex'):'');
const effectiveSecret=OWNER_SECRET||(effectiveHash?crypto.createHash('sha256').update('deck-pro-token-v1'+effectiveHash).digest('hex'):'');
const hash=(code,salt=effectiveSalt)=>crypto.createHash('sha256').update(String(salt)+String(code)).digest('hex');
const token=(device='')=>{const p=Buffer.from(JSON.stringify({role:'owner',exp:Date.now()+2592000000,did:device})).toString('base64url');return p+'.'+crypto.createHmac('sha256',effectiveSecret).update(p).digest('base64url')};
function auth(req,res,next){const t=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');try{if(!effectiveSecret||!t)throw 0;const [p,s]=t.split('.');const e=crypto.createHmac('sha256',effectiveSecret).update(p).digest('base64url');const x=JSON.parse(Buffer.from(p,'base64url').toString());if(s!==e||x.role!=='owner'||Number(x.exp)<=Date.now())throw 0;req.owner=x;next()}catch{return res.status(401).json({ok:false,error:'Activation propriétaire requise.'})}}
const oddsCache=new Map();
const ODDS_CACHE_TTL_MS=Number(process.env.ODDS_CACHE_TTL_MS||120000);
function cacheKey(pathname,params){return pathname+'?'+new URLSearchParams({...params}).toString()}
function getCached(key){const e=oddsCache.get(key);if(!e)return null;if(Date.now()>e.exp)return null;return e.data}
function setCached(key,data,ttl=ODDS_CACHE_TTL_MS){oddsCache.set(key,{data,exp:Date.now()+ttl,saved:Date.now()});if(oddsCache.size>200){const first=oddsCache.keys().next().value;oddsCache.delete(first)}}
async function oddsPapi(pathname,params={}){
  if(!API_KEY)throw Object.assign(new Error('Source live OddsPapi non configurée (ODDSPAPI_API_KEY).'),{status:503,code:'ODDSPAPI_NOT_CONFIGURED'});
  const key=cacheKey(pathname,params);
  const hit=getCached(key);
  if(hit!==null)return hit;
  const q=new URLSearchParams({apiKey:API_KEY,language:'en',...params});
  const r=await fetch(`${ODDS_BASE}${pathname}?${q}`,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(15000)});
  const text=await r.text();
  let data;try{data=JSON.parse(text)}catch{data={error:text.slice(0,300)}}
  if(!r.ok){
    const stale=oddsCache.get(key);
    if(stale&&(r.status===429||r.status===503))return stale.data;
    const msg=typeof data?.message==='string'?data.message:(typeof data?.error==='string'?data.error:(data?.error?.message||`OddsPapi HTTP ${r.status}`));
    throw Object.assign(new Error(String(msg)),{status:r.status,code:r.status===429?'ODDSPAPI_RATE_LIMIT':'ODDSPAPI_ERROR'});
  }
  setCached(key,data);
  return data;
}
function apiFail(res,e){const msg=typeof e?.message==='string'?e.message:(typeof e==='string'?e:'Source live indisponible.');return res.status(e?.status||502).json({ok:false,error:String(msg),code:e?.code||'LIVE_SOURCE_ERROR'})}
function bookmakerLogo(x){return x?.logo||x?.logoUrl||x?.logoURL||x?.image||x?.icon||x?.iconUrl||null}
function normalizeLeg(l){return{bookmaker:String(l.slug||l.bookmaker||''),price:Number(l.price??l.odds),outcome:String(l.outcome||l.selection||''),market:String(l.market||l.marketName||''),line:l.line??null,fixtureId:String(l.fixtureId||l.eventId||''),eventId:String(l.eventId||l.fixtureId||'')}}
function buildArbitrage(legs,total,step=0.01){const clean=legs.map(normalizeLeg).filter(l=>l.bookmaker&&Number.isFinite(l.price)&&l.price>1&&l.outcome);if(clean.length<2)return{valid:false,reason:'Il faut au moins deux sélections valides.'};const eventIds=[...new Set(clean.map(x=>x.eventId).filter(Boolean))];const markets=[...new Set(clean.map(x=>`${x.market}|${x.line??''}`))];if(eventIds.length!==1||markets.length!==1)return{valid:false,reason:'Marchés non comparables.'};const outcomes=[...new Set(clean.map(x=>x.outcome.toLowerCase()))];if(outcomes.length!==clean.length)return{valid:false,reason:'Sélections dupliquées.'};const inv=clean.reduce((s,l)=>s+(1/l.price),0);if(!(inv<1))return{valid:false,reason:'Pas d arbitrage sans perte.',impliedProbability:inv};const raw=clean.map(l=>total*(1/l.price)/inv);const stakes=raw.map(x=>Math.round(x/step)*step);const sum=stakes.reduce((a,b)=>a+b,0);if(Math.abs(sum-total)>1e-9){const delta=total-sum;const idx=stakes.reduce((best,_,i)=>raw[i]>raw[best]?i:best,0);stakes[idx]=Math.max(0,Math.round((stakes[idx]+delta)/step)*step)}const returns=clean.map((l,i)=>stakes[i]*l.price);const minReturn=Math.min(...returns);const profit=minReturn-total;return{valid:profit>=-1e-9,impliedProbability:inv,marginPct:(1-inv)*100,totalStake:total,minimumReturn:minReturn,profit,yieldPct:(profit/total)*100,legs:clean.map((l,i)=>({...l,stake:stakes[i],grossReturn:returns[i]})),rounded:true,step}}
async function hydrateExecutionLegs(userId,legs,autoStake=false){
  if(!Array.isArray(legs)||legs.length!==2)return{ok:false,code:'EXACTLY_TWO_BOOKMAKERS_REQUIRED'};
  const hydrated=[];
  for(const leg of legs){
    const connectionId=String(leg?.connectionId||'').trim();
    if(!connectionId)return{ok:false,code:'BOOKMAKER_CONNECTION_REQUIRED',bookmaker:String(leg?.bookmaker||'')};
    const access=await resolveBookmakerAccess({userId,connectionId,bookmaker:leg.bookmaker});
    if(!access.ok)return access;
    if(autoStake&&!access.autoBetEnabled)return{ok:false,code:'BOOKMAKER_AUTO_BET_DISABLED',bookmaker:access.bookmaker,connectionId:access.connectionId};
    const channel=String(leg.channel||access.channel||'').trim();
    const next={...leg,channel,connectionId:access.connectionId};
    if(channel==='user_token')next.userToken=access.token||'';
    hydrated.push(next);
  }
  return{ok:true,legs:hydrated};
}
app.get('/health',async(req,res)=>res.json({ok:true,service:'deck-pro-server',version:'V130',status:'online',uptimeSec:Math.floor(process.uptime()),relay:await relayStatus(),executionEngine:executionEngineStatus()}));
app.get('/api/system/relay-status',async(req,res)=>res.json({ok:true,version:'V130',relay:await relayStatus()}));
app.get('/api/system/readiness',(req,res)=>{
  const writable=(()=>{try{const f=path.join(DATA_DIR,'.probe');fs.writeFileSync(f,'ok');fs.unlinkSync(f);return true}catch{return false}})();
  const db=dbStatus();
  const checks={oddsPapi:!!API_KEY,ownerAuth:!!effectiveHash&&!!effectiveSecret,dataWritable:writable,nodeVersion:Number(process.versions.node.split('.')[0])>=20,database:!!db.configured,tokenVault:!!db.tokenVaultConfigured};
  const ready=checks.oddsPapi&&checks.ownerAuth&&checks.dataWritable&&checks.nodeVersion;
  const operational=ready&&checks.database&&checks.tokenVault;
  res.status(ready?200:503).json({ok:ready,ready,operational,checks,db,bookmakers:BOOKMAKERS,message:operational?'Système opérationnel (API + auth + base).':(!checks.database?'Serveur en ligne mais DATABASE_URL non branchée : comptes/mise auto indisponibles.':'Vérifier OddsPapi / auth propriétaire / disque.')});
});
app.post('/api/activate',(req,res)=>{const code=String(req.body?.code||'').trim().toUpperCase();const deviceId=String(req.body?.deviceId||'').trim();if(!effectiveHash||!effectiveSecret)return res.status(503).json({ok:false,error:'Activation propriétaire non configurée.'});if(!/^\d{4}$/.test(code)||hash(code)!==effectiveHash)return res.status(401).json({ok:false,error:'Code propriétaire incorrect.'});if(!deviceId)return res.status(400).json({ok:false,error:'Identifiant appareil requis.'});res.json({ok:true,role:'owner',deviceId,token:token(deviceId)})});
app.get('/api/activate/verify',auth,(req,res)=>res.json({ok:true,role:'owner'}));
app.get('/api/system/runtime',(req,res)=>{
  const db=dbStatus();
  res.json({ok:true,service:'deck-pro-server',version:'V130',oddsPapi:!!API_KEY,ownerAuth:!!(effectiveHash&&effectiveSecret),database:db,execution:executionEngineStatus(),message:db.configured?'Base connectée — connexions persistantes disponibles.':'DATABASE_URL manquante — lier Postgres (deck-pro-db) au service deck-pro-server sur Render.'});
});
app.get('/api/system/config-check',auth,(req,res)=>res.json({ok:true,checks:{oddsPapi:!!API_KEY,ownerAuth:!!effectiveHash&&!!effectiveSecret},version:'V130'}));
app.get('/api/execution/capabilities',auth,(req,res)=>res.json({ok:true,version:'V130',capabilities:executionCapabilities()}));
app.get('/api/execution/onboarding',auth,(req,res)=>res.json({ok:true,bookmakers:executionOnboarding()}));
app.get('/api/execution/provider-adapters',auth,(req,res)=>res.json({ok:true,adapters:executionProviderAdapters()}));
app.get('/api/execution/engine-status',auth,(req,res)=>res.json({ok:true,engine:executionEngineStatus()}));
app.get('/api/execution/transaction/:idempotencyKey',auth,(req,res)=>{const transaction=getExecutionTransaction(req.params.idempotencyKey);if(!transaction)return res.status(404).json({ok:false});res.json({ok:true,transaction})});
app.post('/api/execution/transaction/:idempotencyKey/reconcile',auth,(req,res)=>{const result=reconcileExecutionTransaction(req.params.idempotencyKey);res.status(result.ok?200:404).json(result)});
app.post('/api/execution/validate-pair',auth,(req,res)=>{const result=validateExecutionPair(req.body?.legs);res.status(result.ok?200:422).json({ok:result.ok,validation:result})});
app.post('/api/execution/preflight',auth,(req,res)=>{const body=req.body||{};const pair=validateExecutionPair(body.legs);if(!pair.ok)return res.status(422).json({ok:false,validation:pair});const checks=(body.legs||[]).map(leg=>validateAuthorizedOrder(leg));res.status(checks.every(x=>x.ok)?200:422).json({ok:checks.every(x=>x.ok),pair,checks})});
app.post('/api/execution/place-two',userAuth,async(req,res)=>{if(!relayExecutionAllowed())return res.status(503).json({ok:false,error:'Relais en attente.'});try{const body=req.body||{};const autoStake=body.autoStake===true;const hydrated=await hydrateExecutionLegs(req.user.user_id,body.legs,autoStake);if(!hydrated.ok)return res.status(422).json({ok:false,stage:'connection',...hydrated});const result=await executeTwoLegTransaction({userId:req.user.user_id,autoStake,legs:hydrated.legs,idempotencyKey:body.idempotencyKey,requestId:body.requestId,preflightContext:body.preflightContext||{},decisionContext:{...(body.decisionContext||{}),userAuthenticated:true,userId:req.user.user_id,autoStakeEnabled:autoStake,confirmationValid:body.decisionContext?.confirmationValid??autoStake}});res.status(result.ok?200:409).json(result)}catch(e){return apiFail(res,e)}});
app.post('/api/execution/place-authorized',userAuth,async(req,res)=>{if(!relayExecutionAllowed())return res.status(503).json({ok:false,error:'Relais en attente.'});try{const body=req.body||{};const hydrated=await hydrateExecutionLegs(req.user.user_id,body.legs,false);if(!hydrated.ok)return res.status(422).json({ok:false,stage:'connection',...hydrated});const results=[];for(const leg of hydrated.legs){results.push(await placeAuthorizedBet(leg))}res.status(results.every(x=>x.ok)?200:409).json({ok:results.every(x=>x.ok),results})}catch(e){return apiFail(res,e)}});
app.get('/api/sports',async(req,res)=>{try{res.json({ok:true,data:await oddsPapi('/sports')})}catch(e){apiFail(res,e)}});
app.get('/api/fixtures',async(req,res)=>{try{const sportId=String(req.query.sportId||'10');const now=new Date();const from=req.query.from||now.toISOString();const to=req.query.to||new Date(now.getTime()+48*3600000).toISOString();const data=await oddsPapi('/fixtures',{sportId,from,to,hasOdds:'true'});res.json({ok:true,sportId,from,to,count:Array.isArray(data)?data.length:0,data:Array.isArray(data)?data:[]})}catch(e){apiFail(res,e)}});
app.get('/api/radar',async(req,res)=>{try{const now=new Date();const from=now.toISOString();const to=new Date(now.getTime()+48*3600000).toISOString();const ids=String(req.query.sports||'10,11').split(',').map(x=>x.trim()).filter(Boolean);const parts=await Promise.all(ids.map(async sportId=>{try{const data=await oddsPapi('/fixtures',{sportId,from,to,hasOdds:'true'});return Array.isArray(data)?data:[]}catch(err){return []}}));const data=parts.flat().filter(x=>x?.hasOdds).sort((a,b)=>new Date(a.startTime||0)-new Date(b.startTime||0));res.json({ok:true,from,to,count:data.length,sports:ids,data,note:data.length?undefined:'Aucune fixture disponible pour le moment (source limitée ou quota).'})}catch(e){apiFail(res,e)}});
app.get('/api/odds',async(req,res)=>{try{const fixtureId=String(req.query.fixtureId||'').trim();if(!fixtureId)return res.status(400).json({ok:false,error:'fixtureId requis.'});const data=await oddsPapi('/odds',{fixtureId,bookmakers:req.query.bookmakers?String(req.query.bookmakers):'',oddsFormat:'decimal',verbosity:'3'});res.json({ok:true,data})}catch(e){apiFail(res,e)}});
app.post('/api/arbitrage/stake-plan-constrained',auth,(req,res)=>{const body=req.body||{};const total=Number(body.totalStake??body.stake);const legs=Array.isArray((body.opportunity||body).legs)?(body.opportunity||body).legs:[];if(!Number.isFinite(total)||total<=0)return res.status(400).json({ok:false,error:'Mise totale invalide.'});const result=buildArbitrage(legs,total,Number(body.roundingStep||0.01));res.status(result.valid?200:422).json({ok:result.valid,plan:result})});
app.post('/api/arbitrage/validate-opportunity',auth,(req,res)=>{const body=req.body||{};const result=buildArbitrage(Array.isArray(body.legs)?body.legs:[],Number(body.totalStake??body.stake??100),Number(body.roundingStep||0.01));res.status(result.valid?200:422).json({ok:result.valid,arbitrage:result})});
app.get('/api/bookmakers/coverage',async(req,res)=>{try{const available=API_KEY?await oddsPapi('/bookmakers'):[];const map=new Map((Array.isArray(available)?available:[]).map(x=>[String(x.slug),x]));res.json({ok:true,configured:BOOKMAKERS.length,rows:BOOKMAKERS.map(slug=>{const x=map.get(slug);return{configuredSlug:slug,found:!!x,status:x?'SOURCE_OK':'NOT_FOUND',name:x?.bookmakerName||x?.name||null,logo:bookmakerLogo(x),liveOdds:x?.liveOdds??null}})})}catch(e){apiFail(res,e)}});
app.listen(PORT,'0.0.0.0',()=>console.log(`Deck Pro V130 ${relayRole()} server listening on :${PORT}`));
