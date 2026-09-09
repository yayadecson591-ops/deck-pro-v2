# Deck Pro — EveryMatrix / Betsson placement research — 2026-09-09

## Result
A public technical placement specification for Betsson Cameroon / EveryMatrix was NOT found.

## Verified evidence
1. EveryMatrix states that Betsson Cameroon launched on its turnkey platform in 2026 and that the sportsbook setup included API-based delivery.
2. EveryMatrix states that the Cameroon platform supports the real customer journey including registration, deposit, bet placement and withdrawal.
3. EveryMatrix describes its broader platform as API-first.
4. OddsMatrix publicly documents sports data APIs/feeds using HTTP pull and TCP push, with real-time odds and automatic settlement. These are data/settlement feeds, not a documented third-party bet-placement endpoint for Betsson Cameroon.
5. A public EveryMatrix retail betslip package documents a `placebet` browser/widget event for successfully placed bets. This is evidence of a client-side/retail betslip integration mechanism, NOT evidence of a server-side production endpoint that Deck Pro can call for Betsson Cameroon.

## Not found publicly
- Betsson Cameroon production bet-placement URL
- EveryMatrix/Betsson client authentication specification for Deck Pro
- client ID/secret or access token
- exact bet placement request schema for the Cameroon operator
- exact bet placement response schema for that operator
- production settlement/reconciliation webhook contract for Deck Pro

## Engineering consequence
Do NOT configure a guessed endpoint. Keep Betsson adapter fail-closed. The next technical target is obtaining the operator/provider integration package that contains the sportsbook bet-placement API and authentication contract, then map it into `provider-execution-adapters.js` and test it through the existing preflight/execution/reconciliation engine.

## Sources
- https://everymatrix.com/case-studies/launching-a-scalable-platform-for-betsson-cameroon-and-beyond/
- https://everymatrix.com/news/everymatrix-platform-technology-live-with-betsson-africa-in-cameroon/
- https://oddsmatrix.com/faq/
- https://omfeeds.everymatrix.com/integration/
- Public package evidence: @everymatrix/retail-betslip (npm)
