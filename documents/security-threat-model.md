# Modèle de menace — puzzlehub

- **Date** : 2026-06-18
- **Auteur** : Agent Sécurité (Opus), validé Claude (Phase 4)
- **Périmètre** : auth Google OIDC, sessions/cookies, anti-triche jeu/tournoi, abus plateforme, WebSocket, RGPD.
- **Référence** : FND-D-4, D-5, D-7, D-7b, D-9, D-11, D-16..D-27. Sévérité : Critique / Élevée / Moyenne / Faible.

## A. Auth Google OIDC (Spoofing / Elevation / Tampering)

| ID | Scénario | Sév. | Mitigation |
|----|----------|------|------------|
| T-A1 | Rejeu/forge du `code` OAuth | Critique | **Authorization Code + PKCE** (`code_verifier` 43-128, `S256`), échange back-to-back uniquement. |
| T-A2 | Login CSRF sur le callback | Critique | **`state`** ≥128 bits lié à la session pré-auth, TTL court, usage unique, comparaison à temps constant. |
| T-A3 | `id_token` forgé/substitué | Critique | Validation **signature JWKS Google**, `iss=accounts.google.com`, `aud=client_id`, `exp/iat` (skew ≤60 s), **`nonce`**, algo épinglé `RS256` (jamais `alg:none`/HS). |
| T-A4 | Replay d'`id_token` | Élevée | `nonce` usage unique, `exp` court ; l'`id_token` n'établit que la session, jamais bearer. |
| T-A5 | Auto-attribution de rôle via claims | Élevée | Rôle = colonne DB (défaut `user`), mapping par **`sub`** (jamais email), `email_verified=true` requis. |
| T-A6 | Session fixation | Élevée | **Rotation de l'ID de session post-login**, ancienne détruite. |
| T-A7 | Open redirect (`redirect_uri`/`returnTo`) | Moyenne | `redirect_uri` allowlist exacte ; `returnTo` = chemins internes relatifs validés. |

## B. Sessions / cookies

| ID | Scénario | Sév. | Mitigation |
|----|----------|------|------------|
| T-B1 | Vol de cookie via XSS | Critique | Cookie **httpOnly+Secure+SameSite=Lax**, ID opaque, état serveur, **aucun token en localStorage**. |
| T-B2 | POST cross-site forgé | Élevée | **CSRF double-submit** + SameSite=Lax sur toute mutation. |
| T-B3 | Cookie rejoué ailleurs | Moyenne | **Session binding** UA + préfixe IP via HMAC ; ré-auth douce plutôt que kill brutal (IP mobile). |
| T-B4 | Session éternelle | Moyenne | TTL absolu (~7 j) + idle (~24 h), rotation périodique, logout = destruction serveur + invalidation CSRF. |
| T-B5 | Pas de trace d'actions sensibles | Moyenne | **Logs d'audit** (login/logout/élévation/suppression), horodatage serveur, PII masquée. |

## C. Anti-triche jeu / tournoi — LE cœur

| ID | Scénario | Sév. | Mitigation |
|----|----------|------|------------|
| T-C1 | Score falsifié envoyé par le client | Critique | **Serveur autoritatif** : client envoie la **solution**, serveur rejoue (`engine.validate`) et crédite. Aucun endpoint d'écriture de score. |
| T-C2 | Temps falsifié | Critique | **Horloge serveur** : `start` à la remise du puzzle, `end` à la soumission ; temps client ignoré ; plancher humain plausible ⇒ flag. |
| T-C3 | Soumission hors session de jeu | Élevée | **`attemptId` serveur** (user, seed, difficulty, tournoi, `startedAt`) ; rejet si pas d'attempt ouvert/expiré/déjà soumis. |
| T-C4 | Partage de solution/seed en tournoi | Critique | **Faille structurelle.** Cumul : fenêtre courte + classement par **temps serveur** + 1 attempt/user/puzzle + détection de **clusters** de temps/solutions + (temps réel) soumission quasi simultanée. |
| T-C5 | Bot / automation (solveur) | Élevée | Temps inhumain (T-C2), télémétrie de moves rejouée, soumission « solution finale » sans moves incrémentaux ⇒ flag ; rate-limit/compte ; 1 compte Google/personne. |
| T-C6 | Rejeu d'un attempt gagnant | Moyenne | `attemptId` usage unique, idempotence, nonce de soumission. |
| T-C7 | Manipulation XP directe | Élevée | Aucun endpoint d'écriture XP ; XP dérivée d'un résultat validé serveur ; plafonds. |
| T-C8 | Difficulté/seed gonflé(e) | Moyenne | Gain calculé serveur depuis `(seed, difficulty)` de l'attempt émis, jamais depuis le payload client. |

## D. Abus plateforme

