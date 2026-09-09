# Deck Pro — EveryMatrix B2B Sportsbook Package Request — 2026-09-09

## Objective
Obtain the real EveryMatrix/OddsMatrix Sports Web API / sportsbook integration package required to connect Deck Pro to an operator using the platform, with Betsson Africa / Cameroon as the identified target.

## Why this is the correct target
EveryMatrix publicly states that its clients can build a sportsbook front end on its Web API and that its sportsbook is API-driven. EveryMatrix also confirms that Betsson Cameroon was launched on its turnkey platform with API-based sportsbook delivery.

## Required package
Request the operator/provider technical integration package containing:

1. Sports Web API / sportsbook API documentation (current production version).
2. Environment/base URLs for sandbox and production.
3. Authentication mechanism and credential format.
4. Player/session context required for sportsbook actions.
5. Bet placement operation: endpoint/method, headers, request schema, selection/market identifiers, odds validation and stake fields.
6. Bet placement response: accepted/rejected status, bet/ticket ID, price/odds, timestamps and error model.
7. Idempotency/retry rules.
8. Preflight/quote/price validation requirements before placement.
9. Cancel/void/revoke rules where supported.
10. Settlement and reconciliation API/webhook contract.
11. Bet status lifecycle and event/webhook model.
12. Rate limits, timeout requirements and IP allowlisting.
13. Sandbox credentials and test scenarios.
14. Versioning and backward-compatibility policy.

## Deck Pro integration contract
The existing adapter will remain fail-closed until the package is received and verified. No endpoint, credential, payload or response is guessed.

Expected mapping into `server/provider-execution-adapters.js`:

- API base URL
- bet placement path/method
- authentication headers/token strategy
- exact placement payload builder
- exact response normalization
- idempotency strategy
- reconciliation/status handler
- controlled test configuration

## Verification gate
EveryMatrix/Betsson becomes executable only after:

- production or sandbox endpoint is verified;
- credentials are supplied through secure Render environment variables;
- exact request/response contract is mapped;
- a controlled test placement is accepted;
- returned bet/ticket ID is captured;
- settlement/reconciliation is confirmed.

## Current status
The public web research confirms the existence of the API-driven Sports Web API architecture, but the operator-specific production placement package is not publicly exposed. Public OddsMatrix feed documentation is not sufficient for bet placement.

## Sources
- https://everymatrix.com/case-studies/launching-a-scalable-platform-for-betsson-cameroon-and-beyond/
- https://everymatrix.com/certified-partners/
- https://everymatrix.com/turnkey/
- https://everymatrix.com/gammatrix/
