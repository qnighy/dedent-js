export function dedentRaw(raw: readonly string[]): string[] {
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
  return raw.map((elem) =>
    elem.replace(
      /([\n\u2028\u2029])([ \t]*)/g,
      (text, nl: string, head: string) => nl + head.substring(level)
    )
  );
}
