import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Relative base so Capacitor can load assets from the local WebView.
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
  },
})