| ID | Scénario | Sév. | Mitigation |
|----|----------|------|------------|
| T-D1 | IDOR tournoi privé / partie d'autrui | Élevée | **Authz par ressource**, code d'invitation ≥128 bits, IDs non séquentiels (CUID/UUID), 404 (pas 403) sur non-autorisé. |
| T-D2 | Flood (login, callback, soumission, création) | Élevée | **Rate limiting** global + routes sensibles, clé IP **et** compte. |
| T-D3 | Énumération de comptes | Moyenne | Surface réduite (Google only), messages génériques. |
| T-D4 | Injection | Élevée | **Zod `.strict()`** sur toute entrée HTTP/WS, Prisma paramétré (pas de SQL brut). |
| T-D5 | XSS stocké/réfléchi (pseudo, nom tournoi) | Élevée | **CSP stricte** (Helmet), pas de `dangerouslySetInnerHTML`, validation/longueur des champs libres, aucun upload. |
| T-D6 | CORS permissif | Élevée | **Allowlist** stricte, `credentials:true` réservé aux origines listées, jamais `*` avec credentials. |
| T-D7 | Fuite de stack/secret en erreur | Moyenne | Erreurs génériques client, détail en logs serveur, secrets hors client, `pnpm audit` CI. |

## E. Multijoueur WebSocket (post-MVP)

| ID | Scénario | Sév. | Mitigation |
|----|----------|------|------------|
| T-E1 | Connexion WS non authentifiée / usurpation | Critique | **Auth au handshake via cookie de session**, identité dérivée serveur, jamais de `userId` client, **authz par message**. |
| T-E2 | Message WS hors autorisation | Élevée | **Zod par type de message** + contrôle d'appartenance à chaque message. |
| T-E3 | Flood WS / sockets multiples | Élevée | Rate-limit par socket/compte, limite de connexions, taille max message, déconnexion sur abus. |
| T-E4 | Triche par déconnexion | Moyenne | État serveur autoritatif, reconnexion reprend l'état, timeout = forfait/score figé. |

## F. Données personnelles / RGPD

| ID | Scénario | Sév. | Mitigation |
|----|----------|------|------------|
| T-F1 | Sur-collecte Google | Moyenne | Scopes `openid email profile` stricts ; stocker `sub`, email, displayName, avatarUrl. |
| T-F2 | PII en logs / classements | Moyenne | Masquage PII en logs ; classements par pseudo, jamais l'email. |
| T-F3 | Pas de suppression de compte | Moyenne | Endpoint suppression (purge/anonymisation), confirmation + ré-auth. |
| T-F4 | Pas de base légale / info | Faible | Politique de confidentialité + info à la première connexion. |

## MUST-HAVE sécurité MVP (liste fermée, non négociable)

1. OIDC Authorization Code + PKCE (S256), échange serveur-only, aucun token en localStorage. (T-A1)
2. Validation complète `id_token` : JWKS, `iss`, `aud`, `exp/iat`, `nonce`, algo RS256 épinglé. (T-A3, T-A4)
3. `state` anti-CSRF aléatoire, lié à la session pré-auth, usage unique, TTL court. (T-A2)
4. Mapping compte par `sub` Google (jamais email), `email_verified` requis, rôles serveur. (T-A5)
5. Cookie httpOnly+Secure+SameSite=Lax, ID opaque, état serveur. (T-B1)
6. Rotation ID de session post-login, logout = destruction serveur, expiration absolue + idle. (T-A6, T-B4)
7. CSRF double-submit sur toutes les mutations. (T-B2)
8. Serveur 100 % autoritatif pour score/temps/XP ; client envoie la solution ; aucun endpoint d'écriture de score/XP. (T-C1, T-C2, T-C7)
9. `attemptId` serveur lié, usage unique, soumission rejetée hors attempt valide/ouvert/non expiré. (T-C3, T-C6, T-C8)
10. Zod `.strict()` sur toute entrée (HTTP et WS) + Prisma paramétré. (T-D4, T-E2)
11. Authz par ressource (anti-IDOR), code d'invitation non devinable, IDs non séquentiels, 404 sur non-autorisé. (T-D1)
12. Rate limiting global + routes sensibles, clé IP+compte. (T-D2, T-E3)
13. Helmet + CSP stricte, CORS allowlist avec credentials restreints. (T-D5, T-D6)
14. WebSocket authentifié par session au handshake, identité serveur, authz par message. (T-E1, T-E2) — *post-MVP*.
15. État de partie/tournoi serveur autoritatif, robuste à la déconnexion/reconnexion. (T-E4) — *post-MVP*.
16. Minimisation données Google, masquage PII en logs, suppression de compte. (T-F1..F3)
17. Logs d'audit des événements sensibles. (T-B5)
18. `pnpm audit` en CI + secrets hors client. (T-D7)

## Pièges anti-triche tournoi (synthèse)

1. **Le seed partagé EST la vulnérabilité** : concevoir le classement pour rester juste même solution connue → s'appuyer sur le **temps de saisie mesuré serveur**.
2. **Chrono = réception du puzzle**, pas premier move.
3. **« Temps trop bas » = signal, pas preuve** : calibrer un plancher humain par jeu/difficulté, prévoir une revue.
4. **Exiger des moves incrémentaux**, pas seulement la solution finale (signal anti-bot, falsifiable ⇒ scoring, pas preuve).
5. **Un seul attempt par (user, puzzle)**, non réinitialisable.
6. **Détection de clusters** (temps/solutions identiques), surtout en tournoi privé (collusion) → signalement plutôt que ban auto.
7. **Fenêtre de soumission courte** en async.
8. **Ne jamais renvoyer la solution avant clôture.**
9. **Idempotence/anti-replay** des soumissions.
10. **Defense-in-depth** : robustesse = cumul des mesures, pas une balle d'argent.
