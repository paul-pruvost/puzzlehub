# Feature — API & Auth Google OIDC (lot L3)

- **Date** : 2026-06-18
- **Statut** : en implémentation (mode autonome)
- **Source** : FND-D-4/D-21, `security-threat-model.md` (T-A*, T-B*, must-have 1-7,16-18), `plan-foundation.md` L3.
- **Résumé** : choix d'implémentation du back Fastify et de l'authentification Google OIDC.

## Décisions

- **AUTH-D-1 — Lib OIDC** : pas de framework lourd. `jose` pour la validation cryptographique de l'`id_token` (JWKS distant Google, `jwtVerify` algo épinglé RS256). Échange du `code` via `fetch` natif (Node 24), endpoint injectable (testabilité).
- **AUTH-D-2 — PKCE & anti-CSRF** : `code_verifier`/`code_challenge` (S256) + `state` + `nonce` aléatoires (32 octets, base64url) générés serveur via `node:crypto`. Transaction OIDC pré-login stockée dans un **cookie signé court** `oidc_tx` (`{state,nonce,verifier}`), TTL ~10 min, supprimé au callback. `state` comparé en temps constant.
- **AUTH-D-3 — Validation `id_token`** : signature JWKS Google, `iss ∈ {https://accounts.google.com, accounts.google.com}`, `aud = GOOGLE_CLIENT_ID`, `exp/iat` (skew jose défaut), `nonce` = celui du cookie, `algorithms:['RS256']`. `email_verified === true` requis. Compte mappé par **`sub`** (jamais l'email).
- **AUTH-D-4 — Session** : identifiant opaque aléatoire, état serveur (store). Cookie `sid` **httpOnly + Secure(prod) + SameSite=Lax**, signé. **Rotation** : nouvel `sid` émis au login. `logout` = suppression serveur + cookie effacé. TTL absolu configurable (`SESSION_TTL_HOURS`, défaut 168 h).
- **AUTH-D-5 — CSRF** : double-submit. Cookie `csrf` (lisible JS) + en-tête `x-csrf-token` comparés en temps constant sur toute mutation (`POST /auth/logout`, `DELETE /account`). Le callback GET est protégé par `state`.
- **AUTH-D-6 — Baseline** : `@fastify/helmet` (CSP), `@fastify/cors` (allowlist = `WEB_ORIGIN`, `credentials:true`), `@fastify/rate-limit` (global + login), `@fastify/cookie` (signé, secret `COOKIE_SECRET` ≥ 32). Variables d'env validées par **Zod au boot** (échec = refus de démarrer).
- **AUTH-D-7 — RGPD** : scopes `openid email profile`. Stockage minimal `User(googleSub, email, displayName, avatarUrl, role='user')`. `DELETE /account` purge user + sessions. **Masquage PII** dans les logs (`maskEmail`, redact pino `cookie`/`authorization`/`*.email`).
- **AUTH-D-8 — Abstraction de stockage (testabilité sans DB)** : `UserStore` / `SessionStore` sont des **interfaces**. Implémentation **in-memory** (dev + tests unitaires, **sans Google ni DB**) livrée maintenant ; implémentation **Prisma/Postgres** = jalon suivant immédiat (schéma Prisma écrit dès maintenant pour la migration). Les tests négatifs (id_token invalide, state/nonce mismatch, CSRF manquant) tournent sur IdP **mocké** (clé locale `jose` + JWKS local + `fetch` injecté).

## Questions tranchées (autonome)

- **Vraies credentials Google** : nécessaires uniquement pour l'e2e live (à fournir via `.env` plus tard). Les tests unitaires/intégration n'en ont pas besoin (IdP mocké).
- **Persistance** : in-memory d'abord pour livrer la logique sécurisée testée ; bascule Prisma/Postgres = prochain jalon (migrations + stores Prisma), avant tout déploiement.

## Impact / suite
- Prochain jalon : stores Prisma + migration Postgres + wiring `server.ts` sur Postgres.
- Le module attempt/anti-triche (L4) consommera `UserStore`/`SessionStore` + `@puzzlehub/engine/server`.
