/**
 * Mapping centralisé des échecs (exceptions client + refus serveur) vers un
 * message FR + une nature exploitable par l'UI du mode classé.
 *
 * NB : les helpers `startPlay`/`submitPlay`/`startDaily` jettent des `Error`
 * dont le message encode le code HTTP (`start_failed_401`, `submit_failed_409`,
 * `daily_already_played`, …). Le couplage sur ce format est assumé (cf.
 * feature-ranked-play.md, risque connu).
 */
export type RankedErrorKind =
  | 'auth'
  | 'csrf'
  | 'expired'
  | 'already'
  | 'daily_already'
  | 'too_fast'
  | 'parse'
  | 'network'
  | 'unknown';

export interface RankedError {
  kind: RankedErrorKind;
  message: string;
}

const MESSAGES: Record<RankedErrorKind, string> = {
  auth: 'Connecte-toi pour jouer en mode classé.',
  csrf: 'Session expirée — recharge la page puis réessaie.',
  expired: 'Partie expirée (trop de temps écoulé). Relance une nouvelle grille.',
  already: 'Cette grille a déjà été soumise.',
  daily_already: 'Tu as déjà joué le défi d’aujourd’hui. Reviens demain !',
  too_fast: 'Soumission trop rapide refusée.',
  parse: 'Puzzle reçu invalide.',
  network: 'Connexion impossible (API indisponible ?).',
  unknown: 'Une erreur est survenue.',
};

export function rankedError(kind: RankedErrorKind): RankedError {
  return { kind, message: MESSAGES[kind] };
}

/** Traduit une exception (client API) en `RankedError` typée. */
export function mapError(e: unknown): RankedError {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg === 'daily_already_played') return rankedError('daily_already');
  if (/failed to fetch/i.test(msg) || (e instanceof TypeError && !/\d{3}$/.test(msg))) {
    return rankedError('network');
  }
  const code = Number(/(\d{3})$/.exec(msg)?.[1]);
  switch (code) {
    case 401:
      return rankedError('auth');
    case 403:
      return rankedError('csrf');
    case 409:
      return rankedError('already');
    case 410:
      return rankedError('expired');
    default:
      return code >= 500 ? rankedError('network') : rankedError('unknown');
  }
}
