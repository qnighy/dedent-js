import { cook } from "./cook.ts";

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
    if (template[nextIndex] == null) {
      if (Array.isArray((template as TemplateStringsArray).raw)) {
        // Try to produce a better error message
        cook((template as TemplateStringsArray).raw[nextIndex]!);
      }
      throw new SyntaxError("Invalid escape in the template");
    }
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
