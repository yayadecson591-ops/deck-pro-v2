// Deck Pro real-access execution adapter registry.
// One adapter slot is prepared for EACH configured bookmaker.
// No endpoint, token or credential is invented here.
// A route becomes executable only after its real technical contract is supplied.

import { registerExecutionAdapter } from './execution-adapters.js';

function env(name) { return String(process.env[name] || '').trim(); }
function truthy(name) { return ['1','true','yes','on'].includes(env(name).toLowerCase()); }
function json(value) { try { return JSON.parse(value); } catch { return null; } }
function prefix(slug) { return slug.toUpperCase().replace(/[^A-Z0-9]/g, '_'); }

const definitions = [
  ['sportybet','SportyBet','BOOKMAKER'],
  ['betmomo','BetMomo','BOOKMAKER'],
  ['premierbet','Premier Bet','BOOKMAKER'],
  ['betpawa.cm','betPawa Cameroon','PAWATECH'],
  ['1xbet','1xBet','ONEXBET'],
  ['1xwin','1xWin','BOOKMAKER'],
  ['afropari','Afropari','BOOKMAKER'],
  ['betclic','Betclic Cameroon','BOOKMAKER'],
  ['yellowbet','Yellow Bet','BOOKMAKER'],
  ['22bet','22Bet','BOOKMAKER'],
  ['pmuc','PMUC','BOOKMAKER'],
  ['supergooal','Supergooal','BOOKMAKER'],
  ['betwinner','BetWinner','BOOKMAKER'],
  ['melbet','Melbet','BOOKMAKER'],
  ['bettomax','Bettomax','BOOKMAKER'],
  ['paripesa','PariPesa','BOOKMAKER'],
  ['onebet','OneBet','BOOKMAKER'],
  ['betsson','Betsson Africa','ODDSMATRIX']
];

function routeConfig([slug,name,provider]) {
  const p = provider === 'BOOKMAKER' ? `BOOKMAKER_${prefix(slug)}` : provider;
  return { slug, name, provider, prefix:p };
}

const routes = definitions.map(routeConfig);

function configured(route) {
  return Boolean(
    env(`${route.prefix}_API_BASE_URL`) &&
    env(`${route.prefix}_BET_PLACE_PATH`) &&
    env(`${route.prefix}_ACCESS_TOKEN`) &&
    truthy(`${route.prefix}_CONTRACT_VERIFIED`) &&
    truthy(`${route.prefix}_EXECUTION_AUTHORIZED`)
  );
}

function buildAdapter(route) {
  return {
    name: `${route.name} execution adapter`,
    authorized: configured(route),
    documented: configured(route),
    placeBet: async ({ selection, stake, idempotencyKey, signal }) => {
      if (!configured(route)) throw new Error(`${route.prefix}_EXECUTION_CONTRACT_NOT_CONFIGURED`);
      const base = env(`${route.prefix}_API_BASE_URL`).replace(/\/$/, '');
      const configuredPath = env(`${route.prefix}_BET_PLACE_PATH`);
      const path = configuredPath.startsWith('/') ? configuredPath : `/${configuredPath}`;
      const headers = {
        authorization: `Bearer ${env(`${route.prefix}_ACCESS_TOKEN`)}`,
        'content-type': 'application/json',
        'idempotency-key': String(idempotencyKey)
      };
      const extra = json(env(`${route.prefix}_EXTRA_HEADERS_JSON`));
      if (extra && typeof extra === 'object' && !Array.isArray(extra)) Object.assign(headers, extra);
      const response = await fetch(`${base}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ selection, stake, idempotencyKey }),
        signal
      });
      const rawText = await response.text();
      const raw = json(rawText) ?? rawText;
      if (!response.ok) {
        return { accepted:false, status:`http_${response.status}`, message:`Bookmaker rejected execution (${response.status})`, raw };
      }
      return {
        accepted: raw?.accepted === true || raw?.status === 'accepted' || raw?.status === 'placed' || raw?.betId != null,
        betId: raw?.betId ?? raw?.id ?? null,
        status: raw?.status ?? (raw?.accepted === true ? 'accepted' : 'unknown'),
        message: raw?.message ?? null,
        raw
      };
    }
  };
}

export function registerProviderExecutionAdapters() {
  for (const route of routes) registerExecutionAdapter(route.slug, buildAdapter(route));
  return routes.map(route => ({
    bookmaker: route.slug,
    provider: route.provider,
    configured: configured(route),
    envPrefix: route.prefix
  }));
}

export function providerExecutionAdapterStatus() {
  return routes.map(route => ({
    bookmaker: route.slug,
    provider: route.provider,
    envPrefix: route.prefix,
    configured: configured(route),
    contractVerified: truthy(`${route.prefix}_CONTRACT_VERIFIED`),
    executionAuthorized: truthy(`${route.prefix}_EXECUTION_AUTHORIZED`),
    endpointConfigured: Boolean(env(`${route.prefix}_API_BASE_URL`) && env(`${route.prefix}_BET_PLACE_PATH`)),
    accessTokenConfigured: Boolean(env(`${route.prefix}_ACCESS_TOKEN`)),
    ready: configured(route)
  }));
}
