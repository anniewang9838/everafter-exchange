/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        sage: {
          50:  '#f4f7f4',
          100: '#e4ece3',
          200: '#c8d9c6',
          300: '#a0bc9d',
          400: '#739970',
          500: '#547a51',
          600: '#41603e',
          700: '#354e32',
          800: '#2c3f2a',
          900: '#253423',
        },
        beige: {
          100: '#f8f4ee',
          200: '#f0e9de',
          300: '#e4d5c4',
        },
        taupe: {
          300: '#c4b9ad',
          400: '#a89b8e',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'serif'],
        sans:  ['system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 4px 12px 0 rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
}
