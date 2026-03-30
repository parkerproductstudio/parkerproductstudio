import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, workspaceRoot, '')
  // Prefer 127.0.0.1 over localhost so the proxy hits IPv4 even when ::1 is wrong.
  const devApiTarget =
    env.VITE_DEV_PROXY_TARGET?.trim() || 'http://127.0.0.1:3001'

  return {
    envDir: workspaceRoot,
    plugins: [react()],
    appType: 'spa',
    server: {
      proxy: {
        '/api': {
          target: devApiTarget,
          changeOrigin: true,
          configure(proxy) {
            proxy.on('error', (err) => {
              console.error(
                `[vite] API proxy error → ${devApiTarget} (${err.message}). Is the backend running on that port?`,
              )
            })
          },
        },
      },
    },
  }
})
