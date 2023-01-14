import { describe, expect, it, test } from "@jest/globals";
import { template } from "./index.js";

describe("template", () => {
  it("interpolates a string", () => {
    expect(template`abc${"def"}ghi`).toBe("abcdefghi");
  });
  it("interpolates a number", () => {
    expect(template`abc${123}ghi`).toBe("abc123ghi");
  });
  it("does not interpolate a symbol", () => {
    expect(() => template`abc${Symbol.iterator}ghi`).toThrow(TypeError);
  });
  it("interprets escape", () => {
    expect(template`a\nb`).toBe("a\nb");
  });
});
