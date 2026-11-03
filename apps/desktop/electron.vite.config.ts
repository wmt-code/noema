import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {},
  renderer: {
    plugins: [
      react(),
      {
        name: 'development-csp',
        apply: 'serve',
        transformIndexHtml: {
          order: 'pre',
          handler(html) {
            return html
              .replace("script-src 'self'", "script-src 'self' 'unsafe-inline'")
              .replace("style-src 'self'", "style-src 'self' 'unsafe-inline'")
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
