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
        primary: '#3B82F6', // Blue
        secondary: '#10B981', // Green
        success: '#22C55E', // Green for valid codes
        danger: '#EF4444',  // Red for invalid codes
        accent: '#F59E0B',  // Amber for highlights
        background: {
          light: '#FFFFFF',
          dark: '#111827',
        },
        foreground: {
          light: '#1F2937',
          dark: '#F9FAFB',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
