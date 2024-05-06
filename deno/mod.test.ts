import {
  assertEquals,
  assertNotStrictEquals,
  assertStrictEquals,
  assertThrows,
} from "@std/assert";
import { dedent } from "./mod.ts";

Deno.test("dedents the template", () => {
  assertEquals(
    dedent`\
    foo
      bar
    baz
  `,
    "foo\n  bar\nbaz\n",
  );
});
Deno.test("regards escapes as part of a content", () => {
  assertEquals(
    dedent`\
    \x20 foo
      bar
      baz
  `,
    "  foo\n  bar\n  baz\n",
  );
});
Deno.test("regards substitutions as part of a content", () => {
  assertEquals(
    dedent`\
    ${" "} foo
      bar
      baz
  `,
    "  foo\n  bar\n  baz\n",
  );
});

Deno.test("accepts other template tag", () => {
  assertEquals(
    dedent(String.raw)`\
    \x20 foo
      bar
      baz
  `,
    "\\\n\\x20 foo\n  bar\n  baz\n",
  );
});

Deno.test("Allows invalid escapes when tagged", () => {
  assertEquals(dedent(String.raw)`\9`, "\\9");
});

Deno.test("keeps template object identity", () => {
  const getObj = () => dedent((t, ..._sub: unknown[]) => t)`  foo${1}`;
  const getObj2 = () => dedent((t, ..._sub: unknown[]) => t)`  foo${1}`;
  assertStrictEquals(getObj(), getObj());
  assertNotStrictEquals(getObj(), getObj2());
});

Deno.test("gives a helpful message if used as a function", () => {
  const dedentWrong = dedent as typeof dedent & ((s: string) => string);
  assertThrows(() =>
    dedentWrong(`\
      foo
        bar
      baz
    `), 'Use dedent`...` instead of dedent("...").');
});
