// Optional real execution adapter for Betfair Exchange.
// Uses the documented JSON-RPC placeOrders contract. It remains disabled until
// the user supplies an app key + session token and explicitly enables it.

function env(name) { return String(process.env[name] || '').trim(); }

export function betfairConfigured() {
  return Boolean(
    env('BETFAIR_APP_KEY') &&
    env('BETFAIR_SESSION_TOKEN') &&
    ['1','true','yes','on'].includes(env('BETFAIR_EXECUTION_ENABLED').toLowerCase())
  );
}

export async function placeBetfairOrder({ marketId, selectionId, stake, price, side='BACK', persistenceType='LAPSE', customerRef, signal }) {
  if (!betfairConfigured()) throw new Error('BETFAIR_EXECUTION_NOT_CONFIGURED');
  if (!marketId || !selectionId) throw new Error('BETFAIR_MARKET_AND_SELECTION_REQUIRED');
  if (!Number.isFinite(Number(stake)) || Number(stake) <= 0) throw new Error('BETFAIR_INVALID_STAKE');
  if (!Number.isFinite(Number(price)) || Number(price) <= 1) throw new Error('BETFAIR_INVALID_PRICE');

  const response = await fetch('https://api.betfair.com/exchange/betting/json-rpc/v1', {
    method: 'POST',
    headers: {
      'X-Application': env('BETFAIR_APP_KEY'),
      'X-Authentication': env('BETFAIR_SESSION_TOKEN'),
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'SportsAPING/v1.0/placeOrders',
      params: {
        marketId: String(marketId),
        instructions: [{
          selectionId: Number(selectionId),
          side: String(side).toUpperCase(),
          orderType: 'LIMIT',
          limitOrder: {
            size: Number(stake),
            price: Number(price),
            persistenceType: String(persistenceType).toUpperCase()
          }
        }],
        customerRef: String(customerRef || '').slice(0, 32)
      },
      id: 1
    }),
    signal
  });

  const rawText = await response.text();
  let raw; try { raw = JSON.parse(rawText); } catch { raw = rawText; }
  if (!response.ok) return { accepted:false, status:`http_${response.status}`, message:'Betfair HTTP error', raw };

  const result = raw?.result;
  const report = result?.instructionReports?.[0];
  const accepted = result?.status === 'SUCCESS' && report?.status === 'SUCCESS' && Boolean(report?.betId);
  return {
    accepted,
    betId: report?.betId ?? null,
    status: report?.status ?? result?.status ?? 'unknown',
    placedAt: report?.placedDate ?? new Date().toISOString(),
    message: report?.errorCode ?? null,
    raw
  };
}
