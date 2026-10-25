import { defineConfig } from "vite";
import vinext from "vinext";
import { cloudflare } from "@cloudflare/vite-plugin";

// Do not use vite-plugin-wasm + vite-plugin-top-level-await here.
// @cloudflare/vite-plugin already supports Wasm / TLA; the await plugin's SWC
// printSync crashes vinext RSC builds when surv_wasm chunks are present
// ("missing field `type`"). surv-engine loads wasm via ?url + instantiate.
export default defineConfig({
  plugins: [
    vinext(),
    cloudflare({
      viteEnvironment: {
        name: "rsc",
        childEnvironments: ["ssr"],
      },
    }),
  ],
});
