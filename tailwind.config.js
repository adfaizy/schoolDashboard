/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // shadcn-style light tokens. The old dark palette is inverted so every
      // existing slate utility keeps its role: 950 = page, 900 = card,
      // 800/700 = border, 100 = heading, cyan = primary (blue).
      colors: {
        slate: {
          50: '#18181b',
          100: '#18181b',
          200: '#27272a',
          300: '#3f3f46',
          400: '#52525b',
          500: '#71717a',
          600: '#a1a1aa',
          700: '#d4d4d8',
          800: '#e4e4e7',
          900: '#ffffff',
          950: '#fafafa',
        },
        cyan: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#1e40af',
          400: '#2563eb',
          500: '#2563eb',
          600: '#1d4ed8',
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
