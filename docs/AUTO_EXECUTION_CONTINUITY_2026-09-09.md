# Deck Pro — Continuité mise automatique

- Avancement global : 99,8 %.
- Avancement mise automatique : ~80 %.
- Objectif immédiat : faire progresser la mise automatique vers 100 %, sans refaire l'interface ni repartir de zéro.

## Règle d'activation réelle
Un bookmaker ne passe ACTIF que si route officielle/autorisée + endpoint réel + credentials sécurisés + contrat de placement vérifié + test contrôlé accepté sont tous présents. Sinon l'exécution reste OFF.

## Architecture déjà en place
Radar/Pronostics -> calculs/arbitrage -> montant total de mise configurable par opération -> préflight -> adaptateur bookmaker officiel/B2B -> placement réel -> résultat accepté -> réconciliation.

## Backend clé
server/execution.js SHA 5f382e2897e6423f4a03505771c74e6623a8fbec
server/execution-adapters.js SHA 629a9eead3594419586714eb92ffb65af4b11feb
server/provider-execution-adapters.js SHA 664068ebcd2972ddc69cba16d17f5bb67f23f3e6
server/bookmaker-onboarding.js SHA 435fbbc8d3c91eb39224abdbf509123c1f866307
server/provider-integrations.js SHA 49cf90ed282bbd75ee3a156a9ea119fa22578bfb

## Routes
/api/execution/capabilities
/api/execution/onboarding
/api/execution/provider-adapters
/api/execution/engine-status
/api/execution/preflight
/api/execution/place-authorized
/api/execution/place-two
/api/execution/transaction/:idempotencyKey
/api/execution/transaction/:idempotencyKey/reconcile

## Priorités de connexion identifiées
betPawa Cameroon -> pawaTech B2B
Betsson Africa -> EveryMatrix/OddsMatrix
1xBet -> B2B officiel
Premier Bet -> partenaire/API/deeplink

## 18 bookmakers
SportyBet, BetMomo, Premier Bet, betPawa Cameroon, 1xBet, 1xWin, Afropari, Betclic Cameroon, Yellow Bet, 22Bet, PMUC, Supergooal, BetWinner, Melbet, Bettomax, PariPesa, OneBet, Betsson Africa.

## Render
Workspace ID tea-daeehrad0e5s73879ab0
Relay srv-daf74bpt0dsc73crvll0 — https://deck-pro-relay.onrender.com
Server srv-daeholv40ujc73f9n8q0 — https://deck-pro-server.onrender.com
Web srv-daeg7ff40ujc73f3rpv0 — https://deck-pro-web.onrender.com

## Consigne nouvelle conversation
Lire ce fichier en premier. Continuer directement depuis ~80 % sur la mise automatique. Toujours annoncer le pourcentage après chaque avancée concrète. Ne jamais déclarer une mise réelle réussie sans preuve d'acceptation par le bookmaker.