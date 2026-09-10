import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    // Lets the dev server run inside Docker Compose and be reached from the host
    watch: {
      usePolling: true,
    },
  },
})
