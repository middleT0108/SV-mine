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
        minecraft: {
          green: '#22c55e',
          grass: '#5c8e32',
          dirt: '#866043',
          stone: '#383838',
          dark: '#121214',
          card: '#1a1a1e',
          border: '#2a2a30'
        }
      }
    },
  },
  plugins: [],
}
