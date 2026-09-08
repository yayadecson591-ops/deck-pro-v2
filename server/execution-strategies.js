// Deck Pro execution strategy registry.
// A route is only executable when its contract/authorization is verified for the
// bookmaker and the user's account. Affiliate programs alone do NOT authorize bet placement.

const names = {
  sportybet:'SportyBet', betmomo:'BetMomo', premierbet:'Premier Bet', 'betpawa.cm':'betPawa Cameroon',
  '1xbet':'1xBet', '1xwin':'1xWin', afropari:'Afropari', betclic:'Betclic Cameroon',
  yellowbet:'Yellow Bet', '22bet':'22Bet', pmuc:'PMUC', supergooal:'Supergooal', betwinner:'BetWinner',
  melbet:'Melbet', bettomax:'Bettomax', paripesa:'PariPesa', onebet:'OneBet', betsson:'Betsson Africa'
};

const channels = ['official_api','user_token','partner_sdk','browser_rpa','android_rpa','deeplink_coupon','authorized_gateway'];
const route = (status='unknown', enabled=false, note='') => ({ status, verified: status === 'verified', enabled, note });

const strategy = Object.fromEntries(Object.entries(names).map(([slug,name]) => [slug, {
  slug, name,
  channels:Object.fromEntries(channels.map(c => [c, route()])),
  preferred:null, requiresHumanStep:false,
  evidence:[],
  notes:'Bookmaker ajouté à la couverture Deck Pro. Une intégration de mise réelle ne sera activée qu’après vérification d’un canal officiel/API/B2B et de l’autorisation de placement pour le compte concerné.'
}]));

// Existing research already recorded in Deck Pro. These remain disabled until an
// explicit placement contract is verified; affiliate/partner programs alone do not authorize bets.
strategy.sportybet.evidence=['official_partner_program'];
strategy.sportybet.notes='Programme partenaire officiel identifié. Aucun contrat public de placement de paris vérifié dans le projet à ce stade.';
strategy.betmomo.evidence=['official_web_app_channels'];
strategy.betmomo.notes='Canaux web/mobile officiels identifiés. Aucun canal officiel de placement tiers vérifié dans le projet à ce stade.';
strategy.premierbet.evidence=['official_partner_program','official_share_bet_flow'];
strategy.premierbet.preferred='deeplink_coupon';
strategy.premierbet.requiresHumanStep=true;
strategy.premierbet.notes='Partenaire et Share-Bet identifiés ; le deep-link peut préparer un coupon, mais le placement automatique final reste à autoriser/vérifier.';
strategy['betpawa.cm'].evidence=['pawatech_b2b_platform'];
strategy['betpawa.cm'].preferred='partner_sdk';
strategy['betpawa.cm'].notes='Route B2B pawaTech identifiée. Elle ne vaut pas automatiquement autorisation de placer des paris sur un compte joueur ; contrat d’exécution requis.';
strategy['1xbet'].evidence=['official_partner_program'];
strategy['1xbet'].preferred='partner_sdk';
strategy['1xbet'].notes='Programme partenaire identifié. Les flux affiliés ou sessions utilisateur ne sont pas considérés comme API de placement ; contrat autorisé requis.';
strategy['1xwin'].evidence=['official_partner_program'];
strategy['1xwin'].preferred='partner_sdk';
strategy['1xwin'].notes='Piste partenaire/API identifiée ; placement réel désactivé tant que le droit de placement n’est pas explicitement vérifié.';
strategy.afropari.evidence=['official_partner_program'];
strategy.afropari.preferred='partner_sdk';
strategy.afropari.notes='Outillage partenaire identifié ; affiliation seule ≠ droit de placement. Canal d’exécution officiel à vérifier.';

export function executionStrategy(slug) { return strategy[String(slug || '').trim().toLowerCase()] || null; }
export function executionStrategyMatrix() { return Object.values(strategy); }
export function isExecutionChannelVerified(slug, channel) { const s=executionStrategy(slug); return Boolean(s?.channels?.[channel]?.verified && s.channels[channel].enabled); }
export function supportedChannels() { return [...channels]; }
export function executionResearchStatus() { return Object.values(strategy).map(s=>({bookmaker:s.slug,name:s.name,preferred:s.preferred,evidence:s.evidence,requiresHumanStep:s.requiresHumanStep,channels:s.channels,notes:s.notes})); }
