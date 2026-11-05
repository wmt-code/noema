import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'node:path'

export default defineConfig({
  main: {},
  preload: {
    build: {
      rollupOptions: { output: { format: 'cjs', entryFileNames: 'index.cjs' } }
    }
  },
  renderer: {
    resolve: { alias: { '@': resolve('src/renderer/src') } },
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'development-csp',
        apply: 'serve',
        transformIndexHtml: {
          order: 'pre',
          handler(html) {
            return html
              .replace("script-src 'self'", "script-src 'self' 'unsafe-inline'")
              .replace(
                "connect-src 'none'",
                "connect-src 'self' ws://127.0.0.1:5180"
              )
          }
        }
      }
    ],
    server: {
      host: '127.0.0.1',
      port: 5180,
      strictPort: true,
      hmr: { host: '127.0.0.1' }
    }
  }
})
