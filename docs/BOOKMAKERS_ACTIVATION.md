# Deck Pro — Tableau d’activation automatique des 18 bookmakers

## Critères d’activation automatique

Un bookmaker passe de **préparé** à **ACTIF** uniquement si les 5 conditions suivantes sont vraies :

1. **Accès technique réel identifié** : API officielle, B2B, plateforme opérateur, partenaire ou autre canal officiellement documenté.
2. **Endpoint réel configuré** : URL de production et chemin de placement réellement fournis par le canal retenu.
3. **Accès sécurisé configuré** : jeton/credential de service configuré côté serveur, jamais dans le code source ni dans l’interface utilisateur.
4. **Contrat de placement vérifié** : le format des requêtes/réponses, l’authentification, l’idempotence et les erreurs sont confirmés par la documentation ou le fournisseur.
5. **Test contrôlé accepté** : une connexion puis une opération de test contrôlée est confirmée comme acceptée avant l’activation de l’automatisation réelle.

### Règle de sécurité Deck Pro

- Si une seule condition manque, **l’automatisation réelle reste OFF**.
- Aucun scraping, contournement, endpoint interne découvert par reverse-engineering ou protection de bookmaker ne doit être utilisé.
- Un booking code/coupon peut être généré et copié manuellement lorsqu’un bookmaker le supporte, mais cela ne constitue pas une activation automatique.
- La mise est le **montant total configurable par opération**, indépendant du nombre de bookmakers.
- Le bouton de mise automatique reste désactivable à tout moment.

## Tableau détaillé des 18

| # | Bookmaker | Route technique recherchée | Type | État actuel | Activation automatique |
|---:|---|---|---|---|---|
| 1 | SportyBet | Partenaire / B2B / API officielle | PARTNER_API | RECHERCHE TECHNIQUE | OFF — 5 critères requis |
| 2 | BetMomo | API officielle / B2B | OFFICIAL_API_RESEARCH | RECHERCHE TECHNIQUE | OFF — 5 critères requis |
| 3 | Premier Bet | Partenaire / API / deeplink officiel | PARTNER_API | ROUTE IDENTIFIÉE | OFF jusqu’au contrat réel vérifié |
| 4 | betPawa Cameroon | pawaTech B2B | B2B_PLATFORM | ROUTE IDENTIFIÉE | OFF jusqu’à endpoint + credentials + test |
| 5 | 1xBet | Partenariat B2B officiel | B2B_PARTNER | ROUTE IDENTIFIÉE | OFF jusqu’à contrat de placement vérifié |
| 6 | 1xWin | Partenaire / API officielle | PARTNER_API | RECHERCHE TECHNIQUE | OFF — 5 critères requis |
| 7 | Afropari | Partenaire / API officielle | PARTNER_API | RECHERCHE TECHNIQUE | OFF — 5 critères requis |
| 8 | Betclic Cameroon | API officielle / B2B | OFFICIAL_API_RESEARCH | RECHERCHE TECHNIQUE | OFF — 5 critères requis |
| 9 | Yellow Bet | API officielle / B2B | OFFICIAL_API_RESEARCH | RECHERCHE TECHNIQUE | OFF — 5 critères requis |
| 10 | 22Bet | API officielle / B2B | OFFICIAL_API_RESEARCH | RECHERCHE TECHNIQUE | OFF — 5 critères requis |
| 11 | PMUC | API officielle / B2B | OFFICIAL_API_RESEARCH | RECHERCHE TECHNIQUE | OFF — 5 critères requis |
| 12 | Supergooal | API officielle / B2B | OFFICIAL_API_RESEARCH | RECHERCHE TECHNIQUE | OFF — 5 critères requis |
| 13 | BetWinner | API officielle / B2B | OFFICIAL_API_RESEARCH | RECHERCHE TECHNIQUE | OFF — 5 critères requis |
| 14 | Melbet | API officielle / B2B | OFFICIAL_API_RESEARCH | RECHERCHE TECHNIQUE | OFF — 5 critères requis |
| 15 | Bettomax | API officielle / B2B | OFFICIAL_API_RESEARCH | RECHERCHE TECHNIQUE | OFF — 5 critères requis |
| 16 | PariPesa | API officielle / B2B | OFFICIAL_API_RESEARCH | RECHERCHE TECHNIQUE | OFF — 5 critères requis |
| 17 | OneBet | API officielle / B2B | OFFICIAL_API_RESEARCH | RECHERCHE TECHNIQUE | OFF — 5 critères requis |
| 18 | Betsson Africa | EveryMatrix / OddsMatrix | B2B_PLATFORM | ROUTE IDENTIFIÉE | OFF jusqu’au contrat réel vérifié |

## Priorité de finalisation

### Groupe 1 — routes techniques déjà clairement identifiées
- betPawa Cameroon → pawaTech
- Betsson Africa → EveryMatrix/OddsMatrix
- 1xBet → B2B officiel
- Premier Bet → partenaire/API/deeplink officiel

### Groupe 2 — recherche active immédiate
- SportyBet
- BetMomo
- 1xWin
- Afropari
- Betclic Cameroon
- Yellow Bet
- 22Bet
- PMUC
- Supergooal
- BetWinner
- Melbet
- Bettomax
- PariPesa
- OneBet

## État attendu dans l’application

**PRÉPARÉ** → route technique connue mais non configurée → automatisation OFF.

**CONFIGURÉ** → endpoint + accès sécurisé + contrat vérifié → test obligatoire.

**TESTÉ** → connexion et opération contrôlée acceptées → prêt à activer.

**ACTIF** → tous les critères validés + mise automatique explicitement activée par l’utilisateur.

**ERREUR / SUSPENDU** → perte d’accès, échec de contrôle, contrat invalide ou risque détecté → automatisation immédiatement OFF.

## Sources techniques déjà confirmées

- pawaTech décrit officiellement sa plateforme comme une solution iGaming B2B fournissant sportsbook, loterie et gestion des joueurs, et indique que betPawa est déployé au Cameroun. 
- EveryMatrix confirme officiellement que sa technologie de plateforme est en production avec Betsson Africa au Cameroun, avec intégration turnkey du sportsbook, du compte joueur et des paiements.
- Les intégrations B2B restent des intégrations opérateur/fournisseur : elles ne doivent pas être présentées comme une connexion personnelle Deck Pro tant que le contrat, les credentials et le test d’exécution ne sont pas effectivement configurés.

Dernière mise à jour : 2026-09-09.
