import { defineConfig } from "vitest/config";

// surv-engine uses `*.wasm?url` + WebAssembly.instantiate — no wasm/TLA plugins.
export default defineConfig({
  test: {
    include: ["lib/**/*.test.ts"],
  },
});
