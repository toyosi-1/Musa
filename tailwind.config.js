/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand color with shades
        primary: {
          50: '#eef6ff',
          100: '#d9ebff',
          200: '#bcdcff',
          300: '#8ac6ff',
          400: '#5aabff',
          500: '#3B82F6', // Main primary color (kept from original)
          600: '#2565d9',
          700: '#1d50b5',
          800: '#1c4195',
          900: '#1c3979',
          950: '#142352',
          DEFAULT: '#3B82F6',
        },
        // Secondary brand color with shades (teal/mint)
        secondary: {
          50: '#edfcf6',
          100: '#d5f6ea',
          200: '#aeecda',
          300: '#7edcc4',
          400: '#4dc4aa',
          500: '#10B981', // Main secondary color (kept from original)
          600: '#0c9c74',
          700: '#0d7e62',
          800: '#106450',
          900: '#105244',
          950: '#042f27',
          DEFAULT: '#10B981',
        },
        // Status colors
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80', // Adding this for success-400
          500: '#22C55E', // Base success color
          600: '#16A34A', // Darker for hover states
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
          DEFAULT: '#22C55E',
        },
        warning: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#EAB308', // Yellow for warnings
          600: '#CA8A04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
          950: '#422006',
          DEFAULT: '#EAB308',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca', // Adding this for focus:ring-danger-200
          300: '#fca5a5',
          400: '#f87171',
          500: '#F43F5E', // Base danger color
          600: '#E11D48', // Darker for hover states
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
          950: '#4c0519',
          DEFAULT: '#F43F5E',
        },
        info: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#0EA5E9', // Light blue for information
          600: '#0284C7',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
          DEFAULT: '#0EA5E9',
        },
        // Musa specific branded colors
        musa: {
          red: '#f87171',    // Red button from image
          mint: '#a8d5d0',   // Mint/teal background
          lightmint: '#d1e9e6', // Lighter teal for backgrounds
          bg: '#e6f0ee',     // Main background color from image
        },
        // Neutral colors for backgrounds and text
        gray: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          900: '#111827',
          950: '#030712',
        },
        // Background and foreground for light/dark mode
        background: {
          light: '#e6f0ee',  // Mint background from image
          dark: '#0f172a',   // Dark background (slightly darker for better contrast)
          DEFAULT: '#e6f0ee',
        },
        foreground: {
          light: '#1F2937',
          dark: '#F9FAFB',
          DEFAULT: '#1F2937',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl': '1rem',      // Increased roundness
        '2xl': '1.5rem',   // Larger roundness for cards
        '3xl': '2rem',     // Very rounded corners
      },
      boxShadow: {
        'card': '0 4px 20px rgba(0, 0, 0, 0.05)',  // Subtle card shadow
        'card-hover': '0 10px 25px rgba(0, 0, 0, 0.1)',  // Enhanced shadow on hover
        'button': '0 4px 10px rgba(0, 0, 0, 0.1)',  // Button shadow
        'button-hover': '0 6px 15px rgba(0, 0, 0, 0.15)',  // Enhanced button shadow on hover
        'panel': '0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02)', // Panel shadow
        'dropdown': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)', // Dropdown shadow
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-up': 'slide-up 0.5s ease-out',
        'slide-down': 'slide-down 0.5s ease-out',
        'slide-in-left': 'slide-in-left 0.5s ease-out',
        'slide-in-right': 'slide-in-right 0.5s ease-out',
        'bounce-gentle': 'bounce-gentle 2s ease-in-out infinite',
        'pulse-slow': 'pulse-slow 3s ease-in-out infinite',
        'scale': 'scale 0.5s ease-out',
        'typing': 'typing 2.5s steps(30, end)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scanLine: {
          '0%': { top: '0%' },
          '50%': { top: '95%' },
          '100%': { top: '0%' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        bounceGentle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        pulseSlow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        scale: {
          '0%': { transform: 'scale(0)' },
          '100%': { transform: 'scale(1)' },
        },
        typing: {
          '0%': { width: '0' },
          '100%': { width: '100%' },
        },
      }
    },
  },
  plugins: [],
}
