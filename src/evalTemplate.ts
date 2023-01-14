/**
 * Cooked counterpart of {@link String.raw}.
 *
 * @param template an array representing the template.
 * @param substitutions A set of substitution values.
 * @returns Result of template evaluation.
 */
export function evalTemplate(
  template: readonly string[],
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
