// Final gate between generated coupons and bookmaker execution.
// Automatic execution remains fail-closed unless the user's Mise Auto is valid
// and the selected bookmaker has a verified execution adapter.
import { assertAutoStakeAllowed } from './auto-stake.js';
import { executionStrategy } from './execution-strategies.js';

export function validatePronoExecution({userId,bookmaker,mode='manual',coupon}={}){
  const slug=String(bookmaker||coupon?.bookmaker||'').trim().toLowerCase();
  const normalizedMode=String(mode||'manual').trim().toLowerCase();
  if(!userId)return{ok:false,code:'USER_REQUIRED'};
  if(!slug||!executionStrategy(slug))return{ok:false,code:'BOOKMAKER_UNSUPPORTED'};
  if(!coupon||!Array.isArray(coupon.selections)||coupon.selections.length<1)return{ok:false,code:'COUPON_EMPTY'};
  if(coupon.selections.length>50)return{ok:false,code:'COUPON_LIMIT_EXCEEDED'};
  if(normalizedMode==='auto'){
    const gate=assertAutoStakeAllowed(userId,{sensitiveAction:true});
    if(!gate.ok)return{ok:false,code:'AUTO_STAKE_BLOCKED',gate};
  } else if(normalizedMode!=='manual') return{ok:false,code:'EXECUTION_MODE_INVALID'};
  const strategy=executionStrategy(slug);
  const ready=Boolean(strategy.preferred&&strategy.channels?.[strategy.preferred]?.verified&&strategy.channels?.[strategy.preferred]?.enabled);
  if(!ready)return{ok:false,code:'BOOKMAKER_EXECUTION_NOT_READY',strategy:{preferred:strategy.preferred,requiresHumanStep:strategy.requiresHumanStep}};
  return{ok:true,mode:normalizedMode,bookmaker:slug,selectionCount:coupon.selections.length};
}
