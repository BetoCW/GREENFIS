/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        green: {
          primary: '#2E8B57',
          secondary: '#3CB371',
          light: '#F0F8F0'
        },
        gray: {
          light: '#F5F5F5',
          medium: '#E0E0E0'
        },
        text: {
          dark: '#2C3E50'
        },
        accent: '#FF6B35',
        success: '#27AE60',
        warning: '#F39C12'
      },
      boxShadow: {
        'soft': '0 2px 4px rgba(0,0,0,0.1)'
      }
    }
  },
  plugins: [],
};
