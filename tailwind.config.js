/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fredoka', 'sans-serif'],
        body: ['Nunito', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#e9f6fe',
          100: '#d0ecfc',
          200: '#9ad2f7',
          300: '#5db5f0',
          400: '#2599e8',
          500: '#0183d9',
          600: '#016FB9',
          700: '#015fa0',
          800: '#014d84',
          900: '#013b68',
        },
        paprika: {
          50:  '#fdf0ec',
          100: '#f9d4c8',
          200: '#f4a98e',
          300: '#ef7e54',
          400: '#f06030',
          500: '#EC4E20',
          600: '#d4441b',
          700: '#b53915',
          800: '#963010',
          900: '#77250c',
        },
        saffron: {
          50:  '#fff8e9',
          100: '#feefc7',
          200: '#fdda8c',
          300: '#fcc551',
          400: '#fbb220',
          500: '#FF9505',
          600: '#e07e00',
          700: '#b86700',
          800: '#905000',
          900: '#683a00',
        },
        charcoal: '#353531',
      },
      animation: {
        'pulse-fast': 'pulse 0.8s cubic-bezier(0.4,0,0.6,1) infinite',
        'bounce-in': 'bounceIn 0.4s ease-out',
      },
      keyframes: {
        bounceIn: {
          '0%':   { transform: 'scale(0.8)', opacity: '0' },
          '70%':  { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
