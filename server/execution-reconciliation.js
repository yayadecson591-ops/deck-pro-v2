// Reconciliation state machine for two-leg execution transactions.
// This layer never retries or reverses a bookmaker bet by itself.
// It records what must be reconciled when the two legs do not finish equally.

export const LEG_STATES = Object.freeze(['pending', 'accepted', 'rejected', 'unknown']);
export const TX_STATES = Object.freeze(['running', 'completed', 'partial_failure', 'failed', 'reconciliation_required']);

export function reconcileTwoLegs(transaction) {
  if (!transaction || !Array.isArray(transaction.legs) || transaction.legs.length !== 2) {
    return { ok: false, code: 'INVALID_TWO_LEG_TRANSACTION' };
  }

  const states = transaction.legs.map(leg => String(leg.status || 'unknown'));
  const accepted = states.filter(x => x === 'accepted').length;
  const rejected = states.filter(x => x === 'rejected' || x === 'failed').length;
  const unknown = states.filter(x => x === 'unknown' || x === 'pending').length;

  if (accepted === 2) return { ok: true, state: 'completed', action: 'none' };
  if (accepted === 1 || (accepted === 0 && rejected > 0 && unknown > 0)) {
    return {
      ok: false,
      state: 'reconciliation_required',
      action: 'manual_or_authorized_gateway_reconciliation',
      reason: 'Les deux jambes ne sont pas dans le même état confirmé.'
    };
  }
  if (unknown > 0) {
    return {
      ok: false,
      state: 'reconciliation_required',
      action: 'query_bookmaker_status_before_retry',
      reason: 'Une jambe n’a pas encore un résultat confirmé.'
    };
  }
  return { ok: false, state: 'failed', action: 'none' };
}
