import crypto from 'crypto';
import { validateExecutionPair, validateAuthorizedOrder, placeAuthorizedBet } from './execution.js';
import { reconcileTwoLegs } from './execution-reconciliation.js';
import { assertAutoStakeAllowed } from './auto-stake.js';

const DEFAULT_TTL_MS = Number(process.env.EXECUTION_IDEMPOTENCY_TTL_MS || 10 * 60 * 1000);
const transactions = new Map();
function now(){return Date.now();}
function txId(){return crypto.randomUUID();}
function keyOf(value){return String(value||'').trim();}
function prune(){const cutoff=now()-DEFAULT_TTL_MS;for(const[key,value]of transactions){if(value.createdAt<cutoff&&value.status!=='running')transactions.delete(key);}}
export function executionEngineStatus(){prune();return{ok:true,mode:'two-leg-transaction',exactlyTwoBookmakers:true,idempotency:true,concurrentPlacement:true,partialFailureIsReported:true,lifecycleTracking:true,reconciliationTracking:true,reconciliationStateMachine:true,autoStakeGate:true,inFlight:[...transactions.values()].filter(x=>x.status==='running').length};}
export function getExecutionTransaction(idempotencyKey){prune();const key=keyOf(idempotencyKey);if(!key)return null;return transactions.get(key)||null;}
export function reconcileExecutionTransaction(idempotencyKey){const transaction=getExecutionTransaction(idempotencyKey);if(!transaction)return{ok:false,code:'EXECUTION_TRANSACTION_NOT_FOUND'};const reconciliation=reconcileTwoLegs(transaction);transaction.reconciliation=reconciliation;if(reconciliation.state==='reconciliation_required'){transaction.reconciliationRequired=true;transaction.status='reconciliation_required';}return{ok:true,transaction,reconciliation};}
function resultAccepted(result){return result?.ok===true&&result?.result?.accepted===true;}
function resultToLegState(result){if(resultAccepted(result))return'accepted';if(result?.result?.status==='rejected')return'rejected';return'failed';}
export async function executeTwoLegTransaction({legs,idempotencyKey,requestId,preflightContext={},userId=null,autoStake=false}){
  prune();const key=keyOf(idempotencyKey);if(!key)return{ok:false,stage:'request',code:'IDEMPOTENCY_KEY_REQUIRED'};
  if(autoStake){const gate=assertAutoStakeAllowed(userId);if(!gate.ok)return{ok:false,stage:'auto_stake',...gate};}
  const existing=transactions.get(key);if(existing)return{ok:existing.status==='completed',replay:true,transaction:existing};
  const pair=validateExecutionPair(legs);if(!pair.ok)return{ok:false,stage:'pair',validation:pair};
  const checks=legs.map(leg=>validateAuthorizedOrder({...leg,availableBalance:preflightContext[leg.bookmaker]?.availableBalance??leg.availableBalance,maxStake:preflightContext[leg.bookmaker]?.maxStake??leg.maxStake,expectedOdds:preflightContext[leg.bookmaker]?.expectedOdds??leg.expectedOdds,odds:preflightContext[leg.bookmaker]?.odds??leg.odds}));
  if(!checks.every(x=>x.ok))return{ok:false,stage:'preflight',code:'PREFLIGHT_FAILED',pair,checks};
  const transaction={id:txId(),requestId:keyOf(requestId)||txId(),idempotencyKey:key,createdAt:now(),status:'running',bookmakers:pair.bookmakers,reconciliationRequired:false,autoStake,legs:legs.map((leg,index)=>({index,bookmaker:pair.bookmakers[index],channel:checks[index].channel,stake:checks[index].stake,odds:checks[index].odds,selection:String(leg.selection||''),status:'pending'}))};
  transactions.set(key,transaction);
  try{
    const settled=await Promise.allSettled(legs.map((leg,index)=>placeAuthorizedBet({bookmaker:leg.bookmaker,selection:leg.selection,stake:checks[index].stake,idempotencyKey:`${key}:${index}`,userToken:leg.userToken,channel:checks[index].channel})));
    const results=settled.map(item=>item.status==='fulfilled'?item.value:{ok:false,code:'BOOKMAKER_EXECUTION_FAILED',error:String(item.reason?.message||item.reason)});
    transaction.legs=transaction.legs.map((leg,index)=>({...leg,status:resultToLegState(results[index]),completedAt:now(),result:results[index]}));transaction.completedAt=now();
    const accepted=results.filter(resultAccepted).length,failed=results.length-accepted;
    if(failed===0){transaction.status='completed';transaction.ok=true;}else if(accepted>0){transaction.status='partial_failure';transaction.ok=false;transaction.reconciliationRequired=true;transaction.reconciliationReason='Une seule jambe a été acceptée ou les résultats sont divergents.';}else{transaction.status='failed';transaction.ok=false;}
    transaction.reconciliation=reconcileTwoLegs(transaction);if(transaction.reconciliation.state==='reconciliation_required'){transaction.reconciliationRequired=true;transaction.status='reconciliation_required';}
    return{ok:transaction.ok&&!transaction.reconciliationRequired,stage:'placement',accepted,failed,transaction};
  }catch(error){transaction.completedAt=now();transaction.status='failed';transaction.ok=false;transaction.reconciliationRequired=transaction.legs.some(leg=>leg.status==='accepted');transaction.error=String(error?.message||error);transaction.reconciliation=reconcileTwoLegs(transaction);return{ok:false,stage:'placement',transaction};}
}
