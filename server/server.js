import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { executionCapabilities, validateExecutionPair } from './execution.js';

const app=express();
const PORT=Number(process.env.PORT||10000);
const DATA_DIR=process.env.DATA_DIR||'./data';
const ORIGINS=(process.env.ALLOWED_ORIGINS||'*').split(',').map(x=>x.trim()).filter(Boolean);
const API_KEY=process.env.ODDSPAPI_API_KEY||'';
const OWNER_CODE=String(process.env.OWNER_CODE||'').trim();
const OWNER_SALT=process.env.OWNER_CODE_SALT||'';
const OWNER_HASH=process.env.OWNER_CODE_HASH||'';
const OWNER_SECRET=process.env.OWNER_TOKEN_SECRET||'';
const BOOKMAKERS=(process.env.BOOKMAKERS||'sportybet,betmomo,premierbet,betpawa.cm,1xbet,1xwin,afropari').split(',').map(x=>x.trim()).filter(Boolean);
const ODDS_BASE='https://api.oddspapi.io/v4';
fs.mkdirSync(DATA_DIR,{recursive:true});
app.disable('x-powered-by');
app.use(cors({origin:(o,cb)=>!o||ORIGINS.includes('*')||ORIGINS.includes(o)?cb(null,true):cb(new Error('Origin non autorisée'))}));
app.use(express.json({limit:'256kb'}));
app.use((req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');res.setHeader('Cache-Control','no-store');next()});
const effectiveSalt=OWNER_SALT||'deck-pro-owner-v1';
const effectiveHash=OWNER_HASH||(OWNER_CODE?crypto.createHash('sha256').update(effectiveSalt+OWNER_CODE).digest('hex'):'');
const effectiveSecret=OWNER_SECRET||(effectiveHash?crypto.createHash('sha256').update('deck-pro-token-v1'+effectiveHash).digest('hex'):'');
const hash=(code,salt=effectiveSalt)=>crypto.createHash('sha256').update(String(salt)+String(code)).digest('hex');
const token=(device='')=>{const p=Buffer.from(JSON.stringify({role:'owner',exp:Date.now()+2592000000,did:device})).toString('base64url');return p+'.'+crypto.createHmac('sha256',effectiveSecret).update(p).digest('base64url')};
function auth(req,res,next){const t=String(req.headers.authorization||'').replace(/^Bearer\s+/i,'');try{if(!effectiveSecret||!t)throw 0;const [p,s]=t.split('.');const e=crypto.createHmac('sha256',effectiveSecret).update(p).digest('base64url');const x=JSON.parse(Buffer.from(p,'base64url').toString());if(s!==e||x.role!=='owner'||Number(x.exp)<=Date.now())throw 0;req.owner=x;next()}catch{return res.status(401).json({ok:false,error:'Activation propriétaire requise.'})}}
async function oddsPapi(pathname,params={}){if(!API_KEY)throw Object.assign(new Error('Source live OddsPapi non configurée.'),{status:503,code:'ODDSPAPI_NOT_CONFIGURED'});const q=new URLSearchParams({apiKey:API_KEY,language:'en',...params});const r=await fetch(`${ODDS_BASE}${pathname}?${q}`,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(15000)});const text=await r.text();let data;try{data=JSON.parse(text)}catch{data={error:text.slice(0,300)}}if(!r.ok)throw Object.assign(new Error(data?.message||data?.error||`OddsPapi HTTP ${r.status}`),{status:r.status,code:'ODDSPAPI_ERROR'});return data}
function apiFail(res,e){return res.status(e?.status||502).json({ok:false,error:e?.message||'Source live indisponible.',code:e?.code||'LIVE_SOURCE_ERROR'})}
function bookmakerLogo(x){return x?.logo||x?.logoUrl||x?.logoURL||x?.image||x?.icon||x?.iconUrl||null}
function normalizeLeg(l){return{bookmaker:String(l.slug||l.bookmaker||''),price:Number(l.price??l.odds),outcome:String(l.outcome||l.selection||''),market:String(l.market||l.marketName||''),line:l.line??null,fixtureId:String(l.fixtureId||l.eventId||''),eventId:String(l.eventId||l.fixtureId||'')}}
function buildArbitrage(legs,total,step=0.01){
  const clean=legs.map(normalizeLeg).filter(l=>l.bookmaker&&Number.isFinite(l.price)&&l.price>1&&l.outcome);
  if(clean.length<2)return{valid:false,reason:'Il faut au moins deux sélections valides.'};
  const eventIds=[...new Set(clean.map(x=>x.eventId).filter(Boolean))];
  const markets=[...new Set(clean.map(x=>`${x.market}|${x.line??''}`))];
  if(eventIds.length!==1||markets.length!==1)return{valid:false,reason:'Marchés non comparables : même événement, marché et ligne requis.'};
  const outcomes=[...new Set(clean.map(x=>x.outcome.toLowerCase()))];
  if(outcomes.length!==clean.length)return{valid:false,reason:'Sélections dupliquées : une seule meilleure cote par issue est requise.'};
  const inv=clean.reduce((s,l)=>s+(1/l.price),0);
  if(!(inv<1))return{valid:false,reason:'Aucun arbitrage sans perte : somme des probabilités implicites ≥ 1.',impliedProbability:inv};
  const raw=clean.map(l=>total*(1/l.price)/inv);
  const stakes=raw.map(x=>Math.round(x/step)*step);
  const sum=stakes.reduce((a,b)=>a+b,0);
  if(Math.abs(sum-total)>1e-9){const delta=total-sum;const idx=stakes.reduce((best,_,i)=>raw[i]>raw[best]?i:best,0);stakes[idx]=Math.max(0,Math.round((stakes[idx]+delta)/step)*step)}
  const returns=clean.map((l,i)=>stakes[i]*l.price);
  const minReturn=Math.min(...returns);
  const profit=minReturn-total;
  const yieldPct=(profit/total)*100;
  return{valid:profit>=-1e-9,impliedProbability:inv,marginPct:(1-inv)*100,totalStake:total,minimumReturn:minReturn,profit,yieldPct,legs:clean.map((l,i)=>({...l,stake:stakes[i],grossReturn:returns[i]})),rounded:true,step};
}
app.get('/health',(req,res)=>res.json({ok:true,service:'deck-pro-server',version:'V124',status:'online',uptimeSec:Math.floor(process.uptime())}));
app.get('/api/system/readiness',(req,res)=>{const writable=(()=>{try{const f=path.join(DATA_DIR,'.probe');fs.writeFileSync(f,'ok');fs.unlinkSync(f);return true}catch{return false}})();const ownerConfigured=!!effectiveHash&&!!effectiveSecret;const execution=executionCapabilities();const checks={oddsPapi:!!API_KEY,ownerAuth:ownerConfigured,dataWritable:writable,nodeVersion:Number(process.versions.node.split('.')[0])>=20,executionLayer:true};const ready=checks.oddsPapi&&checks.ownerAuth&&checks.dataWritable&&checks.nodeVersion;res.status(ready?200:503).json({ok:ready,ready,checks,bookmakers:BOOKMAKERS,execution})});
app.post('/api/activate',(req,res)=>{const code=String(req.body?.code||'').trim().toUpperCase();const deviceId=String(req.body?.deviceId||'').trim();if(!effectiveHash||!effectiveSecret)return res.status(503).json({ok:false,error:'Activation propriétaire non configurée.'});if(!/^\d{4}$/.test(code)||hash(code)!==effectiveHash)return res.status(401).json({ok:false,error:'Code propriétaire incorrect.'});if(!deviceId)return res.status(400).json({ok:false,error:'Identifiant appareil requis.'});res.json({ok:true,role:'owner',deviceId,token:token(deviceId)})});
app.get('/api/activate/verify',auth,(req,res)=>res.json({ok:true,role:'owner'}));
app.get('/api/system/config-check',auth,(req,res)=>res.json({ok:true,checks:{oddsPapi:!!API_KEY,ownerAuth:!!effectiveHash&&!!effectiveSecret,origins:ORIGINS.length>0,bookmakers:BOOKMAKERS.length>0,executionLayer:true},execution:executionCapabilities(),version:'V124'}));
app.get('/api/execution/capabilities',auth,(req,res)=>res.json({ok:true,version:'V124',policy:'Seuls les canaux API officiellement autorisés et explicitement configurés peuvent être activés. Aucun contournement, scraping ou automatisation de protections de bookmaker.',capabilities:executionCapabilities()}));
app.post('/api/execution/validate-pair',auth,(req,res)=>{const result=validateExecutionPair(req.body?.legs);res.status(result.ok?200:422).json({ok:result.ok,version:'V124',validation:result})});
app.get('/api/sports',auth,async(req,res)=>{try{res.json({ok:true,data:await oddsPapi('/sports')})}catch(e){apiFail(res,e)}});
app.get('/api/fixtures',auth,async(req,res)=>{try{const sportId=String(req.query.sportId||'10');const now=new Date();const from=req.query.from||now.toISOString();const to=req.query.to||new Date(now.getTime()+48*3600000).toISOString();const data=await oddsPapi('/fixtures',{sportId,from,to,hasOdds:'true'});res.json({ok:true,sportId,from,to,count:Array.isArray(data)?data.length:0,data:Array.isArray(data)?data:[]})}catch(e){apiFail(res,e)}});
app.get('/api/radar',auth,async(req,res)=>{try{const now=new Date();const from=now.toISOString();const to=new Date(now.getTime()+48*3600000).toISOString();const ids=String(req.query.sports||'10,11').split(',').map(x=>x.trim()).filter(Boolean);const parts=await Promise.all(ids.map(async sportId=>{const data=await oddsPapi('/fixtures',{sportId,from,to,hasOdds:'true'});return Array.isArray(data)?data:[]}));const data=parts.flat().filter(x=>x?.hasOdds).sort((a,b)=>new Date(a.startTime)-new Date(b.startTime));res.json({ok:true,from,to,count:data.length,sports:ids,data})}catch(e){apiFail(res,e)}});
app.get('/api/odds',auth,async(req,res)=>{try{const fixtureId=String(req.query.fixtureId||'').trim();if(!fixtureId)return res.status(400).json({ok:false,error:'fixtureId requis.'});const bookmakers=req.query.bookmakers?String(req.query.bookmakers):'';const data=await oddsPapi('/odds',{fixtureId,bookmakers,oddsFormat:'decimal',verbosity:'3'});res.json({ok:true,data})}catch(e){apiFail(res,e)}});
app.post('/api/arbitrage/stake-plan-constrained',auth,(req,res)=>{const body=req.body||{};const total=Number(body.totalStake??body.stake);const opp=body.opportunity||body;const legs=Array.isArray(opp.legs)?opp.legs:[];if(!Number.isFinite(total)||total<=0)return res.status(400).json({ok:false,error:'Mise totale invalide.'});const result=buildArbitrage(legs,total,Number(body.roundingStep||0.01));if(!result.valid)return res.status(422).json({ok:false,version:'V124',plan:result});res.json({ok:true,version:'V124',plan:{...result,policy:'mise totale configurable par opération, indépendante du nombre de bookmakers; validation mathématique obligatoire; aucune mise réelle n’est placée'}})});
app.post('/api/arbitrage/validate-opportunity',auth,(req,res)=>{const body=req.body||{};const total=Number(body.totalStake??body.stake??100);const result=buildArbitrage(Array.isArray(body.legs)?body.legs:[],total,Number(body.roundingStep||0.01));res.status(result.valid?200:422).json({ok:result.valid,version:'V124',arbitrage:result})});
app.get('/api/bookmakers/coverage',auth,async(req,res)=>{try{const available=API_KEY?await oddsPapi('/bookmakers'):[];const map=new Map((Array.isArray(available)?available:[]).map(x=>[String(x.slug),x]));res.json({ok:true,configured:BOOKMAKERS.length,rows:BOOKMAKERS.map(slug=>{const x=map.get(slug);return{configuredSlug:slug,found:!!x,status:x?'SOURCE_OK':'NOT_FOUND',name:x?.bookmakerName||x?.name||null,logo:x?.logo||x?.logoUrl||x?.logoURL||x?.image||x?.icon||x?.iconUrl||null,liveOdds:x?.liveOdds??null}}),policy:'La couverture et les logos sont issus de la source live.'})}catch(e){apiFail(res,e)}});
app.listen(PORT,'0.0.0.0',()=>console.log(`Deck Pro V124 server listening on :${PORT}`));
