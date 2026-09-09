// Deck Pro official/B2B provider integration registry.
// This registry intentionally separates a real execution contract from research evidence.
// A provider route becomes executable only after the provider grants credentials/authorization
// and the exact production contract is configured in Render environment variables.

export const providerIntegrations = {
  databet: {
    name: 'DATA.BET',
    scope: 'B2B sportsbook operator/platform',
    auth: 'OAuth2 client_id/client_secret + IP whitelist',
    production: 'https://betting.databet.cloud',
    credentials: ['DATABET_CLIENT_ID','DATABET_CLIENT_SECRET'],
    required: ['DATABET_CALLBACK_URL','DATABET_ALLOWED_IP'],
    placementContract: 'Bet API / bet lifecycle callbacks',
    bookmakers: [],
    status: 'ONBOARDING_REQUIRED'
  },
  oddsmatrix: {
    name: 'OddsMatrix / EveryMatrix',
    scope: 'B2B sportsbook platform / sportsbook operator technology',
    auth: 'Commercial onboarding; provider-issued credentials',
    credentials: ['ODDSMATRIX_CLIENT_ID','ODDSMATRIX_CLIENT_SECRET'],
    required: ['ODDSMATRIX_API_BASE_URL'],
    placementContract: 'Provider-specific sportsbook bet placement contract',
    bookmakers: ['betsson'],
    status: 'ONBOARDING_REQUIRED'
  },
  pawatech: {
    name: 'pawaTech / betPawa',
    scope: 'B2B sportsbook and player-management platform',
    auth: 'Commercial/partner onboarding; provider-issued credentials',
    credentials: ['PAWATECH_CLIENT_ID','PAWATECH_CLIENT_SECRET'],
    required: ['PAWATECH_API_BASE_URL'],
    placementContract: 'Provider-specific sportsbook placement contract',
    bookmakers: ['betpawa.cm'],
    status: 'ONBOARDING_REQUIRED'
  },
  premierbet: {
    name: 'Premier Bet',
    scope: 'Bookmaker partner/deeplink integration',
    auth: 'Official partner authorization',
    credentials: ['PREMIERBET_CLIENT_ID','PREMIERBET_CLIENT_SECRET'],
    required: ['PREMIERBET_API_BASE_URL'],
    placementContract: 'Only after Premier Bet explicitly authorizes placement',
    bookmakers: ['premierbet'],
    status: 'AUTHORIZATION_REQUIRED'
  },
  onexbet: {
    name: '1xBet',
    scope: 'Bookmaker B2B/partner integration',
    auth: 'Official B2B/partner onboarding; provider-issued credentials',
    credentials: ['ONEXBET_CLIENT_ID','ONEXBET_CLIENT_SECRET'],
    required: ['ONEXBET_API_BASE_URL'],
    placementContract: 'Only after 1xBet grants an execution contract',
    bookmakers: ['1xbet'],
    status: 'AUTHORIZATION_REQUIRED'
  }
};

export function providerStatus() {
  return Object.entries(providerIntegrations).map(([id,p]) => ({
    id,
    ...p,
    configured: p.credentials.every(k => Boolean(process.env[k])) && p.required.every(k => Boolean(process.env[k])),
    credentialsConfigured: p.credentials.every(k => Boolean(process.env[k])),
    requiredConfigComplete: p.required.every(k => Boolean(process.env[k]))
  }));
}

export function providerForBookmaker(bookmaker) {
  const slug=String(bookmaker||'').trim().toLowerCase();
  return Object.entries(providerIntegrations).find(([,p])=>p.bookmakers.includes(slug)) || null;
}
