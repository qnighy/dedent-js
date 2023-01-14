import { cook } from "./cook.js";
import { dedentRaw } from "./dedentRaw.js";
import { evalTemplate } from "./evalTemplate.js";

export type TemplateTag<S extends any[], T> =
  (template: TemplateStringsArray, ...substitutions: S) => T;

export function dedent(
  template: TemplateStringsArray,
  ...substitutions: unknown[]
): string;
export function dedent<S extends any[], T>(
  innerTag: TemplateTag<S, T>
): TemplateTag<S, T>;
export function dedent<S extends any[], T>(
  tag: TemplateStringsArray | TemplateTag<S, T>,
  ...substitutions: unknown[]
): string | TemplateTag<S, T> {
  if (typeof tag === "string") {
    throw new Error("Use dedent`...` instead of dedent(\"...\").");
  } else if (Array.isArray(tag) && Array.isArray((tag as any).raw)) {
    return dedentInner(evalTemplate)(tag as TemplateStringsArray, ...substitutions);
  } else {
    return dedentInner(tag as TemplateTag<S, T>)
  }
}

function dedentInner<S extends any[], T>(
  innerTag: TemplateTag<S, T>
): TemplateTag<S, T> {
  return (template, ...substitutions) => innerTag(dedentTemplate(template), ...substitutions);
}

const dedentMap = new WeakMap<TemplateStringsArray, TemplateStringsArray>();

function dedentTemplate(
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
  const raw = Object.freeze(dedentRaw(template.raw));
  const cooked = raw.map(cook);
  return Object.freeze(Object.assign(cooked, { raw }));
}
