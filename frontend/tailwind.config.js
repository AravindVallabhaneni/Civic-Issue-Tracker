/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
          950: '#172554',
        },
        civic: {
          bg: '#0a0f1e',
          surface: '#111827',
          card: '#1a2234',
          border: '#2d3748',
          muted: '#4a5568',
        },
        status: {
          reported: '#6b7280',
          acknowledged: '#f59e0b',
          in_progress: '#3b82f6',
          resolved: '#10b981',
          rejected: '#ef4444',
        },
        category: {
          streetlight: '#fbbf24',
          garbage: '#84cc16',
          water_leak: '#06b6d4',
          pothole: '#f97316',
          road_damage: '#ef4444',
          noise_pollution: '#a855f7',
          illegal_dumping: '#78716c',
          other: '#6b7280',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
