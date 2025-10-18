import { defineConfig } from 'vite'
import { viteSingleFile } from "vite-plugin-singlefile"


// https://vitejs.dev/config/
export default defineConfig({
  envPrefix: ["VITE_", "NG_"],
  server: {
    port: 14404
  },
  plugins: [
    viteSingleFile()
  ]
})
