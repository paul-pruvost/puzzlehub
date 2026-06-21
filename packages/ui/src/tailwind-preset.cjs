/**
 * Preset Tailwind partagé : mappe les design tokens (variables CSS) vers les
 * couleurs sémantiques utilisables en classes (bg-bg, text-muted, border-border…).
 * Les noms historiques sont conservés ; on ajoute l'échelle d'élévation/rayons,
 * la police display, le dégradé d'accent et les keyframes de motion (L5).
 */
module.exports = {
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        'surface-2': 'var(--color-surface-2)',
        'surface-3': 'var(--color-surface-3)',
        border: 'var(--color-border)',
        text: 'var(--color-text)',
        muted: 'var(--color-text-muted)',
        accent: 'var(--color-accent)',
        'accent-2': 'var(--color-accent-2)',
        'accent-fg': 'var(--color-accent-fg)',
        danger: 'var(--color-danger)',
        'danger-soft': 'var(--color-danger-soft)',
        success: 'var(--color-success)',
        celebrate: 'var(--color-celebrate)',
        'accent-soft': 'var(--color-accent-soft)',
        'game-1': 'var(--game-1)',
        'game-2': 'var(--game-2)',
        'game-3': 'var(--game-3)',
        'game-4': 'var(--game-4)',
        'game-5': 'var(--game-5)',
        'game-6': 'var(--game-6)',
        'game-7': 'var(--game-7)',
        'game-8': 'var(--game-8)',
        'game-9': 'var(--game-9)',
        'game-fg': 'var(--game-fg)',
        'tango-sun': 'var(--tango-sun)',
        'tango-moon': 'var(--tango-moon)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        card: 'var(--radius-card)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        1: 'var(--shadow-1)',
        2: 'var(--shadow-2)',
        3: 'var(--shadow-3)',
      },
      fontFamily: {
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-accent': 'var(--gradient-accent)',
      },
      keyframes: {
        'fade-rise': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.94)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'cell-fill': {
          '0%': { transform: 'scale(0.6)', opacity: '0.4' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        confetti: {
          '0%': { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(-140px) rotate(540deg)', opacity: '0' },
        },
        'sheen-sweep': {
          '0%': { transform: 'translateX(-120%)' },
          '100%': { transform: 'translateX(120%)' },
        },
      },
      animation: {
        'fade-rise': 'fade-rise 0.4s cubic-bezier(0.22, 1, 0.36, 1) both',
        'pop-in': 'pop-in 0.32s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'cell-fill': 'cell-fill 0.18s ease-out both',
        // Durée/délai surchargés en inline par particule (ResultOverlay).
        confetti: 'confetti 1s ease-out forwards',
        sheen: 'sheen-sweep 1.1s ease-in-out',
      },
    },
  },
};
