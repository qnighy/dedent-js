import { assertEquals } from "@std/assert";
import { dedentRaw } from "./dedentRaw.ts";

Deno.test("does not remove initial spaces", () => {
  assertEquals(dedentRaw(["    foo bar "]), ["    foo bar "]);
});
Deno.test("does not remove initial tabs", () => {
  assertEquals(dedentRaw(["\tfoo\tbar\t"]), ["\tfoo\tbar\t"]);
});
Deno.test("keeps empty line (first line case)", () => {
  assertEquals(dedentRaw(["\nfoo bar "]), ["\nfoo bar "]);
});
Deno.test("keeps the last newlines", () => {
  assertEquals(dedentRaw(["x\n\n\n"]), ["x\n\n\n"]);
});
Deno.test("keeps spaces after substitution", () => {
  assertEquals(dedentRaw(["foo", " bar"]), ["foo", " bar"]);
});
Deno.test("keeps spaces after bar", () => {
  assertEquals(dedentRaw(["foo", " bar"]), ["foo", " bar"]);
});
Deno.test("dedents the second line (without substitution)", () => {
  assertEquals(dedentRaw(["foo\n  bar "]), ["foo\nbar "]);
});
Deno.test("dedents the second line (with substitution)", () => {
  assertEquals(dedentRaw(["foo", "foo\n  bar "]), ["foo", "foo\nbar "]);
});
Deno.test("dedents the second line, tab case (without substitution)", () => {
  assertEquals(dedentRaw(["foo\n\t\tbar\t"]), ["foo\nbar\t"]);
});
Deno.test("dedents the second line, tab case (with substitution)", () => {
  assertEquals(dedentRaw(["foo", "foo\n\t\tbar\t"]), ["foo", "foo\nbar\t"]);
});
Deno.test("dedents with variable indentation 1", () => {
  assertEquals(dedentRaw(["foo\nbar"]), ["foo\nbar"]);
});
Deno.test("dedents with variable indentation 2", () => {
  assertEquals(dedentRaw(["foo\n bar"]), ["foo\nbar"]);
});
Deno.test("dedents with variable indentation 3", () => {
  assertEquals(dedentRaw(["foo\n  bar"]), ["foo\nbar"]);
});
Deno.test("dedents with variable indentation 4", () => {
  assertEquals(dedentRaw(["foo\n   bar"]), ["foo\nbar"]);
});
Deno.test("dedents lines using max common indent 1", () => {
  assertEquals(dedentRaw(["foo\n  bar\n    baz"]), ["foo\nbar\n  baz"]);
});
Deno.test("dedents lines using max common indent 2", () => {
  assertEquals(dedentRaw(["foo\n    bar\n  baz"]), ["foo\n  bar\nbaz"]);
});
Deno.test("truncates short empty line in the middle", () => {
  assertEquals(dedentRaw(["foo\n \n  bar\n    baz"]), [
    "foo\n\nbar\n  baz",
  ]);
});
Deno.test("truncates short empty line in the last", () => {
  assertEquals(dedentRaw(["foo\n  bar\n    baz\n "]), [
    "foo\nbar\n  baz\n",
  ]);
});
Deno.test("regards substitution as a content", () => {
  assertEquals(dedentRaw(["foo\n ", "\n  bar\n    baz"]), [
    "foo\n",
    "\n bar\n   baz",
  ]);
});
Deno.test("dedents long empty line", () => {
  assertEquals(dedentRaw(["foo\n   \n  bar\n    baz"]), [
    "foo\n \nbar\n  baz",
  ]);
});
Deno.test("dedents the second line and later at Infinity if they are all empty", () => {
  assertEquals(dedentRaw(["x\n  \u2028\t\n   \u2029\t\t"]), [
    "x\n\u2028\n\u2029",
  ]);
});
