import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Vite only answers requests for localhost and IP addresses (DNS-rebinding protection),
    // so a phone opening the Mac by its network name (Name-MacBook.local) was refused with
    // "Blocked request". Local network names can't be pointed at by outside sites, so they
    // are safe to allow. `npm run dev:phone` makes the server reachable on the network.
    // The preview server inherits this list.
    allowedHosts: ['.local'],
  },
})
