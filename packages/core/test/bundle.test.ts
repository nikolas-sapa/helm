import { describe, it, expect } from "vitest";
import { hashBundle } from "../src/bundle.js";

describe("hashBundle", () => {
  it("is deterministic regardless of file order", () => {
    const a = hashBundle([
      { path: "b.ts", content: "2" },
      { path: "a.ts", content: "1" },
    ]);
    const b = hashBundle([
      { path: "a.ts", content: "1" },
      { path: "b.ts", content: "2" },
    ]);
    expect(a).toBe(b);
  });
  it("changes when content changes", () => {
    const a = hashBundle([{ path: "a.ts", content: "1" }]);
    const b = hashBundle([{ path: "a.ts", content: "2" }]);
    expect(a).not.toBe(b);
  });
});
