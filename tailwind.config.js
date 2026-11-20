/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Extra-sharp shadcn-style light tokens. The old dark palette stays inverted
      // so every existing slate utility keeps its role: 950 = page, 900 = card,
      // 800/700 = border, 100 = heading, cyan = primary (blue).
      colors: {
        slate: {
          50: '#020617',
          100: '#020617',
          200: '#0f172a',
          300: '#1e293b',
          400: '#334155',
          500: '#475569',
          600: '#64748b',
          700: '#94a3b8',
          800: '#aab8ca',
          900: '#ffffff',
          950: '#eef2f8',
        },
        cyan: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#1e40af',
          400: '#0b5cff',
          500: '#0b5cff',
          600: '#0047d1',
          700: '#1e40af',
          800: '#1e3a8a',
          900: '#172554',
          950: '#172554',
        },
        fuchsia: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#8b5cf6',
          400: '#8b5cf6',
          500: '#7c3aed',
          600: '#6d28d9',
          700: '#5b21b6',
          800: '#4c1d95',
          900: '#4c1d95',
          950: '#3b0764',
        },
      },
    },
  },
  plugins: [],
}
