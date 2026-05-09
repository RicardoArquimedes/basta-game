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
          50:  '#fff2ed',
          100: '#ffdacc',
          200: '#ffb399',
          300: '#ff8a60',
          400: '#ff6d38',
          500: '#FF5714',
          600: '#e64c11',
          700: '#bf3f0d',
          800: '#993209',
          900: '#732608',
        },
        aqua:      '#1BE7FF',
        lgreen:    '#6EEB83',
        chartreuse:'#E4FF1A',
        amber:     '#E8AA14',
        flame:     '#FF5714',
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
