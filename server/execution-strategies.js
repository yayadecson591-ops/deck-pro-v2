// Deck Pro execution strategy registry.
// A route is only executable when its contract/authorization is verified for the
// bookmaker and the user's account. Affiliate programs alone do NOT authorize bet placement.

const names = {
  sportybet: 'SportyBet',
  betmomo: 'BetMomo',
  premierbet: 'Premier Bet',
  'betpawa.cm': 'betPawa Cameroon',
  '1xbet': '1xBet',
  '1xwin': '1xWin',
  afropari: 'Afropari'
};

const channels = [
  'official_api',
  'user_token',
  'partner_sdk',
  'browser_rpa',
  'android_rpa',
  'deeplink_coupon',
  'authorized_gateway'
];

const route = (status='unknown', enabled=false, note='') => ({ status, verified: status === 'verified', enabled, note });

// Research-backed access routes. "partner_program" is deliberately represented
// separately from an execution channel: affiliation/traffic tracking is not bet placement.
const strategy = {
  sportybet: {
    slug:'sportybet', name:names.sportybet,
    channels:Object.fromEntries(channels.map(c => [c, route()])),
    preferred:null, requiresHumanStep:false,
    evidence:['official_partner_program'],
    notes:'Official partner program found. No public official bet-placement API or partner execution contract verified yet. Web automation must not be enabled without explicit authorization.'
  },
  betmomo: {
    slug:'betmomo', name:names.betmomo,
    channels:Object.fromEntries(channels.map(c => [c, route()])),
    preferred:null, requiresHumanStep:false,
    evidence:['official_web_app_channels'],
    notes:'Official web/mobile/phone betting channels found. No public official execution API, SDK or authorized third-party placement route verified yet.'
  },
  premierbet: {
    slug:'premierbet', name:names.premierbet,
    channels:Object.fromEntries(channels.map(c => [c, route()])),
    preferred:'deeplink_coupon', requiresHumanStep:true,
    evidence:['official_partner_program','official_share_bet_flow'],
    notes:'Official partner program found. Share-Bet/deep-link flow is useful for prefilled coupons, but final automatic placement is not yet verified; keep execution disabled until an execution contract is confirmed.'
  },
  'betpawa.cm': {
    slug:'betpawa.cm', name:names['betpawa.cm'],
    channels:Object.fromEntries(channels.map(c => [c, route()])),
    preferred:'partner_sdk', requiresHumanStep:false,
    evidence:['pawatech_b2b_platform'],
    notes:'pawaTech publicly provides sportsbook/player-management SaaS and turnkey operator solutions. This establishes a B2B technology route, not a player-account bet-placement API. User-level execution remains disabled until written authorization/technical contract exists.'
  },
  '1xbet': {
    slug:'1xbet', name:names['1xbet'],
    channels:Object.fromEntries(channels.map(c => [c, route()])),
    preferred:'partner_sdk', requiresHumanStep:false,
    evidence:['official_partner_program','official_partner_integration_lead'],
    notes:'Official partner program exists. Do not treat affiliate feeds or user session tokens as a placement API. Execution requires a verified operator/B2B contract or documented authorized account-execution interface.'
  },
  '1xwin': {
    slug:'1xwin', name:names['1xwin'],
    channels:Object.fromEntries(channels.map(c => [c, route()])),
    preferred:'partner_sdk', requiresHumanStep:false,
    evidence:['official_partner_program','partner_api_lead'],
    notes:'Partner/API integration lead found, but placement permission is not yet proven. Keep disabled until the API contract explicitly permits bet placement for the relevant player accounts.'
  },
  afropari: {
    slug:'afropari', name:names.afropari,
    channels:Object.fromEntries(channels.map(c => [c, route()])),
    preferred:'partner_sdk', requiresHumanStep:false,
    evidence:['official_partner_program'],
    notes:'Official affiliate program and partner tooling found. Affiliate links/promo codes are acquisition tools, not bet-placement APIs. Execution remains disabled pending an authorized execution interface.'
  }
};

export function executionStrategy(slug) {
  return strategy[String(slug || '').trim().toLowerCase()] || null;
}

export function executionStrategyMatrix() { return Object.values(strategy); }

export function isExecutionChannelVerified(slug, channel) {
  const s = executionStrategy(slug);
  return Boolean(s?.channels?.[channel]?.verified && s.channels[channel].enabled);
}

export function supportedChannels() { return [...channels]; }

export function executionResearchStatus() {
  return Object.values(strategy).map(s => ({
    bookmaker:s.slug,
    name:s.name,
    preferred:s.preferred,
    evidence:s.evidence,
    requiresHumanStep:s.requiresHumanStep,
    channels:s.channels,
    notes:s.notes
  }));
}
