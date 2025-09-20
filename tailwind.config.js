/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'space-dark': '#0f0f23',
        'space-blue': '#1e3a8a',
        'cosmic-purple': '#7c3aed',
        'stellar-gold': '#fbbf24',
      },
      fontFamily: {
        'space': ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
