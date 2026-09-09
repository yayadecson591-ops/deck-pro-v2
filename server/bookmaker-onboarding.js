// Deck Pro: official execution onboarding map for all configured bookmakers.
// This is an execution-enablement registry, not a claim that accounts are already connected.
// A bookmaker becomes executable only after its official/provider authorization and production credentials are supplied.

export const bookmakerOnboarding = {
  sportybet:{name:'SportyBet',route:'partner/B2B',status:'AUTHORIZATION_REQUIRED',credentials:['SPORTYBET_CLIENT_ID','SPORTYBET_CLIENT_SECRET','SPORTYBET_API_BASE_URL']},
  betmomo:{name:'BetMomo',route:'official API/B2B',status:'RESEARCH_OR_AUTHORIZATION_REQUIRED',credentials:['BETMOMO_CLIENT_ID','BETMOMO_CLIENT_SECRET','BETMOMO_API_BASE_URL']},
  premierbet:{name:'Premier Bet',route:'official partner/API/deeplink',status:'AUTHORIZATION_REQUIRED',credentials:['PREMIERBET_CLIENT_ID','PREMIERBET_CLIENT_SECRET','PREMIERBET_API_BASE_URL']},
  'betpawa.cm':{name:'betPawa Cameroon',route:'pawaTech B2B',status:'AUTHORIZATION_REQUIRED',provider:'pawaTech',credentials:['PAWATECH_CLIENT_ID','PAWATECH_CLIENT_SECRET','PAWATECH_API_BASE_URL']},
  '1xbet':{name:'1xBet',route:'official online B2B partnership',status:'AUTHORIZATION_REQUIRED',contact:'b2b@1xbet-team.com',credentials:['ONEXBET_CLIENT_ID','ONEXBET_CLIENT_SECRET','ONEXBET_API_BASE_URL']},
  '1xwin':{name:'1xWin',route:'official partner/API',status:'AUTHORIZATION_REQUIRED',credentials:['ONEXWIN_CLIENT_ID','ONEXWIN_CLIENT_SECRET','ONEXWIN_API_BASE_URL']},
  afropari:{name:'Afropari',route:'official partner/API',status:'AUTHORIZATION_REQUIRED',credentials:['AFROPARI_CLIENT_ID','AFROPARI_CLIENT_SECRET','AFROPARI_API_BASE_URL']},
  betclic:{name:'Betclic Cameroon',route:'official API/B2B',status:'RESEARCH_OR_AUTHORIZATION_REQUIRED',credentials:['BETCLIC_CLIENT_ID','BETCLIC_CLIENT_SECRET','BETCLIC_API_BASE_URL']},
  yellowbet:{name:'Yellow Bet',route:'official API/B2B',status:'RESEARCH_OR_AUTHORIZATION_REQUIRED',credentials:['YELLOWBET_CLIENT_ID','YELLOWBET_CLIENT_SECRET','YELLOWBET_API_BASE_URL']},
  '22bet':{name:'22Bet',route:'official API/B2B',status:'RESEARCH_OR_AUTHORIZATION_REQUIRED',credentials:['22BET_CLIENT_ID','22BET_CLIENT_SECRET','22BET_API_BASE_URL']},
  pmuc:{name:'PMUC',route:'official API/B2B',status:'RESEARCH_OR_AUTHORIZATION_REQUIRED',credentials:['PMUC_CLIENT_ID','PMUC_CLIENT_SECRET','PMUC_API_BASE_URL']},
  supergooal:{name:'Supergooal',route:'official API/B2B',status:'RESEARCH_OR_AUTHORIZATION_REQUIRED',credentials:['SUPERGOOAL_CLIENT_ID','SUPERGOOAL_CLIENT_SECRET','SUPERGOOAL_API_BASE_URL']},
  betwinner:{name:'BetWinner',route:'official API/B2B',status:'RESEARCH_OR_AUTHORIZATION_REQUIRED',credentials:['BETWINNER_CLIENT_ID','BETWINNER_CLIENT_SECRET','BETWINNER_API_BASE_URL']},
  melbet:{name:'Melbet',route:'official API/B2B',status:'RESEARCH_OR_AUTHORIZATION_REQUIRED',credentials:['MELBET_CLIENT_ID','MELBET_CLIENT_SECRET','MELBET_API_BASE_URL']},
  bettomax:{name:'Bettomax',route:'official API/B2B',status:'RESEARCH_OR_AUTHORIZATION_REQUIRED',credentials:['BETTOMAX_CLIENT_ID','BETTOMAX_CLIENT_SECRET','BETTOMAX_API_BASE_URL']},
  paripesa:{name:'PariPesa',route:'official API/B2B',status:'RESEARCH_OR_AUTHORIZATION_REQUIRED',credentials:['PARIPESA_CLIENT_ID','PARIPESA_CLIENT_SECRET','PARIPESA_API_BASE_URL']},
  onebet:{name:'OneBet',route:'official API/B2B',status:'RESEARCH_OR_AUTHORIZATION_REQUIRED',credentials:['ONEBET_CLIENT_ID','ONEBET_CLIENT_SECRET','ONEBET_API_BASE_URL']},
  betsson:{name:'Betsson Africa',route:'EveryMatrix turnkey/API platform',status:'AUTHORIZATION_REQUIRED',provider:'EveryMatrix/OddsMatrix',credentials:['ODDSMATRIX_CLIENT_ID','ODDSMATRIX_CLIENT_SECRET','ODDSMATRIX_API_BASE_URL']}
};

export function bookmakerOnboardingStatus(){
  return Object.entries(bookmakerOnboarding).map(([slug,item])=>({
    bookmaker:slug,
    ...item,
    configured:Boolean(item.credentials.every(key=>String(process.env[key]||'').trim()))
  }));
}

export function bookmakerOnboardingFor(slug){
  return bookmakerOnboarding[String(slug||'').trim().toLowerCase()]||null;
}
