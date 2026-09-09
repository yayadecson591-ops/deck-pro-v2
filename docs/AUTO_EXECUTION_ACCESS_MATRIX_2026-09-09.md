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
| Betsson Africa | EveryMatrix / OddsMatrix | PROVIDER_ROUTE_STRONGLY_VERIFIED — EveryMatrix confirme officiellement une intégration sportsbook API-based en production au Cameroun |
| 22Bet | APIs tierces d'ODDS/data disponibles | DATA_ROUTE_ONLY — aucune route de placement direct vérifiée |

## Preuve technique substantielle — Betsson Cameroon / EveryMatrix

La documentation officielle 2026 d'EveryMatrix confirme que :
- Betsson Cameroon a été lancé avec la plateforme EveryMatrix ;
- le sportsbook utilise une livraison API-based ;
- la plateforme réunit sportsbook, PAM, wallet, paiements et intégrations tierces ;
- le parcours client comprend explicitement le placement de paris ;
- EveryMatrix décrit sa plateforme comme une architecture API-first pour les paris sportifs et le casino ;
- le lancement Cameroon est déjà en production, après soft launch puis lancement public en 2026.

Sources officielles :
- https://everymatrix.com/case-studies/launching-a-scalable-platform-for-betsson-cameroon-and-beyond/
- https://everymatrix.com/turnkey/
- https://everymatrix.com/news/everymatrix-platform-technology-live-with-betsson-africa-in-cameroon/

## Limite actuelle
Cette preuve établit une route fournisseur/API et un système de placement réel côté Betsson Cameroon. Elle ne fournit toutefois pas publiquement l'URL exacte de l'endpoint de placement ni des credentials Deck Pro. Il serait donc incorrect de déclarer la connexion active.

## Vérifications importantes
- Une route identifiée n'est jamais une connexion active.
- Aucun credential réel n'est stocké dans ce document.
- Aucun endpoint de placement n'est inventé.
- Les autres bookmakers restent en recherche technique active.

## Prochaine étape technique
Identifier la spécification d'intégration exposée aux clients EveryMatrix/Betsson : authentification, endpoint de placement, schéma de requête/réponse, callbacks de settlement et mécanisme de réconciliation. Ensuite configurer l'adaptateur uniquement avec des valeurs réelles.

## Objectif 90 %
La preuve Betsson/EveryMatrix constitue maintenant une preuve technique substantielle de route fournisseur/API et de placement réel en production au Cameroun. Le seuil 90 % global ne sera déclaré atteint qu'après une avancée supplémentaire vers la configuration réelle de l'adaptateur.
