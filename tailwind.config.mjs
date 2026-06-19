/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  safelist: ['group-hover:block'],
  theme: {
    extend: {
      colors: {
        wc: {
          dark:   '#06060f',
          card:   '#0f0f2a',
          blue:   '#1e3a5f',
          red:    '#e63946',
          gold:   '#f9a825',
          green:  '#2d6a4f',
          muted:  '#8892a4',
          border: '#1e2a3a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Bebas Neue', 'Impact', 'sans-serif'],
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #06060f 0%, #0f0f2a 50%, #1e3a5f 100%)',
        'gold-gradient': 'linear-gradient(135deg, #f9a825, #ffd700, #f9a825)',
        'card-gradient': 'linear-gradient(145deg, #0f0f2a, #141430)',
      },
      animation: {
        'pulse-gold': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
    },
  },
  plugins: [],
}
