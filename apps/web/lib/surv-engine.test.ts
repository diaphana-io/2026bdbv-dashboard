import { describe, expect, it } from "vitest";
import { runCommand } from "./surv-engine";

describe("surv-engine wasm bridge", () => {
  it("runs sys.ping", async () => {
    const result = (await runCommand("sys.ping", {})) as { ok?: boolean };
    expect(result.ok).toBe(true);
  });

  it("runs sys.pipelineStatus without inventing stages in TS", async () => {
    const result = (await runCommand("sys.pipelineStatus", {
      extract_enabled: false,
      adapters: {
        classify: "not_configured",
        extract: "not_configured",
      },
      counts: { inbox: 1 },
    })) as {
      spec_version?: number;
      stages?: Array<{ id?: string }>;
      llm?: unknown[];
    };
    expect(result.spec_version).toBe(1);
    expect(Array.isArray(result.stages)).toBe(true);
    expect(result.stages?.map((s) => s.id)).toEqual([
      "discover",
      "inbox",
      "classify",
      "extract",
      "review",
      "conflicts",
    ]);
    expect(Array.isArray(result.llm)).toBe(true);
  });
});
