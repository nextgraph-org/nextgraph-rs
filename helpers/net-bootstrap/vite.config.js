import { defineConfig } from 'vite'
import { viteSingleFile } from "vite-plugin-singlefile"

// https://vitejs.dev/config/
export default defineConfig({
  envPrefix: ["VITE_", "NG_"],
  server: {
    port: 14403
  },
  worker: {
      format: 'es',
      plugins : [
        viteSingleFile()
      ]
    },
  plugins: [
    viteSingleFile(),
  ]
})
