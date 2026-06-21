# Audit — Plateau Queens + client API + auth front — 2026-06-19

- **Auteur** : agent REVUE-FRONT (Opus), boucle multi-agents.
- **Périmètre** : `apps/web/src/games/queens/*`, `api/client.ts`, `app/Auth*`, `Layout`, `GamePage`.
- **Référence** : FND-D-2/D-20/D-21/D-27, threat-model T-B2/T-D5/T-D6.

## Findings & état

| ID | Sév. | Description | État |
|----|------|-------------|------|
| A11Y-04 | 🟡 Moyen | Cases en violation signalées seulement visuellement (ring). | ✅ **Corrigé** : `aria-invalid` + suffixe « en conflit » dans l'aria-label (Queens + Tango). |
| A11Y-01 | 🟡 Moyen | Numéro de région 9px peu lisible. | ✅ **Corrigé** : 10px `font-medium`. |
| A11Y-03 | 🟡 Faible | `mark` annoncé « croix » (forme) au lieu du sens. | ✅ **Corrigé** : « exclue ». |
| PLAY-04 | 🟡 Faible | `SAMPLES[difficulty]` undefined → crash potentiel. | ✅ **Corrigé** : fallback `?? .facile`. |
| PLAY-01 | 🟠 Design | « une reine/ligne » structurelle → pas de feedback conflit-ligne ; couronne remplacée silencieusement. | ⏳ **Assumé** (représentation serveur) ; micro-feedback → backlog. |
| ARCH-02 | 🟡 Dette | Forte duplication Queens/Tango (page shell, validation hook, cellKey). | ⏳ **Backlog** : factoriser avant Zip/Patches. |
| SEC-01/02/03, AUTH-02/03 | 🟢 Bon | CSRF double-submit OK, URL via env, pas de fuite erreur/PII, login top-level + logout+refresh corrects, engine client-only (FND-D-20). | ✅ |

## Verdict
Solide et sûr pour le MVP, **0 blocage**. A11y Queens exemplaire (régions sans couleur via bordures+numéros, clavier natif, ARIA). Sécurité client conforme. Reste : feedback conflit-ligne (design), factorisation (ARCH-02), et **brancher le mode classé** (le client `startPlay`/`submitPlay` existe mais l'UI valide encore en local hors-ligne).
