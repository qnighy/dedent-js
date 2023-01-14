import { describe, expect, it } from "@jest/globals";
import { evalTemplate } from "./evalTemplate.js";

describe("template", () => {
  it("interpolates a string", () => {
    expect(evalTemplate`abc${"def"}ghi`).toBe("abcdefghi");
  });
  it("interpolates a number", () => {
    expect(evalTemplate`abc${123}ghi`).toBe("abc123ghi");
  });
  it("does not interpolate a symbol", () => {
    expect(() => evalTemplate`abc${Symbol.iterator}ghi`).toThrow(TypeError);
  });
  it("interprets escape", () => {
    expect(evalTemplate`a\nb`).toBe("a\nb");
  });
});
