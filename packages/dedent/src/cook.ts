/**
 * Evaluates escape sequences in the raw string.
 * @param raw the raw text
 * @returns the cooked text
 * @throws {SyntaxError} when there is an invalid escape
 */
export function cook(raw: string): string {
  return raw.replace(/\\(?:[0-9]+|x[0-9a-f]{2}|u[0-9a-f]{4}|u\{[0-9a-f]+\}|[\uD800-\uDBFF][\uDC00-\uDFFF]|[^])/gi, (esc) => {
    const ch = esc[1]!;
    if (/[0-9]/.test(ch)) {
      if (esc === "\\0") {
        return "\0";
      } else if (/[89]/.test(ch)) {
        throw new SyntaxError("\\8 and \\9 are not allowed in template strings.")
      } else if (/[1-7]/.test(ch)) {
        throw new SyntaxError("Octal escape sequences are not allowed in template strings.")
      } else {
        throw new SyntaxError("Invalid Unicode escape sequence")
      }
    } else if (ch === "x") {
      if (esc.length === 4) {
        return String.fromCharCode(parseInt(esc.substring(2, 4), 16));
      } else {
        throw new SyntaxError("Invalid hexadecimal escape sequence")
      }
    } else if (ch === "u") {
      if (esc[2] === "{") {
        const cp = parseInt(esc.substring(3, esc.length - 1), 16);
        if (cp < 0x110000) {
          return String.fromCodePoint(cp);
        } else {
          throw new SyntaxError("Undefined Unicode code-point");
        }
      } else if (esc.length === 6) {
        return String.fromCharCode(parseInt(esc.substring(2, 6), 16));
      } else {
        throw new SyntaxError("Invalid Unicode escape sequence");
      }
    } else if (/[bfnrtv]/.test(ch)) {
      return ESCAPE_MAP[ch as "b" | "f" | "n" | "r" | "t" | "v"];
    } else if (/[\n\r\u2028\u2029]/.test(ch)) {
      return "";
    }
    return ch;
  });
}

const ESCAPE_MAP = Object.freeze({
  b: "\b",
  f: "\f",
  n: "\n",
  r: "\r",
  t: "\t",
  v: "\v",
});
