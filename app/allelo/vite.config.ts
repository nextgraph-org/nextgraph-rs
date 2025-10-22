import { defineConfig, UserConfig, PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { viteSingleFile } from "vite-plugin-singlefile"
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig((): UserConfig => {
  const worker_plugins = [];
  const config = {
    worker: {
      format: 'es' as "es" | "iife",
      
    },
    plugins: [react()],
    base: "/",
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
        "@/assets": resolve(__dirname, "src/assets"),
        "@/components": resolve(__dirname, "src/components"),
        "@/contexts": resolve(__dirname, "src/contexts"),
        "@/hooks": resolve(__dirname, "src/hooks"),
        "@/lib": resolve(__dirname, "src/lib"),
        "@/pages": resolve(__dirname, "src/pages"),
        "@/providers": resolve(__dirname, "src/providers"),
        "@/services": resolve(__dirname, "src/services"),
        "@/stores": resolve(__dirname, "src/stores"),
        "@/types": resolve(__dirname, "src/types"),
        "@/utils": resolve(__dirname, "src/utils"),
      },
    },
    // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
    //
    // 1. prevent Vite from obscuring rust errors
    clearScreen: false,
    // 2. tauri expects a fixed port, fail if that port is not available
    server: {
      port: process.env.NG_ENV_WEB ? 1421 : 1420,
      strictPort: true,
      open: false,
      host: host || "0.0.0.0",
      hmr: host
        ? {
            protocol: "ws",
            host,
            port: process.env.NG_ENV_WEB ? 1421 : 1420,
          }
        : undefined,
      watch: {
        // 3. tell Vite to ignore watching `src-tauri`
        ignored: ["**/src-tauri/**"],
      },
    },
    publicDir: process.env.NG_PUBLIC_DEV ? "public_dev" : "public",
    // Env variables starting with the item of `envPrefix` will be exposed in tauri's source code through `import.meta.env`.
    envPrefix: ["VITE_", "TAURI_ENV_", "NG_ENV_"],
    build: {
      outDir: process.env.NG_ENV_WEB ? "dist-web" : "dist",
      // Tauri uses Chromium on Windows and WebKit on macOS and Linux
      target: process.env.TAURI_ENV_PLATFORM == "windows" ? "chrome105" : "safari13",
      // don't minify for debug builds
      minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
      // produce sourcemaps for debug builds
      sourcemap: !!process.env.TAURI_ENV_DEBUG
    }
  };
  if (process.env.NG_ENV_WEB) {
        if (process.env.NG_ENV_ONEFILE) {
            config.plugins.push(viteSingleFile());
            worker_plugins.push(viteSingleFile());
            config.plugins.push(
                {
                    name: 'move-script-body',
                    transformIndexHtml: {
                        order: 'post',
                        handler: function transform(html) {
                            let scriptTag = html.match(/<script type[^>]*>(.*?)<\/script[^>]*>/)[0]
                            //console.log("\n SCRIPT TAG", scriptTag, "\n")
                            html = html.replace(scriptTag, "")
                            html = html.replace("<!-- # INSERT SCRIPT HERE -->", scriptTag)
                            return html;
                        }
                    }
                }
            );
        }
        config.plugins.push(topLevelAwait());
        config.plugins.push(wasm());
        worker_plugins.push(topLevelAwait());
        worker_plugins.push(wasm());
        config.plugins.push(
            {
                name: 'inject-web-script',
                transformIndexHtml: {
                    order: 'pre', // Tells Vite to run this before other processes
                    handler: function transform() {
                        return [
                        {
                            tag: "script",
                            children: "check_supported=true;",
                            injectTo: "head"
                        },
                        {
                            tag: "script",
                            attrs: {
                                "type": "module",
                                "src": "/src/main-web.tsx",
                                "defer": true
                            },
                            injectTo: "head"
                        }]
                    }
                }
            }
        );
    } else {
        config.plugins.push(
            {
                name: 'inject-native-script',
                transformIndexHtml: {
                    order: 'pre', // Tells Vite to run this before other processes
                    handler: function transform() {
                        return [
                        {
                            tag: "script",
                            children: "check_supported=false;",
                            injectTo: "head"
                        },
                        {
                            tag: "script",
                            attrs: {
                                "type": "module",
                                "src": "/src/main.tsx",
                                "defer": true
                            },
                            injectTo: "head"
                        }]
                    }
                }
            }
        );
        config.plugins.push(
            {
                name: 'make-script-defer',
                transformIndexHtml: {
                    order: 'post',
                    handler: function transform(html) {
                        let new_html = html.replace("<script type","<script defer type");
                        return new_html;
                    }
                }
            }
        );
    }
  config.worker.plugins = (): PluginOption[] => {return worker_plugins;};
  return config; 
});
