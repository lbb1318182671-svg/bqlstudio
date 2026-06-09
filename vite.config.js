import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'

function serveLargeAssetsInDev() {
  return {
    name: 'serve-large-assets-in-dev',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/large-assets/')) {
          next()
          return
        }

        const assetName = decodeURIComponent(req.url.replace('/large-assets/', '').split('?')[0])
        const assetPath = path.resolve(process.cwd(), 'large-assets', assetName)
        const largeAssetsRoot = path.resolve(process.cwd(), 'large-assets')

        if (!assetPath.startsWith(largeAssetsRoot) || !fs.existsSync(assetPath)) {
          next()
          return
        }

        if (assetPath.endsWith('.glb')) res.setHeader('Content-Type', 'model/gltf-binary')
        fs.createReadStream(assetPath).pipe(res)
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), serveLargeAssetsInDev()],
})
