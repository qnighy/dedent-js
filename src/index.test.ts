import { describe, expect, it } from "@jest/globals";
import { dedent } from "./index.js";

describe("dedent", () => {
  it("dedents the template", () => {
    expect(dedent`
      foo
        bar
      baz
    `).toBe("foo\n  bar\nbaz\n");
  });
  it("regards escapes as part of a content", () => {
    expect(dedent`
      \x20 foo
        bar
        baz
    `).toBe("  foo\n  bar\n  baz\n");
  });
  it("regards substitutions as part of a content", () => {
    expect(dedent`
      ${" "} foo
        bar
        baz
    `).toBe("  foo\n  bar\n  baz\n");
  });

  it("accepts other template tag", () => {
    expect(dedent(String.raw)`
      \x20 foo
        bar
        baz
    `).toBe("\\x20 foo\n  bar\n  baz\n");
  });

  it("keeps template object identity", () => {
    const getObj = () => dedent((t, ..._sub: unknown[]) => t)`  foo${1}`;
    const getObj2 = () => dedent((t, ..._sub: unknown[]) => t)`  foo${1}`;
    expect(getObj()).toBe(getObj());
    expect(getObj()).not.toBe(getObj2());
  });
});
