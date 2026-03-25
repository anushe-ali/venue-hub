/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fff0f2',  // very light pinkish
          100: '#ffd6da',
          200: '#ffadb3',
          300: '#ff8590',
          400: '#ff5c6e',
          500: '#ff3350', // main maroon/red
          600: '#e62a46',
          700: '#b72236',
          800: '#8c1b28',
          900: '#66131b',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
