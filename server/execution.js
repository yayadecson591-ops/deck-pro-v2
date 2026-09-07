import crypto from 'crypto';

const EXECUTION_TIMEOUT_MS=Number(process.env.EXECUTION_TIMEOUT_MS||8000);
const configured=(process.env.BOOKMAKER_EXECUTION_BOOKS||'').split(',').map(x=>x.trim()).filter(Boolean);

function env(name){return String(process.env[name]||'').trim()}
function secret(name){return env(name)}
function enabled(slug){return configured.includes(slug)}

const adapters={
  sportybet:{slug:'sportybet',name:'SportyBet',mode:'official_api',baseUrl:env('SPORTYBET_API_BASE_URL'),apiKey:secret('SPORTYBET_API_KEY')},
  betmomo:{slug:'betmomo',name:'BetMomo',mode:'official_api',baseUrl:env('BETMOMO_API_BASE_URL'),apiKey:secret('BETMOMO_API_KEY')},
  premierbet:{slug:'premierbet',name:'Premier Bet',mode:'official_api',baseUrl:env('PREMIERBET_API_BASE_URL'),apiKey:secret('PREMIERBET_API_KEY')},
  'betpawa.cm':{slug:'betpawa.cm',name:'betPawa Cameroon',mode:'official_api',baseUrl:env('BETPAWA_API_BASE_URL'),apiKey:secret('BETPAWA_API_KEY')},
  '1xbet':{slug:'1xbet',name:'1xBet',mode:'official_api',baseUrl:env('ONE_XBET_API_BASE_URL'),apiKey:secret('ONE_XBET_API_KEY')},
  '1xwin':{slug:'1xwin',name:'1xWin',mode:'official_api',baseUrl:env('ONE_XWIN_API_BASE_URL'),apiKey:secret('ONE_XWIN_API_KEY')},
  afropari:{slug:'afropari',name:'Afropari',mode:'official_api',baseUrl:env('AFROPARI_API_BASE_URL'),apiKey:secret('AFROPARI_API_KEY')}
};

export function executionCapabilities(){
  return Object.values(adapters).map(a=>({
    bookmaker:a.slug,
    name:a.name,
    enabled:enabled(a.slug),
    configured:Boolean(a.baseUrl&&a.apiKey),
    mode:a.mode,
    executable:Boolean(enabled(a.slug)&&a.baseUrl&&a.apiKey),
    status: enabled(a.slug)&&a.baseUrl&&a.apiKey ? 'READY_FOR_AUTHORIZED_API' : 'NOT_CONFIGURED'
  }));
}

function safeId(){return crypto.randomUUID()}
function timeoutSignal(){return AbortSignal.timeout(EXECUTION_TIMEOUT_MS)}
function headers(adapter){return {Accept:'application/json','Content-Type':'application/json','Authorization':`Bearer ${adapter.apiKey}`}}

export async function placeAuthorizedBet({bookmaker,selection,stake,idempotencyKey}){
  const slug=String(bookmaker||'').trim().toLowerCase();
  const a=adapters[slug];
  if(!a)return {ok:false,code:'BOOKMAKER_UNSUPPORTED',message:`Bookmaker non pris en charge: ${slug||'inconnu'}`};
  if(!enabled(slug)||!a.baseUrl||!a.apiKey)return {ok:false,code:'BOOKMAKER_NOT_CONFIGURED',message:`Aucun canal API autorisé configuré pour ${a.name}.`};
  if(!selection||!Number.isFinite(Number(stake))||Number(stake)<=0)return {ok:false,code:'INVALID_ORDER',message:'Sélection ou mise invalide.'};
  const requestId=idempotencyKey||safeId();
  const url=`${a.baseUrl.replace(/\/$/,'')}/bets`;
  try{
    const r=await fetch(url,{method:'POST',headers:{...headers(a),'Idempotency-Key':requestId},body:JSON.stringify({selection,stake:Number(stake),requestId}),signal:timeoutSignal()});
    const text=await r.text();
    let data;try{data=JSON.parse(text)}catch{data={raw:text.slice(0,500)}}
    if(!r.ok)return {ok:false,code:'BOOKMAKER_REJECTED',status:r.status,requestId,data};
    return {ok:true,code:'BET_ACCEPTED',requestId,reference:data?.id||data?.betId||data?.reference||null,data};
  }catch(e){
    return {ok:false,code:e?.name==='TimeoutError'?'BOOKMAKER_TIMEOUT':'BOOKMAKER_NETWORK_ERROR',requestId,message:e?.message||'Erreur de communication avec le bookmaker.'};
  }
}

export function validateExecutionPair(legs){
  if(!Array.isArray(legs)||legs.length!==2)return {ok:false,code:'EXACTLY_TWO_BOOKMAKERS_REQUIRED'};
  const books=legs.map(x=>String(x?.bookmaker||'').trim().toLowerCase());
  if(!books[0]||!books[1]||books[0]===books[1])return {ok:false,code:'TWO_DISTINCT_BOOKMAKERS_REQUIRED'};
  if(books.some(x=>!adapters[x]))return {ok:false,code:'BOOKMAKER_UNSUPPORTED'};
  return {ok:true,bookmakers:books};
}
