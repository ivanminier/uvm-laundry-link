/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // <-- This is the crucial line for dark mode
  content: [
    "./index.html", // For Vite, index.html is at the root
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'uvm-green': '#154734',
        'uvm-gold': '#fdb515',
      },
      // You can add other theme customizations here
    },
  },
  plugins: [],
};
