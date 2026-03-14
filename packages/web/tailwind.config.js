/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        void: '#050505',
        surface: '#0f0f0f',
        border: '#1f1f1f',
        paper: '#fafafa',
        muted: '#6b7280',
        trusted: '#14532d',
        trustedFg: '#4ade80',
        conditional: '#78350f',
        conditionalFg: '#fbbf24',
        unverified: '#374151',
        unverifiedFg: '#9ca3af',
        flagged: '#7f1d1d',
        flaggedFg: '#f87171',
      },
      fontFamily: {
        display: ['Bebas Neue', 'Impact', 'sans-serif'],
        mono: ['IBM Plex Mono', 'Courier New', 'monospace'],
        body: ['DM Sans', 'system-ui', 'sans-serif'],
      },
      spacing: {
        'safe': 'env(safe-area-inset-bottom)',
      },
    },
  },
  plugins: [],
}
