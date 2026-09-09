// Deck Pro: active technical-access execution map for all configured bookmakers.
// This registry drives the work required to reach real automatic execution.
// It never invents an endpoint or marks a bookmaker active without the real route being configured.

const TECHNICAL_ACCESS = {
  sportybet:{name:'SportyBet',route:'partner/B2B',accessType:'PARTNER_API',status:'TECHNICAL_ACCESS_RESEARCH'},
  betmomo:{name:'BetMomo',route:'official API/B2B',accessType:'OFFICIAL_API_RESEARCH',status:'TECHNICAL_ACCESS_RESEARCH'},
  premierbet:{name:'Premier Bet',route:'official partner/API/deeplink',accessType:'PARTNER_API',status:'ACCESS_ROUTE_IDENTIFIED'},
  'betpawa.cm':{name:'betPawa Cameroon',route:'pawaTech B2B',accessType:'B2B_PLATFORM',provider:'pawaTech',status:'ACCESS_ROUTE_IDENTIFIED'},
  '1xbet':{name:'1xBet',route:'official online B2B partnership',accessType:'B2B_PARTNER',contact:'b2b@1xbet-team.com',status:'ACCESS_ROUTE_IDENTIFIED'},
  '1xwin':{name:'1xWin',route:'official partner/API',accessType:'PARTNER_API',status:'TECHNICAL_ACCESS_RESEARCH'},
  afropari:{name:'Afropari',route:'official partner/API',accessType:'PARTNER_API',status:'TECHNICAL_ACCESS_RESEARCH'},
  betclic:{name:'Betclic Cameroon',route:'official API/B2B',accessType:'OFFICIAL_API_RESEARCH',status:'TECHNICAL_ACCESS_RESEARCH'},
  yellowbet:{name:'Yellow Bet',route:'official API/B2B',accessType:'OFFICIAL_API_RESEARCH',status:'TECHNICAL_ACCESS_RESEARCH'},
  '22bet':{name:'22Bet',route:'official API/B2B',accessType:'OFFICIAL_API_RESEARCH',status:'TECHNICAL_ACCESS_RESEARCH'},
  pmuc:{name:'PMUC',route:'official API/B2B',accessType:'OFFICIAL_API_RESEARCH',status:'TECHNICAL_ACCESS_RESEARCH'},
  supergooal:{name:'Supergooal',route:'official API/B2B',accessType:'OFFICIAL_API_RESEARCH',status:'TECHNICAL_ACCESS_RESEARCH'},
  betwinner:{name:'BetWinner',route:'official API/B2B',accessType:'OFFICIAL_API_RESEARCH',status:'TECHNICAL_ACCESS_RESEARCH'},
  melbet:{name:'Melbet',route:'official API/B2B',accessType:'OFFICIAL_API_RESEARCH',status:'TECHNICAL_ACCESS_RESEARCH'},
  bettomax:{name:'Bettomax',route:'official API/B2B',accessType:'OFFICIAL_API_RESEARCH',status:'TECHNICAL_ACCESS_RESEARCH'},
  paripesa:{name:'PariPesa',route:'official API/B2B',accessType:'OFFICIAL_API_RESEARCH',status:'TECHNICAL_ACCESS_RESEARCH'},
  onebet:{name:'OneBet',route:'official API/B2B',accessType:'OFFICIAL_API_RESEARCH',status:'TECHNICAL_ACCESS_RESEARCH'},
  betsson:{name:'Betsson Africa',route:'EveryMatrix turnkey/API platform',accessType:'B2B_PLATFORM',provider:'EveryMatrix/OddsMatrix',status:'ACCESS_ROUTE_IDENTIFIED'}
};

const ADAPTER_PREFIX = {
  sportybet:'BOOKMAKER_SPORTYBET',betmomo:'BOOKMAKER_BETMOMO',premierbet:'BOOKMAKER_PREMIERBET','betpawa.cm':'PAWATECH',
  '1xbet':'ONEXBET','1xwin':'BOOKMAKER_1XWIN',afropari:'BOOKMAKER_AFROPARI',betclic:'BOOKMAKER_BETCLIC',yellowbet:'BOOKMAKER_YELLOWBET',
  '22bet':'BOOKMAKER_22BET',pmuc:'BOOKMAKER_PMUC',supergooal:'BOOKMAKER_SUPERGOOAL',betwinner:'BOOKMAKER_BETWINNER',melbet:'BOOKMAKER_MELBET',
  bettomax:'BOOKMAKER_BETTOMAX',paripesa:'BOOKMAKER_PARIPESA',onebet:'BOOKMAKER_ONEBET',betsson:'ODDSMATRIX'
};

function envReady(slug){
  const prefix=ADAPTER_PREFIX[slug];
  if(!prefix)return false;
  return Boolean(String(process.env[`${prefix}_API_BASE_URL`]||'').trim()) &&
    Boolean(String(process.env[`${prefix}_BET_PLACE_PATH`]||'').trim()) &&
    Boolean(String(process.env[`${prefix}_ACCESS_TOKEN`]||'').trim()) &&
    String(process.env[`${prefix}_CONTRACT_VERIFIED`]||'').toLowerCase()==='true' &&
    String(process.env[`${prefix}_EXECUTION_AUTHORIZED`]||'').toLowerCase()==='true';
}

export const bookmakerOnboarding = Object.fromEntries(Object.entries(TECHNICAL_ACCESS).map(([slug,item])=>[slug,{
  ...item,
  adapterStatus:'ADAPTER_PREPARED',
  adapterPrefix:ADAPTER_PREFIX[slug],
  immediateTask:envReady(slug)?'VERIFY_CONNECTION_AND_CONTROLLED_EXECUTION':'FIND_OR_CONFIGURE_REAL_ENDPOINT_CREDENTIALS',
  credentials:[`${ADAPTER_PREFIX[slug]}_API_BASE_URL`,`${ADAPTER_PREFIX[slug]}_BET_PLACE_PATH`,`${ADAPTER_PREFIX[slug]}_ACCESS_TOKEN`,`${ADAPTER_PREFIX[slug]}_CONTRACT_VERIFIED`,`${ADAPTER_PREFIX[slug]}_EXECUTION_AUTHORIZED`]
}]));

export function bookmakerOnboardingStatus(){
  return Object.entries(bookmakerOnboarding).map(([slug,item])=>{
    const connected=envReady(slug);
    return {
      bookmaker:slug,
      ...item,
      connectionStatus:connected?'CONNECTION_CONFIGURED':'NOT_CONNECTED',
      state:connected?'CONNECTION_ACTIVE':'ADAPTER_PREPARED',
      configured:connected,
      nextAction:connected?'RUN_CONNECTION_TEST_AND_CONTROLLED_BET':'RESEARCH_AND_CONFIGURE_REAL_TECHNICAL_ACCESS'
    };
  });
}

export function bookmakerOnboardingFor(slug){return bookmakerOnboarding[String(slug||'').trim().toLowerCase()]||null;}
