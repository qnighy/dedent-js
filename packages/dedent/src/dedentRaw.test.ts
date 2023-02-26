import { describe, expect, it } from "@jest/globals";
import { dedentRaw } from "./dedentRaw.js";

describe("dedentRaw", () => {
  it("does not remove initial spaces", () => {
    expect(dedentRaw(["    foo bar "])).toEqual(["    foo bar "]);
  });
  it("does not remove initial tabs", () => {
    expect(dedentRaw(["\tfoo\tbar\t"])).toEqual(["\tfoo\tbar\t"]);
  });
  it("keeps empty line (first line case)", () => {
    expect(dedentRaw(["\nfoo bar "])).toEqual(["\nfoo bar "]);
  });
  it("keeps the last newlines", () => {
    expect(dedentRaw(["x\n\n\n"])).toEqual(["x\n\n\n"]);
  });
  it("keeps spaces after substitution", () => {
    expect(dedentRaw(["foo", " bar"])).toEqual(["foo", " bar"]);
  });
  it("keeps spaces after bar", () => {
    expect(dedentRaw(["foo", " bar"])).toEqual(["foo", " bar"]);
  });
  it("dedents the second line (without substitution)", () => {
    expect(dedentRaw(["foo\n  bar "])).toEqual(["foo\nbar "]);
  });
  it("dedents the second line (with substitution)", () => {
    expect(dedentRaw(["foo", "foo\n  bar "])).toEqual(["foo", "foo\nbar "]);
  });
  it("dedents the second line, tab case (without substitution)", () => {
    expect(dedentRaw(["foo\n\t\tbar\t"])).toEqual(["foo\nbar\t"]);
  });
  it("dedents the second line, tab case (with substitution)", () => {
    expect(dedentRaw(["foo", "foo\n\t\tbar\t"])).toEqual(["foo", "foo\nbar\t"]);
  });
  it("dedents with variable indentation 1", () => {
    expect(dedentRaw(["foo\nbar"])).toEqual(["foo\nbar"]);
  });
  it("dedents with variable indentation 2", () => {
    expect(dedentRaw(["foo\n bar"])).toEqual(["foo\nbar"]);
  });
  it("dedents with variable indentation 3", () => {
    expect(dedentRaw(["foo\n  bar"])).toEqual(["foo\nbar"]);
  });
  it("dedents with variable indentation 4", () => {
    expect(dedentRaw(["foo\n   bar"])).toEqual(["foo\nbar"]);
  });
  it("dedents lines using max common indent 1", () => {
    expect(dedentRaw(["foo\n  bar\n    baz"])).toEqual(["foo\nbar\n  baz"]);
  });
  it("dedents lines using max common indent 2", () => {
    expect(dedentRaw(["foo\n    bar\n  baz"])).toEqual(["foo\n  bar\nbaz"]);
  });
  it("truncates short empty line in the middle", () => {
    expect(dedentRaw(["foo\n \n  bar\n    baz"])).toEqual([
      "foo\n\nbar\n  baz",
    ]);
  });
  it("truncates short empty line in the last", () => {
    expect(dedentRaw(["foo\n  bar\n    baz\n "])).toEqual([
      "foo\nbar\n  baz\n",
    ]);
  });
  it("regards substitution as a content", () => {
    expect(dedentRaw(["foo\n ", "\n  bar\n    baz"])).toEqual([
      "foo\n",
      "\n bar\n   baz",
    ]);
  });
  it("dedents long empty line", () => {
    expect(dedentRaw(["foo\n   \n  bar\n    baz"])).toEqual([
      "foo\n \nbar\n  baz",
    ]);
  });
  it("dedents the second line and later at Infinity if they are all empty", () => {
    expect(dedentRaw(["x\n  \u2028\t\n   \u2029\t\t"])).toEqual([
      "x\n\u2028\n\u2029",
    ]);
  });
});
