import { describe, expect, it } from "vitest";
import { claimCategoryForType, isClaimCategory } from "./claim-category";

describe("claimCategoryForType", () => {
  it("maps aggregate and case detail types", () => {
    expect(claimCategoryForType("case_count")).toBe("aggregate_count");
    expect(claimCategoryForType("case_travel")).toBe("case_detail");
    expect(claimCategoryForType("pheic")).toBe("outbreak_status");
    expect(claimCategoryForType("unknown_x")).toBe("other");
  });

  it("validates category strings", () => {
    expect(isClaimCategory("aggregate_count")).toBe(true);
    expect(isClaimCategory("nope")).toBe(false);
  });
});
