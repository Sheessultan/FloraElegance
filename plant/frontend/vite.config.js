import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// Local dev: base "/"
// Hostinger production: VITE_BASE_PATH=/ in .env.production (subdomain document root)
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const productionBase = env.VITE_BASE_PATH || '/'

  return {
    base: mode === 'production' ? productionBase : '/',
    plugins: [
      react(),
      tailwindcss(),
    ],
  }
})
