import { describe, it, expect } from "vitest";
import { hashKey, verifyKey } from "../src/auth.js";

describe("agent key auth", () => {
  it("verifies a matching key", () => {
    const h = hashKey("secret-123");
    expect(verifyKey("secret-123", h)).toBe(true);
  });
  it("rejects a wrong key", () => {
    const h = hashKey("secret-123");
    expect(verifyKey("nope", h)).toBe(false);
  });
  it("rejects a malformed stored hash without throwing", () => {
    expect(verifyKey("secret-123", "not-hex!!")).toBe(false);
  });
});
