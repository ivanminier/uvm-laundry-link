/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // <-- This is the crucial line for dark mode
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'uvm-green': '#154734',
        'uvm-gold': '#d7a123',
        'brand-green': '#154734',
        'brand-gold': '#d7a123',
      },
    },
  },
  plugins: [],
};
