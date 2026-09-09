// Official B2B execution-provider registry for Deck Pro.
// This registry never treats a provider/data feed as a player-account connection.
// A provider becomes executable only after commercial authorization, credentials,
// IP allowlisting/certification (when required), and a successful controlled test.

const providers = {
  databet: {
    name: 'DATA.BET Sportsbook',
    env: ['DATABET_CLIENT_ID','DATABET_CLIENT_SECRET','DATABET_PRODUCTION_BASE_URL'],
    capabilities: ['betting_api','bet_callbacks','token_management','bet_reports'],
    status: 'credentials_required',
    source: 'https://docs.data.bet/betting/getting-started/'
  },
  everymatrix: {
    name: 'EveryMatrix / OddsMatrix',
    env: ['EVERYMATRIX_CLIENT_ID','EVERYMATRIX_CLIENT_SECRET','EVERYMATRIX_PRODUCTION_BASE_URL'],
    capabilities: ['sportsbook_platform','bet_placement','risk_management','settlement'],
    status: 'commercial_authorization_required',
    source: 'https://everymatrix.com/'
  },
  pawatech: {
    name: 'pawaTech / betPawa',
    env: ['PAWATECH_CLIENT_ID','PAWATECH_CLIENT_SECRET','PAWATECH_PRODUCTION_BASE_URL'],
    capabilities: ['sportsbook','player_management','wallets','integrations'],
    status: 'commercial_authorization_required',
    source: 'https://www.pawatech.com/'
  },
  onexbet_b2b: {
    name: '1xBet B2B',
    env: ['ONEXBET_B2B_CLIENT_ID','ONEXBET_B2B_CLIENT_SECRET','ONEXBET_B2B_PRODUCTION_BASE_URL'],
    capabilities: ['b2b_partnership'],
    status: 'commercial_authorization_required',
    source: 'https://1xbet-team.com/'
  }
};

function configured(p) {
  return p.env.filter(k => String(process.env[k] || '').trim()).length;
}

export function b2bProviderStatus() {
  return Object.entries(providers).map(([id,p]) => ({
    id,
    name: p.name,
    capabilities: p.capabilities,
    source: p.source,
    configuredSecrets: configured(p),
    requiredSecrets: p.env.length,
    credentialsReady: configured(p) === p.env.length,
    status: configured(p) === p.env.length ? 'credentials_present_awaiting_verification' : p.status,
    executable: false
  }));
}

export function b2bProvider(id) { return providers[String(id || '').trim().toLowerCase()] || null; }
