// Deck Pro execution strategy matrix.
// IMPORTANT: these are capability slots, not claims that a bookmaker authorizes every channel.
// A channel must be verified/authorized before it can be enabled for real-money execution.

const names = {
  sportybet: 'SportyBet',
  betmomo: 'BetMomo',
  premierbet: 'Premier Bet',
  'betpawa.cm': 'betPawa Cameroon',
  '1xbet': '1xBet',
  '1xwin': '1xWin',
  afropari: 'Afropari'
};

const channels = ['official_api', 'user_token', 'partner_sdk', 'browser_rpa', 'android_rpa', 'deeplink_coupon', 'authorized_gateway'];

// Start conservatively: only explicitly configured channels are executable.
// Unknown channels remain disabled until their bookmaker-specific flow is verified.
const strategy = Object.fromEntries(Object.keys(names).map(slug => [slug, {
  slug,
  name: names[slug],
  channels: Object.fromEntries(channels.map(channel => [channel, { verified: false, enabled: false }])),
  preferred: null,
  requiresHumanStep: false,
  notes: 'Not yet verified for real-money placement.'
}]));

export function executionStrategy(slug) {
  return strategy[String(slug || '').trim().toLowerCase()] || null;
}

export function executionStrategyMatrix() {
  return Object.values(strategy);
}

export function isExecutionChannelVerified(slug, channel) {
  const s = executionStrategy(slug);
  return Boolean(s?.channels?.[channel]?.verified && s.channels[channel].enabled);
}

export function supportedChannels() {
  return [...channels];
}
