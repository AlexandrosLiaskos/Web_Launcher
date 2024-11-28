import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/Web_Launcher/',
  server: {
    port: 3001,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': [
            'react',
            'react-dom',
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
            'zustand'
          ],
          'ui': [
            '@heroicons/react',
            'framer-motion',
            'clsx',
            'tailwind-merge'
          ]
        }
      }
    }
  }
})