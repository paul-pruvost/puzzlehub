import { RankedPlay } from '../play/RankedPlay';
import { renderTangoBoard, tangoRankedConfig } from '../games/tango/rankedConfig';

/**
 * Défi du jour (Tango) — désormais un simple montage du shell classé partagé
 * (RANK-D-4 / E6) : même hook, même shell, même config/rendu que `/classe/tango`.
 * Le `kind: 'daily'` route vers `/play/daily` (1 démarrage/jour, bonus +50%).
 */
export function DailyPage(): JSX.Element {
  return (
    <RankedPlay
      config={tangoRankedConfig}
      source={{ kind: 'daily', game: 'tango' }}
      title="Défi du jour — Tango"
      intro="Même grille pour tout le monde aujourd’hui. Validée par le serveur (anti-triche), bonus d’XP +50 %."
      renderBoard={renderTangoBoard}
    />
  );
}
