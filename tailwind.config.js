/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // Sharp shadcn-style light tokens. The old dark palette stays inverted so
      // every existing slate utility keeps its role: 950 = page, 900 = card,
      // 800/700 = border, 100 = heading, cyan = primary (blue).
      colors: {
        slate: {
          50: '#0f172a',
          100: '#0f172a',
          200: '#1e293b',
          300: '#334155',
          400: '#475569',
          500: '#64748b',
          600: '#94a3b8',
          700: '#94a3b8',
          800: '#cbd5e1',
          900: '#ffffff',
          950: '#f1f3f7',
        },
        cyan: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#1e40af',
          400: '#155eef',
          500: '#155eef',
          600: '#1247c7',
          700: '#1e40af',
          800: '#1e3a8a',
          900: '#172554',
          950: '#172554',
        },
        fuchsia: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#7c3aed',
          400: '#7c3aed',
          500: '#6d28d9',
          600: '#5b21b6',
          700: '#4c1d95',
          800: '#4c1d95',
          900: '#4c1d95',
          950: '#3b0764',
        },
      },
    },
  },
  plugins: [],
}
