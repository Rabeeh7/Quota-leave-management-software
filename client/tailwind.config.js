/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: '#0A0A0A',
        card: '#111111',
        elevated: '#1A1A1A',
        surface: '#222222',
        accent: {
          DEFAULT: '#E84D1A',
          light: '#FF6B35',
          dark: '#C73E10',
          glow: 'rgba(232, 77, 26, 0.15)',
        },
        success: '#16A34A',
        warning: '#D97706',
        danger: '#DC2626',
        neutral: '#6B7280',
        border: {
          subtle: 'rgba(255,255,255,0.06)',
          light: 'rgba(255,255,255,0.12)',
        },
        text: {
          primary: '#FFFFFF',
          secondary: '#9CA3AF',
          muted: '#6B7280',
        }
      },
      fontFamily: {
        heading: ['"Plus Jakarta Sans"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        glow: '0 0 40px rgba(232, 77, 26, 0.2)',
        'glow-sm': '0 0 20px rgba(232, 77, 26, 0.15)',
        card: '0 4px 24px rgba(0, 0, 0, 0.4)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(232, 77, 26, 0.2)' },
          '50%': { boxShadow: '0 0 40px rgba(232, 77, 26, 0.4)' },
        },
      },
    },
  },
  plugins: [],
}
