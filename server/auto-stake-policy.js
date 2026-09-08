// Final decision gate for automatic stakes. Fail closed by design.
export function decideAutoStake({ userAuthenticated, autoStakeEnabled, confirmationValid, pairValid, executionReady }) {
  const checks = { userAuthenticated: !!userAuthenticated, autoStakeEnabled: !!autoStakeEnabled, confirmationValid: !!confirmationValid, pairValid: !!pairValid, executionReady: !!executionReady };
  const allowed = Object.values(checks).every(Boolean);
  return { allowed, decision: allowed ? 'ALLOW' : 'DENY', checks, reason: Object.entries(checks).filter(([,ok]) => !ok).map(([name]) => name) };
}
