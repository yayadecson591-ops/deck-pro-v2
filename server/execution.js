import crypto from 'crypto';
import { executionStrategy, executionStrategyMatrix, supportedChannels, isExecutionChannelVerified } from './execution-strategies.js';

const EXECUTION_TIMEOUT_MS=Number(process.env.EXECUTION_TIMEOUT_MS||8000);
const configured=(process.env.BOOKMAKER_EXECUTION_BOOKS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
const tokenBooks=(process.env.BOOKMAKER_TOKEN_BOOKS||'').split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);

function env(name){return String(process.env[name]||'').trim()}
function enabled(slug){return configured.includes(slug)}
function tokenEnabled(slug){return tokenBooks.includes(slug)}

const adapters={
  sportybet:{slug:'sportybet',name:'SportyBet',mode:'user_token',baseUrl:env('SPORTYBET_API_BASE_URL')},
  betmomo:{slug:'betmomo',name:'BetMomo',mode:'user_token',baseUrl:env('BETMOMO_API_BASE_URL')},
  premierbet:{slug:'premierbet',name:'Premier Bet',mode:'user_token',baseUrl:env('PREMIERBET_API_BASE_URL')},
  'betpawa.cm':{slug:'betpawa.cm',name:'betPawa Cameroon',mode:'user_token',baseUrl:env('BETPAWA_API_BASE_URL')},
  '1xbet':{slug:'1xbet',name:'1xBet',mode:'user_token',baseUrl:env('ONE_XBET_API_BASE_URL')},
  '1xwin':{slug:'1xwin',name:'1xWin',mode:'user_token',baseUrl:env('ONE_XWIN_API_BASE_URL')},
  afropari:{slug:'afropari',name:'Afropari',mode:'user_token',baseUrl:env('AFROPARI_API_BASE_URL')}
};

export function executionCapabilities(){
  return Object.values(adapters).map(a=>({
    bookmaker:a.slug,
    name:a.name,
    enabled:enabled(a.slug),
    configured:Boolean(a.baseUrl),
    mode:a.mode,
    userTokenConfigured:tokenEnabled(a.slug),
    strategy:executionStrategy(a.slug),
    verifiedFallbackChannels:supportedChannels().filter(channel=>isExecutionChannelVerified(a.slug,channel)),
    executable:Boolean(enabled(a.slug)&&a.baseUrl&&tokenEnabled(a.slug)),
    status:enabled(a.slug)&&a.baseUrl&&tokenEnabled(a.slug)?'TOKEN_CHANNEL_CONFIGURED':'TOKEN_CHANNEL_NOT_CONFIGURED'
  }));
}

export function executionStrategies(){return executionStrategyMatrix()}
function safeId(){return crypto.randomUUID()}
function timeoutSignal(){return AbortSignal.timeout(EXECUTION_TIMEOUT_MS)}
function headers(adapter,userToken){return {Accept:'application/json','Content-Type':'application/json','Authorization':`Bearer ${String(userToken||'')}`}}
function tokenFingerprint(value){return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0,16)}

export function validateAuthorizedOrder({bookmaker,selection,stake,odds,expectedOdds,availableBalance,maxStake,userToken}){
  const slug=String(bookmaker||'').trim().toLowerCase(); const a=adapters[slug];
  if(!a||!enabled(slug)||!a.baseUrl||!tokenEnabled(slug))return {ok:false,code:'BOOKMAKER_TOKEN_CHANNEL_NOT_CONFIGURED'};
  if(!userToken)return {ok:false,code:'BOOKMAKER_USER_TOKEN_REQUIRED'};
  if(!selection)return {ok:false,code:'SELECTION_REQUIRED'};
  const s=Number(stake); if(!Number.isFinite(s)||s<=0)return {ok:false,code:'INVALID_STAKE'};
  if(Number.isFinite(Number(maxStake))&&s>Number(maxStake))return {ok:false,code:'STAKE_LIMIT_EXCEEDED'};
  if(Number.isFinite(Number(availableBalance))&&s>Number(availableBalance))return {ok:false,code:'INSUFFICIENT_BALANCE'};
  if(Number.isFinite(Number(expectedOdds))&&Number.isFinite(Number(odds))&&Number(odds)<Number(expectedOdds))return {ok:false,code:'ODDS_MOVED_DOWN',expectedOdds:Number(expectedOdds),currentOdds:Number(odds)};
  return {ok:true,bookmaker:slug,stake:s,odds:Number(odds),preflight:'PASSED',tokenFingerprint:tokenFingerprint(userToken)};
}

export async function placeAuthorizedBet({bookmaker,selection,stake,idempotencyKey,userToken}){
  const slug=String(bookmaker||'').trim().toLowerCase(); const a=adapters[slug];
  if(!a)return {ok:false,code:'BOOKMAKER_UNSUPPORTED'};
  if(!enabled(slug)||!a.baseUrl||!tokenEnabled(slug))return {ok:false,code:'BOOKMAKER_TOKEN_CHANNEL_NOT_CONFIGURED'};
  if(!userToken)return {ok:false,code:'BOOKMAKER_USER_TOKEN_REQUIRED'};
  if(!selection||!Number.isFinite(Number(stake))||Number(stake)<=0)return {ok:false,code:'INVALID_ORDER'};
  const requestId=idempotencyKey||safeId(); const url=`${a.baseUrl.replace(/\/$/,'')}/bets`;
  try{
    const r=await fetch(url,{method:'POST',headers:{...headers(a,userToken),'Idempotency-Key':requestId},body:JSON.stringify({selection,stake:Number(stake),requestId}),signal:timeoutSignal()});
    const text=await r.text(); let data; try{data=JSON.parse(text)}catch{data={raw:text.slice(0,500)}}
    if(!r.ok)return {ok:false,code:'BOOKMAKER_REJECTED',status:r.status,requestId,data};
    return {ok:true,code:'BET_ACCEPTED',requestId,reference:data?.id||data?.betId||data?.reference||null,data};
  }catch(e){return {ok:false,code:e?.name==='TimeoutError'?'BOOKMAKER_TIMEOUT':'BOOKMAKER_NETWORK_ERROR',requestId,message:e?.message||'Erreur de communication avec le bookmaker.'};}
}

export function validateExecutionPair(legs){
  if(!Array.isArray(legs)||legs.length!==2)return {ok:false,code:'EXACTLY_TWO_BOOKMAKERS_REQUIRED'};
  const books=legs.map(x=>String(x?.bookmaker||'').trim().toLowerCase());
  if(!books[0]||!books[1]||books[0]===books[1])return {ok:false,code:'TWO_DISTINCT_BOOKMAKERS_REQUIRED'};
  if(books.some(x=>!adapters[x]))return {ok:false,code:'BOOKMAKER_UNSUPPORTED'};
  return {ok:true,bookmakers:books};
}
