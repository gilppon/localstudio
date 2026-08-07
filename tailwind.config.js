/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        studio: {
          dark: '#0b0f19',
          card: '#131927',
          border: '#1f293d',
          accent: '#6366f1',
          cyan: '#06b6d4',
          rose: '#f43f5e',
        }
      }
    },
  },
  plugins: [],
}
