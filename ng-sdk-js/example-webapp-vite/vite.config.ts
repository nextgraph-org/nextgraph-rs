import { resolve } from 'path';
import { defineConfig } from 'vite';
 
// https://vitejs.dev/guide/build.html#library-mode
export default defineConfig({
    server: {
        port: 5174,
        strictPort: true
    }
});