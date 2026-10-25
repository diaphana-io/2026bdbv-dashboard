import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";
import { navaraWorkerWasmPlugin } from "./vite-plugin-navara-worker-wasm.ts";

export default defineConfig({
  plugins: [
    vinext(),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
    // After vinext/client emit: alias hyphen-hashed WASM names Navara workers
    // request, and ensure font-worker WASM is present (see plugin file).
    navaraWorkerWasmPlugin(),
  ],
  // Align worker asset hashes with vinext's media/[name].[hash][extname]
  // when possible; the plugin still aliases hyphen↔dot for safety.
  worker: {
    rollupOptions: {
      output: {
        assetFileNames: "media/[name].[hash:8][extname]",
      },
    },
  },
});
