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
        kanthi: {
          dark: '#08090C',
          card: '#101217',
          surface: '#161922',
          border: '#232733',
          muted: '#8A92A6',
          accent: '#7928CA',
          cyan: '#00DFD8',
          gold: '#FFB800',
          pink: '#FF0080'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'Inter', 'sans-serif']
      },
      backgroundImage: {
        'kanthi-gradient': 'linear-gradient(135deg, #7928CA 0%, #FF0080 50%, #00DFD8 100%)',
        'kanthi-glow': 'radial-gradient(ellipse at 50% 0%, rgba(121, 40, 202, 0.25) 0%, rgba(0, 0, 0, 0) 70%)',
        'kanthi-card-glow': 'radial-gradient(circle at 50% 0%, rgba(121, 40, 202, 0.12) 0%, rgba(22, 25, 34, 0.8) 100%)'
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.8' },
        }
      },
      animation: {
        shimmer: 'shimmer 2.5s infinite linear',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}
