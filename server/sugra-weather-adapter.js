// Sugra is used only as an optional weather/context enrichment feed here.
// It is NOT treated as a sports-odds or bookmaker feed.
const BASE_URL='https://sugra.ai';

export function sugraConfigured(){
  return Boolean(String(process.env.SUGRA_API_KEY||'').trim());
}

export async function fetchSugraWeather({lat,lon}={}){
  if(!sugraConfigured()) return {ok:false,code:'SUGRA_NOT_CONFIGURED'};
  if(!Number.isFinite(Number(lat))||!Number.isFinite(Number(lon))) return {ok:false,code:'WEATHER_COORDINATES_REQUIRED'};
  const url=new URL('/api/v2/weather',BASE_URL);
  url.searchParams.set('lat',String(lat));
  url.searchParams.set('lon',String(lon));
  const response=await fetch(url,{headers:{'x-api-key':process.env.SUGRA_API_KEY,'accept':'application/json'}});
  const body=await response.json().catch(()=>null);
  if(!response.ok) return {ok:false,code:`SUGRA_HTTP_${response.status}`,body};
  return {ok:true,data:body?.data??body,meta:body?.meta??{}};
}

export function sugraWeatherStatus(){
  return {provider:'sugra',purpose:'weather_enrichment',configured:sugraConfigured(),sportsOdds:false,bookmakerExecution:false};
}
