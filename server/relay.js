const RELAY_ROLE=String(process.env.RELAY_ROLE||'primary').trim().toLowerCase();
const PRIMARY_HEALTH_URL=String(process.env.PRIMARY_HEALTH_URL||'https://deck-pro-server.onrender.com/health').trim();
const RELAY_CHECK_TIMEOUT_MS=Number(process.env.RELAY_CHECK_TIMEOUT_MS||3000);

export function relayRole(){return RELAY_ROLE==='standby'?'standby':'primary'}
export function relayExecutionAllowed(){return relayRole()==='primary'}

export async function relayStatus(){
  if(relayRole()==='primary') return {role:'primary',executionAllowed:true,primary:'self',primaryReachable:true};
  const started=Date.now();
  try{
    const r=await fetch(PRIMARY_HEALTH_URL,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(RELAY_CHECK_TIMEOUT_MS),cache:'no-store'});
    return {role:'standby',executionAllowed:false,primary:'external',primaryReachable:r.ok,primaryStatus:r.status,latencyMs:Date.now()-started,policy:'standby remains non-executing until a shared distributed lease is configured'};
  }catch(e){
    return {role:'standby',executionAllowed:false,primary:'external',primaryReachable:false,latencyMs:Date.now()-started,code:e?.name==='TimeoutError'?'PRIMARY_HEALTH_TIMEOUT':'PRIMARY_HEALTH_UNREACHABLE',policy:'automatic real-money promotion is blocked until a shared distributed lease is configured'};
  }
}
