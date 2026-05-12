/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#0a0f1e',
        surface: '#111827',
        card:    '#1a2235',
      },
    },
  },
  plugins: [],
}
