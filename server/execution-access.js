// Deck Pro persistent bookmaker access runtime.
// Resolves the user's already-saved connection without exposing secrets.
// It never invents endpoints or bypasses bookmaker security.

import { getBookmakerConnection } from './db/index.js';

const SECRET_FIELDS = new Set(['password','token','apiKey','clientSecret','sessionToken','accessToken']);

function clean(value) {
  if (!value || typeof value !== 'object') return {};
  return Object.fromEntries(Object.entries(value).filter(([key, val]) =>
    val != null && String(val).length && (key === 'username' || key === 'identifier' || SECRET_FIELDS.has(key) || key === 'clientId')
  ));
}

export async function resolveBookmakerAccess({ userId, connectionId, bookmaker }) {
  if (!userId || !connectionId) return { ok:false, code:'BOOKMAKER_CONNECTION_REQUIRED' };
  const row = await getBookmakerConnection(userId, connectionId);
  if (!row) return { ok:false, code:'BOOKMAKER_CONNECTION_NOT_FOUND' };
  if (String(row.bookmaker_slug).toLowerCase() !== String(bookmaker || '').trim().toLowerCase()) {
    return { ok:false, code:'BOOKMAKER_CONNECTION_MISMATCH' };
  }
  const credentials = clean(row.credentials);
  const token = row.token || credentials.accessToken || credentials.sessionToken || credentials.token || null;
  return { ok:true, connectionId:row.id, bookmaker:row.bookmaker_slug, channel:row.access_channel,
    accountLabel:row.account_label || null, status:row.status, autoBetEnabled:Boolean(row.auto_bet_enabled), credentials, token };
}

export function redactBookmakerAccess(access) {
  if (!access) return null;
  const credentials = Object.fromEntries(Object.entries(access.credentials || {}).map(([key,value]) => [key, SECRET_FIELDS.has(key) ? '[stored]' : String(value)]));
  return { ...access, credentials, token:access.token ? '[stored]' : null };
}
