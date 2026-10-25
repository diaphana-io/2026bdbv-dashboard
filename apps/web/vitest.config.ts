import { defineConfig } from "vitest/config";

// surv-engine loads wasm via ?module (Workers) or ?url + instantiate (vitest).
export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts"],
  },
});
