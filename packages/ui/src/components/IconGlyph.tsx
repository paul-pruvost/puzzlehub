import { cn } from '../cn';

export interface IconGlyphProps {
  /** Identifiant de jeu (tango/queens/zip/patches/sudoku/nonogram). */
  game: string;
  size?: number;
  className?: string;
}

/** Glyphes géométriques par jeu — décoratifs, teintés via `currentColor`. */
const PATHS: Record<string, JSX.Element> = {
  tango: (
    <>
      <circle cx="8.5" cy="12" r="3.5" fill="currentColor" />
      <path
        d="M19 12a4 4 0 1 1-4-4 3 3 0 0 0 4 4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </>
  ),
  queens: (
    <path
      d="M4 9l3 3 3-5 3 5 3-3v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
  ),
  zip: (
    <>
      <path
        d="M5 6h6l-6 6h6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="17" cy="7" r="1.6" fill="currentColor" />
      <circle cx="17" cy="17" r="1.6" fill="currentColor" />
      <path d="M14 17h-3v-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </>
  ),
  patches: (
    <>
      <rect x="4" y="4" width="9" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="4" y="12" width="5" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="11" y="12" width="9" height="8" rx="1" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="15" y="4" width="5" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </>
  ),
  sudoku: (
    <>
      <rect x="4" y="4" width="16" height="16" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 9.3h16M4 14.6h16M9.3 4v16M14.6 4v16" stroke="currentColor" strokeWidth="1.1" />
    </>
  ),
  nonogram: (
    <>
      <rect x="5" y="5" width="4" height="4" rx="0.6" fill="currentColor" />
      <rect x="10.5" y="5" width="4" height="4" rx="0.6" fill="currentColor" opacity="0.35" />
      <rect x="10.5" y="10.5" width="4" height="4" rx="0.6" fill="currentColor" />
      <rect x="16" y="10.5" width="4" height="4" rx="0.6" fill="currentColor" opacity="0.35" />
      <rect x="5" y="16" width="4" height="4" rx="0.6" fill="currentColor" opacity="0.35" />
      <rect x="16" y="16" width="4" height="4" rx="0.6" fill="currentColor" />
    </>
  ),
};

export function IconGlyph({ game, size = 24, className }: IconGlyphProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={cn('shrink-0', className)}
      aria-hidden
      focusable="false"
    >
      {PATHS[game] ?? PATHS.sudoku}
    </svg>
  );
}
