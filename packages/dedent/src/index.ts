import { cook } from "./cook.js";
import { dedentRaw } from "./dedentRaw.js";
import { evalTemplate } from "./evalTemplate.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TemplateTag<S extends any[], T> = (
  template: TemplateStringsArray,
  ...substitutions: S
) => T;

/**
 * Removes uniform indentations from the template literal.
 *
 * @example
 *   ```typescript
 *   const text = dedent`
 *     foo
 *       bar
 *     baz
 *   `;
 *
 *   // Equivalent to:
 *   const text = `foo
 *     bar
 *   baz
 *   `;
 *   ```
 */
export function dedent(
  template: TemplateStringsArray,
  ...substitutions: unknown[]
): string;
/**
 * Removes uniform indentations from the tagged template literal.
 *
 * @example
 *   ```typescript
 *   const text = dedent(String.raw)`
 *     foo
 *       bar
 *     baz
 *   `;
 *
 *   // Equivalent to:
 *   const text = String.raw`foo
 *     bar
 *   baz
 *   `;
 *   ```
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function dedent<S extends any[], T>(
  innerTag: TemplateTag<S, T>
): TemplateTag<S, T>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function dedent<S extends any[], T>(
  tag: TemplateStringsArray | TemplateTag<S, T>,
  ...substitutions: unknown[]
): string | TemplateTag<S, T> {
  if (typeof tag === "string") {
    throw new Error('Use dedent`...` instead of dedent("...").');
  } else if (
    Array.isArray(tag) &&
    Array.isArray((tag as TemplateStringsArray).raw)
  ) {
    return dedentInner(evalTemplate)(
      tag as TemplateStringsArray,
      ...substitutions
    );
  } else {
    return dedentInner(tag as TemplateTag<S, T>);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dedentInner<S extends any[], T>(
  innerTag: TemplateTag<S, T>
): TemplateTag<S, T> {
  return (template, ...substitutions) =>
    innerTag(dedentTemplate(template), ...substitutions);
}

const dedentMap = new WeakMap<TemplateStringsArray, TemplateStringsArray>();

function dedentTemplate(template: TemplateStringsArray): TemplateStringsArray {
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
  const raw = Object.freeze(dedentRaw(template.raw));
  const cooked = raw.map((elem) => {
    let c = undefined;
    try {
      c = cook(elem);
    } catch (e) {
      /* istanbul ignore if -- no other error is expected */
      if (!(e instanceof SyntaxError)) {
        throw e;
      }
    }
    return c;
  }) as string[];
  return Object.freeze(Object.assign(cooked, { raw }));
}
