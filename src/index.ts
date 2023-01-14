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
