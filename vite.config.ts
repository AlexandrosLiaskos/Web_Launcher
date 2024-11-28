import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/Web_MS/',
  server: {
    port: 3001,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-core': ['react', 'react-dom'],
          'firebase-core': ['firebase/app', 'firebase/auth'],
          'firebase-db': ['firebase/firestore'],
          'state': ['zustand'],
          'ui-framework': ['@heroicons/react', 'framer-motion'],
          'ui-utils': ['clsx', 'tailwind-merge']
        },
        assetFileNames: 'assets/[name].[hash][extname]',
        chunkFileNames: 'assets/[name].[hash].js',
        entryFileNames: 'assets/[name].[hash].js'
      }
    },
    minify: 'esbuild',
    target: 'esnext'
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'firebase/app',
      'firebase/auth',
      'firebase/firestore',
      'zustand',
      '@heroicons/react',
      'framer-motion',
      'clsx',
      'tailwind-merge'
    ]
  }
})