// frontend/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    proxy: {
      // Proxy API calls to FastAPI during development
      // This avoids CORS issues — browser thinks it's talking to itself
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})

// Why the proxy? During development, your React app runs on localhost:5173 and FastAPI runs on localhost:8000. Browsers block cross-origin requests by default (CORS). The Vite proxy makes all /api/* calls appear to come from localhost:5173 — no CORS issues, no localhost:8000 in your frontend code.