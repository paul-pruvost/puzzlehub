import { useSearchParams } from 'react-router-dom';

import { RankedPlay } from '../../play/RankedPlay';
import { parseDifficulty } from '../../play/difficulty';
import { renderTangoBoard, tangoRankedConfig } from './rankedConfig';

export default function RankedTango(): JSX.Element {
  const [params] = useSearchParams();
  const difficulty = parseDifficulty(params.get('d'));
  return (
    <RankedPlay
      config={tangoRankedConfig}
      source={{ kind: 'ranked', game: 'tango', difficulty }}
      title="Tango — Classé"
      intro="Grille servie et validée par le serveur (anti-triche). XP créditée à la résolution."
      renderBoard={renderTangoBoard}
    />
  );
}
