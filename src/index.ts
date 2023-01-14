/*
export type TemplateTag<S extends any[], T> =
  (template: TemplateStringsArray, ...substitutions: S) => T;

export function dedent(
  template: TemplateStringsArray,
  ...substitutions: unknown[]
): string;
export function dedent<S extends any[], T>(
  innerTag: TemplateTag<S, T>
): TemplateTag<S, T>;
export function dedent(
  template1: any,
  ...substitutions: any
): any {
  if (typeof template1 === "function") {
    return dedentInner(template1);
  } else {
    return dedentInner(template)(template1, ...substitutions);
  }
}

function dedentInner<S extends any[], T>(
  innerTag: TemplateTag<S, T>
): TemplateTag<S, T> {
}
*/

/*
const dedentMap = new WeakMap<TemplateStringsArray, TemplateStringsArray>();

export function dedentTemplate(
  template: TemplateStringsArray
): TemplateStringsArray {
  {
    const dedented = dedentMap.get(template);
    if (dedented) {
      return dedented;
    }
  }
  const dedented = dedentTemplateImpl(template);
  dedentMap.set(template, dedented);
  return dedented;
}

function dedentTemplateImpl(
  template: TemplateStringsArray
): TemplateStringsArray {
}
*/

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
      const hasContent = elem[endPos] != null ?
        // There is a character in the line
        !/[\n\u2028\u2029]/.test(elem[endPos]!) :
        // There is a substitution
        i + 1 < raw.length;
      if (hasContent) {
        level = Math.min(level, len);
      }
    }
  }
  const dedented = raw.map((elem) => elem.replace(/([\n\u2028\u2029])([ \t]*)/g, (text, nl: string, head: string) => nl + head.substring(level)));

  // Dedent the first line and remove it if it is empty
  // First line indentation is independent of the later lines.
  dedented[0] = dedented[0]!.replace(/^[ \t]*[\n\u2028\u2029]?/, "");
  return dedented;
}

export function template(
  template: TemplateStringsArray,
  ...substitutions: unknown[]
): string {
  let result = "";
  for (let nextIndex = 0; nextIndex < template.length; nextIndex++) {
    result += template[nextIndex];
    if (nextIndex < substitutions.length) {
      result += toString(substitutions[nextIndex]);
    }
  }
  return result;
}

function toString(obj: unknown): string {
  if (typeof obj === "symbol") {
    throw new TypeError("Cannot convert a Symbol value to a string");
  }
  return String(obj);
}
