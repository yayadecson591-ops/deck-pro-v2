# Deck Pro — Matrice d'accès technique vérifié — 2026-09-09

## Objet
Faire progresser la mise automatique en identifiant des routes techniques réelles et vérifiables, sans inventer d'endpoint ni de credential.

## Routes vérifiées / qualifiées

| Bookmaker | Route / accès identifié | Qualification actuelle |
|---|---|---|
| SportyBet | Portail officiel Partner | ROUTE_PARTNER_IDENTIFIED — ne constitue pas une API de placement |
| Premier Bet Cameroon | Premier Bet Partners / piste partenaire | ROUTE_PARTNER_IDENTIFIED — ne constitue pas une API de placement |
| betPawa Cameroon | pawaTech / plateforme B2B | PROVIDER_ROUTE_IDENTIFIED — contrat de placement à documenter |
| 1xBet | b2b@1xbet-team.com sur la page officielle Contacts | B2B_CONTACT_IDENTIFIED — la page Partners publique est une affiliation, pas une API de placement |
| Betsson Africa | EveryMatrix / OddsMatrix | PROVIDER_ROUTE_IDENTIFIED — intégration sportsbook API-based identifiée |
| 22Bet | APIs tierces d'ODDS/data disponibles | DATA_ROUTE_ONLY — aucune route de placement direct vérifiée |

## Vérifications du 2026-09-09
- Le résultat "Sports API" trouvé sous sportingbet.com concerne Sportingbet, pas SportyBet : il ne doit donc PAS être compté comme accès API SportyBet.
- La page publique 1xBet Partners décrit un programme d'affiliation/tracking : elle ne doit PAS être comptée comme API de placement.
- Les APIs tierces trouvées pour 22Bet fournissent des cotes/données : elles ne doivent PAS être comptées comme accès de placement automatique.
- pawaTech confirme publiquement fournir une plateforme sportsbook B2B couvrant le Cameroun, mais aucun endpoint de placement public ni credential Deck Pro n'a été trouvé.
- Une route identifiée n'est jamais une connexion active.
- Aucun credential réel n'est stocké dans ce document.
- Aucun endpoint de placement n'est inventé.

## État Deck Pro
18/18 adaptateurs préparés. 0/18 connexions bookmaker actives confirmées.

## Prochaine étape technique
Pour chaque piste B2B/partenaire : identifier le protocole réel, le mécanisme d'authentification, l'endpoint de placement, le schéma de requête/réponse et la réconciliation. Ensuite seulement configurer l'adaptateur avec des valeurs réelles et effectuer un test contrôlé.

## Règle d'avancement
Une progression de pourcentage n'est comptée que lorsqu'un élément technique vérifiable est obtenu. Une simple page partenaire, affiliation ou API de cotes ne compte pas comme connexion de mise automatique.

## Objectif 90 %
Atteindre 90 % avec une preuve technique supplémentaire substantielle, idéalement une route de placement réelle documentée et intégrable pour au moins un des bookmakers prioritaires, sans inventer de credentials ni contourner les protections.
