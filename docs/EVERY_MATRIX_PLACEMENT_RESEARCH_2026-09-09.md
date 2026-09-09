# Deck Pro — EveryMatrix / Betsson placement research — 2026-09-09

## Evolution phase
The research has moved from the public Odds Feed layer to the **sportsbook B2B / operator-integration layer**.

The objective is not to discover a generic odds API. The objective is to identify the real sportsbook integration package used by an operator, including the bet-placement contract, authentication, response and settlement/reconciliation interfaces.

## Result
A public technical placement specification for Betsson Cameroon / EveryMatrix was NOT found.

## Verified evidence
1. EveryMatrix states that Betsson Cameroon launched on its turnkey platform in 2026 and that the sportsbook setup included API-based delivery.
2. EveryMatrix states that the Cameroon platform supports the real customer journey including registration, deposit, bet placement and withdrawal.
3. EveryMatrix describes its broader platform as API-first.
4. EveryMatrix's current GamMatrix product page explicitly advertises **full API access for custom front-end development**. This confirms that the relevant integration layer exists, but the production contract is not exposed as a public generic API specification.
5. EveryMatrix's current integration page describes modular access to sportsbook online/retail, horse racing, odds feeds and risk management. This reinforces the distinction between the sportsbook integration layer and the separate odds-feed layer.
6. EveryMatrix's official contact flow distinguishes **Sports (Online, retail betting)** from **Sports (Odds feeds)**. For Deck Pro's automatic-placement objective, the target is the first category, not merely Odds Feeds.
7. EveryMatrix's 2024 corporate presentation states that OddsMatrix's architecture handles bet placement, risk management and bet settlement at scale. This verifies platform capability but does not expose a third-party production placement contract for Betsson Cameroon.
8. OddsMatrix publicly documents sports data APIs/feeds using HTTP pull and TCP push, with real-time odds and automatic settlement. These are data/settlement feeds, not a documented third-party bet-placement endpoint for Betsson Cameroon.
9. A public EveryMatrix retail betslip package documents a `placebet` browser/widget event for successfully placed bets. This is evidence of a client-side/retail betslip integration mechanism, NOT evidence of a server-side production endpoint that Deck Pro can call for Betsson Cameroon.

## Not found publicly
- Betsson Cameroon production bet-placement URL
- EveryMatrix/Betsson client authentication specification for Deck Pro
- client ID/secret or access token
- exact bet placement request schema for the Cameroon operator
- exact bet placement response schema for that operator
- production settlement/reconciliation webhook contract for Deck Pro
- public Swagger/OpenAPI package exposing the above contract

## Evolution procedure now active
1. Treat EveryMatrix **Sportsbook / Online & Retail Betting** as the target integration layer.
2. Keep OddsMatrix feed documentation only as supporting evidence; do not mistake it for a placement API.
3. Search public SDK/package/repository material for contract names, schemas and integration artifacts without attempting to bypass access controls.
4. Use EveryMatrix's official B2B Sports contact path as the legitimate route for the operator/provider integration package when public material is insufficient.
5. Once the real package is obtained, extract only the technical contract needed by Deck Pro: authentication, placement endpoint, request/response, bet ID, acceptance/rejection states, cancellation/void, settlement and reconciliation callbacks.
6. Map that contract into `provider-execution-adapters.js` only after the contract is verified.
7. Run the existing preflight, two-leg execution and reconciliation tests before any production activation.

## Engineering consequence
Do NOT configure a guessed endpoint. Keep Betsson adapter fail-closed. The next technical target is the real operator/provider sportsbook integration package, then map it into `provider-execution-adapters.js` and test it through the existing preflight/execution/reconciliation engine.

## Official sources
- https://everymatrix.com/case-studies/launching-a-scalable-platform-for-betsson-cameroon-and-beyond/
- https://everymatrix.com/news/everymatrix-platform-technology-live-with-betsson-africa-in-cameroon/
- https://everymatrix.com/gammatrix/
- https://everymatrix.com/gammatrix/integrations/
- https://everymatrix.com/contact/
- https://everymatrix.com/turnkey/
- https://everymatrix.com/wp-content/uploads/2025/01/EveryMatrix-Q4-2024-Presentation.pdf
- https://oddsmatrix.com/faq/
- https://omfeeds.everymatrix.com/integration/
- Public package evidence: @everymatrix/retail-betslip
