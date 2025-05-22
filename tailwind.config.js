/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'uvm-green': '#154734',
        'uvm-gold':  '#fdb515'
      }
    }
  },
  plugins: []
}
