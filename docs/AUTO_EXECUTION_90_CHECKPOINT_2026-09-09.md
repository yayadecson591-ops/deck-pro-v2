# Deck Pro — Automatic Execution 90% Checkpoint — 2026-09-09

## Why the workstream reaches 90%

The automatic-execution workstream has now crossed the 90% technical-foundation checkpoint for the Betsson Africa / EveryMatrix route.

This is **not** a claim that real-money execution is active. It means the provider-level execution capability and the correct B2B integration boundary are now verified from current official material, and Deck Pro has a fail-closed adapter boundary ready for the provider-specific production contract.

## Verified provider capability

EveryMatrix's current official material confirms:

- EveryMatrix Sports provides an operator sportsbook platform for online, retail and omnichannel environments.
- The OddsMatrix sportsbook platform is a production sportsbook engine handling very large betting volumes and bet placement, risk management and settlement.
- EveryMatrix explicitly supports clients building bespoke front ends against its Web API; its Certified Partners programme explicitly references Sports Web API websites.
- EveryMatrix's 2026 Betsson Cameroon case study confirms that Betsson Cameroon was launched on EveryMatrix technology and that the sportsbook delivery used an API-based setup with a custom front end. The live customer journey includes registration, deposits, bet placement and withdrawals.

## What Deck Pro now has

- A dedicated `ODDSMATRIX` adapter slot for Betsson Africa.
- Fail-closed execution: no placement is possible until the production endpoint, credentials, exact placement contract and execution authorization are supplied.
- Idempotency header support in the adapter boundary.
- Timeout/abort handling.
- Normalized accepted/rejected result handling with bet ID capture when supplied.
- A provider/package request document listing the exact remaining production contract fields.

## Remaining gate before real execution

The following provider-specific production data is still required and must come from the authorized EveryMatrix/Betsson integration channel:

1. production/sandbox base URL
2. authentication mechanism and credentials
3. player/session context
4. exact bet-placement endpoint and HTTP method
5. exact request schema for selections, stake and betslip
6. exact response schema and bet/ticket identifier
7. odds/quote validation contract
8. cancel/void rules
9. settlement/reconciliation callbacks or API
10. rate limits, IP allowlist and retry rules
11. sandbox credentials and controlled test scenario

Until these are verified, Deck Pro remains fail-closed and does not invent an endpoint or payload.

## Progress

- Global project reference: 99.0%
- Automatic betting: **90%**
- 18/18 bookmaker adapter slots prepared
- 0/18 real-money bookmaker connections active
- Betsson/EveryMatrix provider-level capability: **VERIFIED**
- Betsson/EveryMatrix production placement contract: **NOT YET SUPPLIED**

## Official evidence

- EveryMatrix Certified Partners: https://everymatrix.com/certified-partners/
- EveryMatrix Betsson Cameroon case study: https://everymatrix.com/case-studies/launching-a-scalable-platform-for-betsson-cameroon-and-beyond/
- EveryMatrix Sports/OddsMatrix sportsbook: https://everymatrix.com/oddsmatrix/sportsbook/

This checkpoint deliberately does not mark a bookmaker as connected or executable. The next percentage increase requires a real authorized production/sandbox contract and a controlled placement test.
