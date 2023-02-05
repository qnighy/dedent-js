export function dedentRaw(raw: readonly string[]): string[] {
  // Dedent the second line and later
  let level = Infinity;
  for (let i = 0; i < raw.length; i++) {
    const elem = raw[i]!;
    const re = /[\n\u2028\u2029]([ \t]*)/g;
    while (true) {
      const m = re.exec(elem);
      if (!m) {
        break;
      }
      const endPos = m.index + m[0].length;
      const len = m[1]!.length;
      const hasContent =
        elem[endPos] != null
          ? // There is a character in the line
            !/[\n\u2028\u2029]/.test(elem[endPos]!)
          : // There is a substitution
            i + 1 < raw.length;
      if (hasContent) {
        level = Math.min(level, len);
      }
    }
  }
  const dedented = raw.map((elem) =>
    elem.replace(
      /([\n\u2028\u2029])([ \t]*)/g,
      (text, nl: string, head: string) => nl + head.substring(level)
    )
  );

  // Dedent the first line and remove it if it is empty
  // First line indentation is independent of the later lines.
  dedented[0] = dedented[0]!.replace(/^[ \t]*[\n\u2028\u2029]?/, "");
  return dedented;
}
