import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#ffffff',
      black: '#000000',
      brand: {
        primary: '#c9973a',
        gold: '#c9973a',
        accent: '#c9973a',
        dark: '#1e293b',
        light: '#f5f2ed',
        white: '#fffaf5',
        error: '#ef4444',
      },
      slate: {
        50: '#f8fafc',
        100: '#f1f5f9',
        200: '#e2e8f0',
        300: '#cbd5e1',
        400: '#94a3b8',
        500: '#64748b',
        600: '#475569',
        700: '#334155',
        800: '#1e293b',
        900: '#0f172a',
      },
      gray: {
        50: '#f9fafb',
        100: '#f3f4f6',
        200: '#e5e7eb',
        300: '#d1d5db',
        400: '#9ca3af',
        500: '#6b7280',
        600: '#4b5563',
        700: '#374151',
        800: '#1f2937',
        900: '#111827',
      },
      red: {
        500: '#ef4444',
        600: '#dc2626',
      },
      emerald: {
        50: '#f0fdf4',
        400: '#34d399',
        500: '#10b981',
        600: '#059669',
      },
      rose: {
        50: '#fff1f2',
        100: '#ffe4e6',
        500: '#f43f5e',
        600: '#e11d48',
        700: '#be123c',
      },
      blue: {
        50: '#eff6ff',
        100: '#dbeafe',
        200: '#bfdbfe',
        600: '#2563eb',
      },
      purple: {
        50: '#faf5ff',
        100: '#f3e8ff',
        200: '#e9d5ff',
        600: '#9333ea',
      },
      amber: {
        50: '#fffbeb',
        100: '#fef3c7',
        200: '#fde68a',
        600: '#d97706',
      },
    },
    extend: {
      spacing: {
        safe: 'env(safe-area-inset-bottom)',
        'safe-top': 'env(safe-area-inset-top)',
      },
      borderRadius: {
        none: '0',
      },
      fontSize: {
        '10': '10px',
        '14': '14px',
      },
      fontFamily: {
        serif: ['Playfair Display', 'serif'],
        sans: ['DM Sans', 'sans-serif'],
      },
      boxShadow: {
        premium: '0 1px 3px rgba(0, 0, 0, 0.06), 0 4px 6px rgba(0, 0, 0, 0.08)',
        'premium-md': '0 4px 12px rgba(0, 0, 0, 0.08), 0 8px 16px rgba(0, 0, 0, 0.06)',
        'premium-lg': '0 10px 25px rgba(0, 0, 0, 0.1), 0 12px 32px rgba(0, 0, 0, 0.08)',
        'premium-xl': '0 20px 40px rgba(0, 0, 0, 0.12), 0 25px 50px rgba(0, 0, 0, 0.1)',
        'gold-glow': '0 0 20px rgba(201, 151, 58, 0.25), 0 4px 12px rgba(201, 151, 58, 0.15)',
        'card-hover': '0 8px 24px rgba(0, 0, 0, 0.12), inset 0 0 1px rgba(255, 255, 255, 0.5)',
      },
      backdropBlur: {
        xs: '2px',
      },
      transitionDuration: {
        fast: '150ms',
        smooth: '300ms',
        slow: '500ms',
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: true,
  },
} satisfies Config;
