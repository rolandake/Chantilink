export default {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'glass-white': 'rgba(255, 255, 255, 0.85)',
        'glass-indigo': 'rgba(99, 102, 241, 0.85)',
        'glass-indigo-hover': 'rgba(79, 70, 229, 0.95)',
      },
      backdropBlur: {
        xs: '10px',
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(31, 38, 135, 0.1)',
      },
      borderRadius: {
        'lg': '1rem',
      },
      padding: {
        'btn-y': '0.5rem',
        'btn-x': '1rem',
      },
      fontWeight: {
        'semibold': 600,
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'fade-in-out': 'fadeInOut 2.5s ease-in-out forwards',
        'zoom-in': 'zoomIn 1.5s ease-out forwards',
        'bar-progress': 'barProgress 2.5s ease-in-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0, transform: 'translateY(20px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        fadeInOut: {
          '0%': { opacity: 0 },
          '10%': { opacity: 1 },
          '90%': { opacity: 1 },
          '100%': { opacity: 0 },
        },
        zoomIn: {
          '0%': { transform: 'scale(0.85)', opacity: 0 },
          '50%': { transform: 'scale(1.1)', opacity: 1 },
          '100%': { transform: 'scale(1)', opacity: 1 },
        },
        barProgress: {
          '0%': { left: '-33%' },
          '50%': { left: '100%' },
          '100%': { left: '100%' },
        },
      },
    },
  },
  plugins: [
    function ({ addUtilities }) {
      addUtilities({
        '.bg-glass-white': {
          'background-color': 'rgba(255, 255, 255, 0.85)',
          'backdrop-filter': 'blur(10px)',
          '-webkit-backdrop-filter': 'blur(10px)',
        },
        '.bg-glass-indigo': {
          'background-color': 'rgba(99, 102, 241, 0.85)',
        },
        '.bg-glass-indigo-hover:hover': {
          'background-color': 'rgba(79, 70, 229, 0.95)',
        },
        '.shadow-glass': {
          'box-shadow': '0 8px 32px rgba(31, 38, 135, 0.1)',
        },
      });
    },
  ],
};
