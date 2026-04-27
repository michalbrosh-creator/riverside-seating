import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served behind a gateway prefix in stg/prod; root in local dev.
// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? '/riverside-seating/' : '/',
}))
