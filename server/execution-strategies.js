// Deck Pro execution strategy registry.
// A route is executable only when a real technical access path and placement
// contract are verified. The registry actively tracks the access path per book.

const names = {
  sportybet:'SportyBet', betmomo:'BetMomo', premierbet:'Premier Bet', 'betpawa.cm':'betPawa Cameroon',
  '1xbet':'1xBet', '1xwin':'1xWin', afropari:'Afropari', betclic:'Betclic Cameroon',
  yellowbet:'Yellow Bet', '22bet':'22Bet', pmuc:'PMUC', supergooal:'Supergooal', betwinner:'BetWinner',
  melbet:'Melbet', bettomax:'Bettomax', paripesa:'PariPesa', onebet:'OneBet', betsson:'Betsson Africa'
};

const channels = ['official_api','user_token','partner_sdk','browser_rpa','android_rpa','deeplink_coupon','authorized_gateway'];
const route = (status='not_verified', enabled=false, note='') => ({ status, verified: status === 'verified', enabled, note });

const strategy = Object.fromEntries(Object.entries(names).map(([slug,name]) => [slug, {
  slug, name,
  channels:Object.fromEntries(channels.map(c => [c, route()])),
  preferred:null, requiresHumanStep:false,
  evidence:[],
  accessStatus:'TECHNICAL_ACCESS_RESEARCH',
  notes:'Recherche active de l’accès technique exploitable pour ce bookmaker. Aucun faux endpoint ni faux accès ne sera créé.'
}]));

// Known technical access evidence. These entries describe real access mechanisms,
// but do not claim that a player account is connected until credentials/contracts exist.
strategy.sportybet.evidence=['official_web','partner_program','booking_code ecosystem'];
strategy.sportybet.notes='Accès web/partenaire et écosystème de booking code identifiés. Placement tiers à vérifier via un contrat/API réellement exploitable.';
strategy.betmomo.evidence=['official_web_app'];
strategy.betmomo.notes='Canaux web/mobile officiels identifiés. Recherche active d’un accès API/partenaire exploitable.';
strategy.premierbet.evidence=['official_partner_program','share_bet_flow'];
strategy.premierbet.preferred='deeplink_coupon';
strategy.premierbet.requiresHumanStep=true;
strategy.premierbet.notes='Le flux Share-Bet/deeplink peut préparer un coupon. L’exécution directe nécessite un canal technique de placement vérifié.';
strategy['betpawa.cm'].evidence=['official_player_web','booking_code_betslip','pawatech_b2b'];
strategy['betpawa.cm'].preferred='partner_sdk';
strategy['betpawa.cm'].notes='Login joueur et betslip/booking code officiels identifiés, ainsi qu’une piste B2B pawaTech. Recherche active du canal de placement exploitable.';
strategy['1xbet'].evidence=['official_partner_program','b2b_route'];
strategy['1xbet'].preferred='partner_sdk';
strategy['1xbet'].notes='Piste B2B/partenaire identifiée. Recherche active du contrat technique et des endpoints réellement utilisables.';
strategy['1xwin'].evidence=['official_web','partner_route_candidate'];
strategy['1xwin'].preferred='partner_sdk';
strategy['1xwin'].notes='Piste partenaire identifiée. Recherche active du canal d’exécution technique.';
strategy.afropari.evidence=['official_web','partner_route_candidate'];
strategy.afropari.preferred='partner_sdk';
strategy.afropari.notes='Canal partenaire à vérifier techniquement.';
strategy.betclic.evidence=['official_web','regional_operator'];
strategy.yellowbet.evidence=['official_web','regional_operator'];
strategy['22bet'].evidence=['official_web','regional_operator'];
strategy.pmuc.evidence=['official_web','regional_operator'];
strategy.supergooal.evidence=['official_web','regional_operator'];
strategy.betwinner.evidence=['official_web','regional_operator'];
strategy.melbet.evidence=['official_web','regional_operator'];
strategy.bettomax.evidence=['official_web','regional_operator'];
strategy.paripesa.evidence=['official_web','regional_operator'];
strategy.onebet.evidence=['official_web','regional_operator'];
strategy.betsson.evidence=['official_web','everymatrix_operator_platform'];
strategy.betsson.preferred='partner_sdk';
strategy.betsson.notes='Betsson Africa est associé à une infrastructure EveryMatrix. Recherche active du canal technique utilisable pour l’intégration et le placement.';

export function executionStrategy(slug) { return strategy[String(slug || '').trim().toLowerCase()] || null; }
export function executionStrategyMatrix() { return Object.values(strategy); }
export function isExecutionChannelVerified(slug, channel) { const s=executionStrategy(slug); return Boolean(s?.channels?.[channel]?.verified && s.channels[channel].enabled); }
export function supportedChannels() { return [...channels]; }
export function executionResearchStatus() { return Object.values(strategy).map(s=>({bookmaker:s.slug,name:s.name,preferred:s.preferred,accessStatus:s.accessStatus,evidence:s.evidence,requiresHumanStep:s.requiresHumanStep,channels:s.channels,notes:s.notes})); }
