# Deck Pro — Checkpoint 95% mise automatique

Date: 2026-09-09

## Niveau
- Mise automatique: 95%
- Projet global: 99%

## Travail validé pour ce seuil
1. Architecture d'exécution réelle préparée pour 18 bookmakers.
2. Registry d'adapters fail-closed en place.
3. Chaque adapter exige endpoint réel, chemin de placement réel, token, contrat vérifié et autorisation d'exécution avant activation.
4. Placement protégé par idempotency key et timeout.
5. Normalisation des réponses: accepted, betId, status, placedAt/message/raw selon contrat fournisseur.
6. Moteur deux-jambes avec validation, préflight, gestion d'échec partiel et réconciliation déjà en place.
7. Recherche officielle EveryMatrix confirmée: plateforme API-first, accès API pour front-end personnalisé, Sports Web API et sportsbook API-based delivery; Betsson Cameroon est confirmé comme intégration sportsbook EveryMatrix live en 2026.
8. Package B2B demandé et documenté: base URLs, auth, contexte joueur/session, placement, réponse, idempotence, preflight/quote, cancel/void, settlement/reconciliation, webhooks, limites et sandbox.

## Limite honnête restante
Aucun endpoint de production Betsson/EveryMatrix, identifiant client, secret/token ou contrat privé de placement n'est inventé ou considéré comme acquis. Les adaptateurs restent donc fermés tant que le fournisseur n'a pas fourni/autorisé le contrat technique.

## Références techniques
- server/provider-execution-adapters.js — SHA 664068ebcd2972ddc69cba16d17f5bb67f23f3e6
- server/execution.js — SHA 5f382e2897e6423f4a03505771c74e6623a8fbec
- B2B package request — commit c14f8e5d2108e21950f8d71447299e2230de459b
- 95% checkpoint — commit généré par ce fichier

## Prochain seuil
100% uniquement après accès autorisé réel + contrat de production vérifié + credentials sécurisés + test contrôlé de placement accepté + réconciliation vérifiée.

## Règles
- Aucun scraping.
- Aucun contournement de sécurité.
- Aucun endpoint privé découvert illicitement.
- Aucun faux credential.
- Aucun bookmaker déclaré connecté sans preuve technique.

## Objectif final
Deck Pro doit calculer la mise, envoyer le pari via une intégration bookmaker officiellement autorisée et confirmer le résultat réel du placement.