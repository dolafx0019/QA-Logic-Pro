/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        qa: {
          bg: '#0B0D10',
          surface1: '#11151A',
          surface2: '#161B22',
          border: '#232A33',
          'text-pri': '#F3F6FA',
          'text-sec': '#98A2B3',
          'accent-pri': '#7C5CFF',
          'accent-sec': '#5B8CFF',
          success: '#32D583',
          warning: '#FDB022',
          danger: '#F97066',
        }
      }
    },
  },
  plugins: [],
}
