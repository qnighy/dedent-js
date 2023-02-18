import type {
  Expression,
  Identifier,
  ImportDeclaration,
  MemberExpression,
  StringLiteral,
  V8IntrinsicIdentifier,
  // eslint-disable-next-line node/no-unpublished-import
} from "@babel/types";
import type { NodePath, PluginObj } from "@babel/core";
import { cook, dedentRaw } from "@qnighy/dedent";

export default function plugin(babel: typeof import("@babel/core")): PluginObj {
  const { types: t } = babel;
  return {
    name: "@qnighy/dedent",
    visitor: {
      TaggedTemplateExpression(path) {
        const tag = path.get("tag");
        if (isDedentFn(tag)) {
          // Case 1: dedent`...`
          const raws = dedentRaw(
            path.node.quasi.quasis.map((q) => q.value.raw)
          );
          raws.forEach((raw, i) => {
            path.node.quasi.quasis[i]!.value.raw = raw;
            try {
              path.node.quasi.quasis[i]!.value.cooked = cook(raw);
            } catch (e) {
              rethrowUnless(e, SyntaxError);
              // Invalid escape in non-tagged literal ... should be an error
              throw path
                .get("quasi")
                .get("quasis")
                [i]!.buildCodeFrameError(e.message, SyntaxError);
            }
          });
          path.replaceWith(path.node.quasi);
        } else if (tag.isCallExpression()) {
          const callee = tag.get("callee");
          if (isDedentFn(callee)) {
            // Case 2: dedent(innerTag)`...`

            // Check against complex arguments
            if (tag.node.arguments.length !== 1) {
              return;
            }
            const innerTag = tag.node.arguments[0]!;
            if (!t.isExpression(innerTag)) {
              return;
            }

            const raws = dedentRaw(
              path.node.quasi.quasis.map((q) => q.value.raw)
            );
            raws.forEach((raw, i) => {
              path.node.quasi.quasis[i]!.value.raw = raw;
              try {
                path.node.quasi.quasis[i]!.value.cooked = cook(raw);
              } catch (e) {
                rethrowUnless(e, SyntaxError);
                // Invalid escape in tagged literal ... should fall back to undefined
                path.node.quasi.quasis[i]!.value.cooked = undefined as
                  | string
                  | undefined as string;
              }
            });
            tag.replaceWith(asValue(babel, innerTag));
          }
        }
      },
    },
  };
}

/**
 * Does the expression reference the `dedent` function?
 */
function isDedentFn(
  expr: NodePath<V8IntrinsicIdentifier | Expression>
): boolean {
  if (expr.isIdentifier()) {
    // Check for:
    // ```js
    // import { dedent } from "@qnighy/dedent";
    // dedent`...`;
    // ```
    const binding = expr.scope.getBinding(expr.node.name);
    if (!binding) {
      return false;
    }
    const ref = binding.path;
    if (
      ref.isImportSpecifier() &&
      importName(ref.node.imported) === "dedent" &&
      (ref.parent as ImportDeclaration).source.value === "@qnighy/dedent"
    ) {
      return true;
    }
    return false;
  } else if (expr.isMemberExpression()) {
    // Check for:
    // ```js
    // import * as m from "@qnighy/dedent";
    // m.dedent`...`;
    // ```
    const ns = expr.get("object");
    if (!ns.isIdentifier()) {
      return false;
    }
    const binding = ns.scope.getBinding(ns.node.name);
    if (!binding) {
      return false;
    }
    const ref = binding.path;
    if (
      ref.isImportNamespaceSpecifier() &&
      memberName(expr.node) === "dedent" &&
      (ref.parent as ImportDeclaration).source.value === "@qnighy/dedent"
    ) {
      return true;
    }
    return false;
  }
  return false;
}

function asValue(
  babel: typeof import("@babel/core"),
  e: Expression
): Expression {
  const { types: t } = babel;
  if (t.isMemberExpression(e) || t.isOptionalMemberExpression(e)) {
    return t.sequenceExpression([t.numericLiteral(0), e]);
  }
  return e;
}

function importName(imported: Identifier | StringLiteral): string {
  if (imported.type === "StringLiteral") {
    // import { "foo" as bar } from "";
    //          ^^^^^
    return imported.value;
  } else {
    // import { foo as bar } from "";
    //          ^^^
    return imported.name;
  }
}

function memberName(expr: MemberExpression): string | undefined {
  if (expr.computed && expr.property.type === "StringLiteral") {
    return expr.property.value;
  } else if (!expr.computed && expr.property.type === "Identifier") {
    return expr.property.name;
  }
  return undefined;
}

function rethrowUnless<T>(
  e: unknown,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  klass: new (...args: any[]) => T
): asserts e is T {
  /* istanbul ignore if -- should be handled on the caller */
  if (!(e instanceof klass)) {
    throw e;
  }
}
