# Deck Pro — Diagnostic accès propriétaire — 2026-09-09

## État
- Le frontend utilise l'API `https://deck-pro-server.onrender.com`.
- Le serveur expose `POST /api/activate` et `GET /api/activate/verify`.
- L'activation reste fail-closed : le code n'est jamais exposé côté client.
- Le dernier déploiement du serveur est LIVE.

## Diagnostic prioritaire
Si l'écran reste sur « Session verrouillée », il faut distinguer :
1. serveur inaccessible depuis le navigateur ;
2. code propriétaire refusé ;
3. token émis mais session non conservée ;
4. ancienne version frontend/cache.

## Règle
Ne pas modifier ni afficher le code propriétaire. Ne jamais contourner l'authentification.

## Prochaine correction
Ajouter un diagnostic visible sur l'écran verrouillé : test `/health`, message HTTP précis et vérification `/api/activate/verify` après émission du token. Le but est de supprimer l'erreur générique « Session verrouillée » et d'identifier exactement l'étape qui bloque.
