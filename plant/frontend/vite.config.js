import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// Production build is typically opened as http://localhost/plant/frontend/dist/ on XAMPP — match API path under /plant/
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/plant/frontend/dist/' : '/',
  plugins: [
    react(),
    tailwindcss(),
  ],
}))
