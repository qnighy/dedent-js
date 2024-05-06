import { assertEquals, assertThrows } from "@std/assert";
import { evalTemplate } from "./evalTemplate.ts";

Deno.test("interpolates a string", () => {
  assertEquals(evalTemplate`abc${"def"}ghi`, "abcdefghi");
});
Deno.test("interpolates a number", () => {
  assertEquals(evalTemplate`abc${123}ghi`, "abc123ghi");
});
Deno.test("does not interpolate a symbol", () => {
  assertThrows(() => evalTemplate`abc${Symbol.iterator}ghi`, TypeError);
});
Deno.test("interprets escape", () => {
  assertEquals(evalTemplate`a\nb`, "a\nb");
});
Deno.test("throws an error on invalid escape", () => {
  assertThrows(() => evalTemplate`a\7b`, SyntaxError);
});
Deno.test("throws a fallback error on invalid escape if raw is not given", () => {
  assertThrows(
    () => evalTemplate([undefined] as unknown as string[]),
    "Invalid escape in the template",
  );
});
