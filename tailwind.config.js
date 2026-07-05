/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eefdf6', 100: '#d5fbe9', 200: '#aef4d5',
          300: '#75e8ba', 400: '#35d399', 500: '#12b981',
          600: '#069668', 700: '#067856', 800: '#095f45',
          900: '#094e3a', 950: '#022c20',
        },
      },
      fontFamily: {
        sans: ['Noto Sans Thai', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
