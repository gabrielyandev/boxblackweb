/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pedal: {
          dark: '#121316',
          panel: '#1b1d22',
          card: '#22252b',
          border: '#323742',
          accent: '#e67e22',
          green: '#2ecc71',
          blue: '#3498db',
          red: '#e74c3c'
        }
      }
    },
  },
  plugins: [],
}
