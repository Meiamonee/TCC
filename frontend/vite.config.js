import process from 'node:process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Com EXPOR_NA_REDE=1 o site fica acessivel por outros aparelhos da mesma rede Wi-Fi
    // (util para testar no celular e no tablet). Por padrao, so neste computador.
    host: process.env.EXPOR_NA_REDE === '1' ? true : 'localhost',
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
