/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'apuestax-bg': '#0f172a',
        'apuestax-surface': '#1e293b',
        'apuestax-neon': '#39FF14',
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'neon': '0 0 15px rgba(57, 255, 20, 0.4)',
        'neon-lg': '0 0 25px rgba(57, 255, 20, 0.6)',
      }
    },
  },
  plugins: [],
}
