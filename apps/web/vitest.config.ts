import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = path.dirname(fileURLToPath(import.meta.url));

// surv-engine loads wasm via ?module (Workers) or ?url + instantiate (vitest).
export default defineConfig({
  resolve: {
    alias: {
      // Node/vitest has no Workers runtime; stub cloudflare:workers → empty env.
      "cloudflare:workers": path.join(root, "lib/cloudflare-workers.stub.ts"),
    },
  },
  test: {
    include: ["lib/**/*.test.ts"],
  },
});
