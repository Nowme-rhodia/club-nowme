/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#D65A9D',
          DEFAULT: '#BF2778',
          dark: '#8C1D58',
        },
        secondary: {
          light: '#EBE07E',
          DEFAULT: '#E4D44C',
          dark: '#C4B52F',
        },
      },
      fontFamily: {
        spartan: ['League Spartan', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.06)',
        'hover': '0 10px 40px -2px rgba(0, 0, 0, 0.12)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
  ],
};