# Deck Pro — Automatic Execution Handoff

## Current progress
- Global Deck Pro: 99.8% — final finishing phase.
- Automatic betting execution: ~80% — continue from this level, do not restart.

## Objective
The only target for this workstream is real automatic betting execution through an official/authorized bookmaker route. Do not mark a bookmaker ACTIF unless the real route, endpoint, secure credentials, execution contract, and controlled accepted test are all verified.

## Execution architecture
Odds/data -> Radar/Pronostics -> calculations/arbitrage -> total configurable stake per operation -> coupon/preflight -> official/B2B bookmaker adapter -> real placement -> accepted result/reconciliation.

## Fail-closed rule
`placeAuthorizedBet()` must refuse execution unless a verified route exists, required user token/credentials are present, and the adapter is both authorized and documented. Never use scraping, reverse engineering, bypasses, fake credentials, or invented endpoints.

## 18 bookmakers
sportybet, betmomo, premierbet, betpawa.cm, 1xbet, 1xwin, afropari, betclic, yellowbet, 22bet, pmuc, supergooal, betwinner, melbet, bettomax, paripesa, onebet, betsson.

## Priority routes already identified
- betPawa Cameroon -> pawaTech B2B
- Betsson Africa -> EveryMatrix/OddsMatrix
- 1xBet -> official B2B partnership
- Premier Bet -> official partner/API/deeplink

These are identified routes, not yet proof that Deck Pro has execution credentials/contracts. Automation stays OFF until verification and a controlled accepted placement.

## Key backend files/commits
- `server/execution.js` — SHA `5f382e2897e6423f4a03505771c74e6623a8fbec`
- `server/execution-adapters.js` — SHA `629a9eead3594419586714eb92ffb65af4b11feb`
- `server/provider-execution-adapters.js` — SHA `664068ebcd2972ddc69cba16d17f5bb67f23f3e6`
- `server/bookmaker-onboarding.js` — SHA `435fbbc8d3c91eb39224abdbf509123c1f866307`
- `server/provider-integrations.js` — SHA `49cf90ed282bbd75ee3a156a9ea119fa22578bfb`
- latest known repo commit: `f624898d0a952111de2cb2873fae30ab44c0e61a`

## Important execution endpoints
- `/api/execution/capabilities`
- `/api/execution/onboarding`
- `/api/execution/provider-adapters`
- `/api/execution/engine-status`
- `/api/execution/preflight`
- `/api/execution/place-authorized`
- `/api/execution/place-two`
- `/api/execution/transaction/:idempotencyKey`
- `/api/execution/transaction/:idempotencyKey/reconcile`

## Render services
Workspace: `issa's workspace` — `tea-daeehrad0e5s73879ab0`
- `deck-pro-relay` — `srv-daf74bpt0dsc73crvll0` — https://deck-pro-relay.onrender.com
- `deck-pro-server` — `srv-daeholv40ujc73f9n8q0` — https://deck-pro-server.onrender.com
- `deck-pro-web` — `srv-daeg7ff40ujc73f3rpv0` — https://deck-pro-web.onrender.com

## Continuation rule
When opening a new conversation, read this file first and continue the automatic-execution work from ~80%. Preserve the existing UI and working features. Do not redo research already completed. Always report the current percentage after each concrete advance.
