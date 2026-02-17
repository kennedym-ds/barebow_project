import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  clearScreen: false,
  envPrefix: ['VITE_', 'TAURI_'],
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      buffer: 'buffer',
      'buffer/': 'buffer/',
      stream: '/src/shims/empty.ts',
      assert: '/src/shims/empty.ts',
    },
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          plotly: ['plotly.js', 'react-plotly.js'],
          vendor: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query'],
        },
      },
    },
  },
})
