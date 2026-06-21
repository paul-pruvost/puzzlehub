import type { ThemePref } from '@puzzlehub/ui';
import { Button } from '@puzzlehub/ui';
import { useTheme } from './ThemeProvider';

const LABEL: Record<ThemePref, string> = {
  light: 'Clair',
  dark: 'Sombre',
  system: 'Système',
};

const ICON: Record<ThemePref, string> = {
  light: '☀',
  dark: '☾',
  system: '◐',
};

const NEXT: Record<ThemePref, ThemePref> = {
  light: 'dark',
  dark: 'system',
  system: 'light',
};

export function ThemeToggle(): JSX.Element {
  const { pref, setPref } = useTheme();
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={() => setPref(NEXT[pref])}
      aria-label={`Changer de thème (actuel : ${LABEL[pref]})`}
      title={`Thème : ${LABEL[pref]}`}
    >
      <span aria-hidden className="text-base leading-none">
        {ICON[pref]}
      </span>
      <span className="hidden sm:inline">{LABEL[pref]}</span>
    </Button>
  );
}
