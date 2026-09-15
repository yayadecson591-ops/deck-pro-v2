# Deck Pro — matrice des routes d'exécution V131

Date: 2026-09-15

## Règle de sécurité

Deck Pro ne considère jamais une possibilité technique comme une autorisation de placement. Une mise automatique ne peut être activée que si le canal du bookmaker est explicitement autorisé, documenté, configuré et validé par un test contrôlé.

Les endpoints privés, l'injection de cookies/session, le contournement d'anti-bot/2FA et le reverse-engineering non autorisé restent exclus.

## État des 18 bookmakers

| Bookmaker | Route identifiée | Placement automatique vérifié | État Deck Pro |
|---|---|---:|---|
| SportyBet | API publique officielle non trouvée; booking code/web route observée | Non | OFF — recherche/booking code |
| BetMomo | site/app et programmes partenaires; aucune API de placement publique vérifiée | Non | OFF — recherche |
| Premier Bet | programme partenaire officiel; route deeplink/share-bet candidate | Non | OFF — contrat à vérifier |
| betPawa Cameroon | pawaTech/B2B identifié | Non | OFF — contrat joueur à vérifier |
| 1xBet | route B2B/partenariat officiel identifiée | Non | OFF — contrat d'exécution à vérifier |
| 1xWin | route partenaire candidate | Non | OFF — recherche |
| Afropari | route partenaire candidate | Non | OFF — recherche |
| Betclic | environnement partenaire officiel identifié | Non | OFF — contrat d'exécution à vérifier |
| Yellow Bet | opérateur régional; API de placement publique non vérifiée | Non | OFF — recherche |
| 22Bet | opérateur/partenaire; API de placement publique non vérifiée | Non | OFF — recherche |
| PMUC | opérateur local; API de placement publique non vérifiée | Non | OFF — recherche |
| Supergooal | opérateur régional; API de placement publique non vérifiée | Non | OFF — recherche |
| BetWinner | opérateur/partenaire; API de placement publique non vérifiée | Non | OFF — recherche |
| Melbet | programme partenaire; APIs tierces trouvées pour les données seulement | Non | OFF — recherche |
| Bettomax | opérateur; API de placement publique non vérifiée | Non | OFF — recherche |
| PariPesa | support/partenariat officiel identifié; contrat de placement non trouvé | Non | OFF — recherche |
| OneBet | opérateur; API de placement publique non vérifiée | Non | OFF — recherche |
| Betsson | technologie EveryMatrix/OddsMatrix confirmée au Cameroun | Non | OFF — contrat joueur/placement à vérifier |

## Résultats de recherche importants

- SportyBet: une implémentation publique indique qu'il n'existe pas d'API développeur publique officielle et que la route observée permet notamment de créer des booking codes, pas de placer une mise. Cette information est traitée comme non officielle et ne déclenche aucune activation automatique.
- betPawa: pawaTech est bien l'acteur B2B/technologique de la marque et fournit des solutions sportsbook; cela confirme une piste B2B, pas un droit de contrôler le compte joueur.
- 1xBet: le canal B2B/partenariat officiel existe; le contrat technique de placement d'un compte joueur Deck Pro reste à obtenir/valider.
- Premier Bet: programme partenaire officiel identifié; cela ne suffit pas à activer le placement automatique.
- Betsson: EveryMatrix confirme la plateforme technologique Betsson Africa au Cameroun; la documentation publique ne suffit pas à confirmer un endpoint de placement pour un compte joueur Deck Pro.
- Melbet: des APIs tierces existent pour les données de matchs/cotes, mais elles ne prouvent pas un accès de placement au compte joueur.

## Conséquence V131

Le moteur d'exécution est maintenant complété par une politique de **readiness** séparée. Elle vérifie la connexion persistante, le canal choisi, le statut `enabled/verified` du contrat d'exécution et, en mode automatique, l'activation `auto_bet_enabled`. Elle échoue fermement si l'un de ces éléments manque.

Cette couche prépare l'activation réelle bookmaker par bookmaker sans fabriquer de faux endpoints.

## Prochaine étape vers 100%

Il reste essentiellement à obtenir et valider les contrats d'exécution autorisés des bookmakers, puis à enregistrer leurs adaptateurs réels et effectuer des tests contrôlés. Tant qu'un contrat n'est pas vérifié, Deck Pro doit rester en mode OFF pour ce bookmaker.
