// Provider-backed bookmaker execution adapters.
// IMPORTANT: this module never invents provider endpoints or credentials.
// An adapter becomes executable only when the provider contract, endpoint, token,
// and explicit authorization flag are supplied through Render environment variables.

import { registerExecutionAdapter } from './execution-adapters.js';

function env(name) { return String(process.env[name] || '').trim(); }
function truthy(name) { return ['1','true','yes','on'].includes(env(name).toLowerCase()); }
function json(value) { try { return JSON.parse(value); } catch { return null; } }

const routes = [
  { slug: 'betsson', provider: 'oddsmatrix', prefix: 'ODDSMATRIX', name: 'Betsson Africa via OddsMatrix / EveryMatrix' },
  { slug: 'betpawa.cm', provider: 'pawatech', prefix: 'PAWATECH', name: 'betPawa Cameroon via pawaTech' },
  { slug: '1xbet', provider: 'onexbet', prefix: 'ONEXBET', name: '1xBet official B2B route' }
];

function configured(route) {
  return Boolean(
    env(`${route.prefix}_API_BASE_URL`) &&
    env(`${route.prefix}_BET_PLACE_PATH`) &&
    env(`${route.prefix}_ACCESS_TOKEN`) &&
    truthy(`${route.prefix}_EXECUTION_AUTHORIZED`)
  );
}

function buildAdapter(route) {
  const base = env(`${route.prefix}_API_BASE_URL`).replace(/\/$/, '');
  const path = env(`${route.prefix}_BET_PLACE_PATH`).startsWith('/')
    ? env(`${route.prefix}_BET_PLACE_PATH`)
    : `/${env(`${route.prefix}_BET_PLACE_PATH`)}`;
  return {
    name: route.name,
    authorized: configured(route),
    documented: configured(route),
    placeBet: async ({ selection, stake, idempotencyKey, signal }) => {
      if (!configured(route)) throw new Error(`${route.prefix}_EXECUTION_CONTRACT_NOT_CONFIGURED`);
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
        return { accepted: false, status: `http_${response.status}`, message: `Provider rejected execution (${response.status})`, raw };
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
  for (const route of routes) {
    const adapter = buildAdapter(route);
    registerExecutionAdapter(route.slug, adapter);
  }
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
    configured: configured(route),
    authorizationFlag: truthy(`${route.prefix}_EXECUTION_AUTHORIZED`),
    endpointConfigured: Boolean(env(`${route.prefix}_API_BASE_URL`) && env(`${route.prefix}_BET_PLACE_PATH`)),
    accessTokenConfigured: Boolean(env(`${route.prefix}_ACCESS_TOKEN`))
  }));
}
