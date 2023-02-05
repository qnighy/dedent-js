/* eslint-disable jest/no-conditional-expect */
import { describe, expect, test } from "@jest/globals";
import { cook } from "./cook.js";

describe("cook", () => {
  test.each<
    | {
        name: string;
        input: string;
        output: string;
        error?: never;
      }
    | {
        name: string;
        input: string;
        output?: never;
        error: string;
      }
  >([
    {
      name: "keeps plain text",
      input: "foo",
      output: "foo",
    },
    {
      name: "expands simple escapes",
      input: "\\` \\$ \\{ \\' \\\" \\\\ \\b \\f \\n \\r \\t \\v \\0",
      output: "` $ { ' \" \\ \b \f \n \r \t \v \0",
    },
    {
      name: "expands identity escapes",
      input: "\\a \\% \\( \\)",
      output: "a % ( )",
    },
    {
      name: "rejects non-octal: \\8",
      input: "\\8",
      error: "\\8 and \\9 are not allowed in template strings.",
    },
    {
      name: "rejects non-octal: \\9",
      input: "\\9",
      error: "\\8 and \\9 are not allowed in template strings.",
    },
    {
      name: "rejects octal (single digit)",
      input: "\\7",
      error: "Octal escape sequences are not allowed in template strings.",
    },
    {
      name: "rejects octal (leading zero)",
      input: "\\01",
      error: "Invalid Unicode escape sequence",
    },
    {
      name: "expands hex escapes",
      input: "\\x00 \\x61 \\xA0",
      output: "\x00 \x61 \xA0",
    },
    {
      name: "rejects incomplete hex (single digit)",
      input: "\\x8%",
      error: "Invalid hexadecimal escape sequence",
    },
    {
      name: "rejects incomplete hex (single digit eof)",
      input: "\\x8",
      error: "Invalid hexadecimal escape sequence",
    },
    {
      name: "rejects incomplete hex (no digit)",
      input: "\\x%%",
      error: "Invalid hexadecimal escape sequence",
    },
    {
      name: "rejects incomplete hex (no digit eof)",
      input: "\\x",
      error: "Invalid hexadecimal escape sequence",
    },
    {
      name: "expands simple unicode escapes",
      input: "\\u0000 \\u3030",
      output: "\u0000 \u3030",
    },
    {
      name: "expands braced unicode escapes",
      input: "\\u{12345}",
      output: "\u{12345}",
    },
    {
      name: "expands surrogate codepoint escapes",
      input: "\\uDCBA \\uDEF0 \\u{DCBA} \\u{DEF0}",
      output: "\uDCBA \uDEF0 \u{DCBA} \u{DEF0}",
    },
    {
      name: "expands short unicode escapes",
      input: "\\u{A}",
      output: "\u{A}",
    },
    {
      name: "expands long unicode escapes",
      input: "\\u{000000000012345}",
      output: "\u{000000000012345}",
    },
    {
      name: "rejects incomplete unicode escapes (2 digits out of 4)",
      input: "\\uA0$",
      error: "Invalid Unicode escape sequence",
    },
    {
      name: "rejects incomplete unicode escapes (missing closing braces)",
      input: "\\u{A",
      error: "Invalid Unicode escape sequence",
    },
    {
      name: "rejects incomplete unicode escapes (invalid character in the braces)",
      input: "\\u{A B}",
      error: "Invalid Unicode escape sequence",
    },
    {
      name: "rejects large unicode escapes",
      input: "\\u{ABCDEF}",
      error: "Undefined Unicode code-point",
    },
    {
      name: "removes line continuation",
      input: "[\\\n] [\\\u2028] [\\\u2029]",
      output: "[] [] []",
    },
  ])("$name", ({ input, output, error }) => {
    if (error != null) {
      expect(() => cook(input)).toThrow(error);
      expect(() => cook(input)).toThrow(SyntaxError);

      // Ensure the same behavior
      // eslint-disable-next-line @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-return
      expect(() => Function(`return \`${input}\`;`)()).toThrow(SyntaxError);
    } else {
      expect(cook(input)).toBe(output);

      // Ensure the same behavior
      // eslint-disable-next-line @typescript-eslint/no-implied-eval
      expect(Function(`return \`${input}\`;`)()).toBe(output);
    }
  });
});
