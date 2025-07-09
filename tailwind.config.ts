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
        'irys-cyan': '#00FFD1',
        'irys-purple': '#3A007A',
        'irys-dark': '#000000',
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'monospace'],
        'sans': ['Inter', 'sans-serif'],
      },
      animation: {
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #00FFD1, 0 0 10px #00FFD1' },
          '100%': { boxShadow: '0 0 10px #00FFD1, 0 0 20px #00FFD1' },
        }
      }
    },
  },
  plugins: [],
}