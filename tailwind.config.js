/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/client/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'Arial', 'Helvetica', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', '"Lucida Console"', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        'card': '0 2px 8px 0 rgba(0,0,0,0.40)',
      },
    },
  },
  plugins: [],
}
