/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        studio: {
          bg: '#090D16',
          card: '#111827',
          surface: '#151D2F',
          border: '#1E293B',
          accent: '#38BDF8',
          accentGlow: 'rgba(56, 189, 248, 0.15)',
          amber: '#F59E0B',
          emerald: '#10B981',
          rose: '#F43F5E',
          purple: '#8B5CF6'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        editorial: ['Newsreader', 'Merriweather', 'serif']
      }
    },
  },
  plugins: [],
}
