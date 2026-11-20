/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          900: '#04020a',
          850: '#070414',
          800: '#0a0618',
          700: '#110a26',
          600: '#1a1238',
        },
        violet: {
          glow: '#a855f7',
          neon: '#c084fc',
          deep: '#7c3aed',
        },
        fuchsia: {
          glow: '#e879f9',
        },
        cyan: {
          glow: '#22d3ee',
        },
      },
      fontFamily: {
        display: ['"Orbitron"', 'system-ui', 'sans-serif'],
        mono: ['"Rajdhani"', 'ui-monospace', 'monospace'],
        body: ['"Rajdhani"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2.4s ease-in-out infinite',
        'flicker': 'flicker 3.5s linear infinite',
        'scan': 'scan 6s linear infinite',
        'spin-slow': 'spin 14s linear infinite',
        'rise': 'rise 0.5s ease-out both',
        'pop': 'pop 0.3s ease-out both',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1', filter: 'brightness(1)' },
          '50%': { opacity: '0.55', filter: 'brightness(1.3)' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '92%': { opacity: '1' },
          '94%': { opacity: '0.4' },
          '96%': { opacity: '1' },
          '98%': { opacity: '0.7' },
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        rise: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pop: {
          '0%': { opacity: '0', transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      boxShadow: {
        'violet': '0 0 20px rgba(168, 85, 247, 0.45), 0 0 40px rgba(124, 58, 237, 0.25)',
        'violet-sm': '0 0 10px rgba(168, 85, 247, 0.5)',
        'inner-glow': 'inset 0 0 20px rgba(168, 85, 247, 0.15)',
      },
    },
  },
  plugins: [],
};
