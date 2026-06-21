const preset = require('@puzzlehub/ui/tailwind-preset');

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [preset],
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    // Les composants partagés (@puzzlehub/ui) utilisent des classes Tailwind :
    // elles doivent être scannées pour être générées.
    '../../packages/ui/src/**/*.{ts,tsx}',
  ],
  darkMode: ['selector', '[data-theme="dark"]'],
};
