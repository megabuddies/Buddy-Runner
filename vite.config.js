import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  define: {
    global: 'globalThis',
    // Отключаем консольные логи в production
    'console.log': process.env.NODE_ENV === 'production' ? '(() => {})' : 'console.log',
    'console.warn': process.env.NODE_ENV === 'production' ? '(() => {})' : 'console.warn',
    'console.info': process.env.NODE_ENV === 'production' ? '(() => {})' : 'console.info',
    'console.debug': process.env.NODE_ENV === 'production' ? '(() => {})' : 'console.debug',
  },
  server: {
    port: 3000,
    open: true,
    // Минимизируем логи сервера разработки
    hmr: {
      overlay: false // Отключаем overlay с ошибками для лучшей производительности
    }
  },
  // Минимизируем логи сборки
  logLevel: process.env.NODE_ENV === 'production' ? 'error' : 'info',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          privy: ['@privy-io/react-auth']
        }
      }
    }
  },
  assetsInclude: ['**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.svg']
})