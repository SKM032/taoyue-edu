/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6fafa',
          100: '#b3f0f2',
          200: '#80e6eb',
          300: '#4ddce3',
          400: '#1ad2db',
          500: '#00C4D4',
          600: '#009daa',
          700: '#007680',
          800: '#004e55',
          900: '#00272b',
        },
        secondary: {
          50: '#f0e6ff',
          100: '#d4b3ff',
          200: '#b880ff',
          300: '#9c4dff',
          400: '#801aff',
          500: '#6D28D9',
          600: '#5720ae',
          700: '#411882',
          800: '#2c1057',
          900: '#16082b',
        },
      },
    },
  },
  plugins: [],
};
