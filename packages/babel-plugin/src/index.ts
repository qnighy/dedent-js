import type {
  Expression,
  Identifier,
  ImportDeclaration,
  SpreadElement,
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
              if (e instanceof SyntaxError) {
                // Invalid escape in non-tagged literal ... should be an error
                throw path
                  .get("quasi")
                  .get("quasis")
                  [i]!.buildCodeFrameError(e.message, SyntaxError);
              }
              throw e;
            }
          });
          path.replaceWith(path.node.quasi);
        } else if (tag.isCallExpression()) {
          const callee = tag.get("callee");
          if (isDedentFn(callee)) {
            // Case 2: dedent(innerTag)`...`
            const innerTag = firstArg(
              tag.node.arguments as (Expression | SpreadElement)[]
            );
            const raws = dedentRaw(
              path.node.quasi.quasis.map((q) => q.value.raw)
            );
            raws.forEach((raw, i) => {
              path.node.quasi.quasis[i]!.value.raw = raw;
              try {
                path.node.quasi.quasis[i]!.value.cooked = cook(raw);
              } catch (e) {
                if (e instanceof SyntaxError) {
                  // Invalid escape in tagged literal ... should fall back to undefined
                  path.node.quasi.quasis[i]!.value.cooked = undefined as
                    | string
                    | undefined as string;
                } else {
                  throw e;
                }
              }
            });
            tag.replaceWith(innerTag);
          }
        }
      },
    },
  };

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

      // TODO
      return false;
    }
    return false;
  }

  function firstArg(args: (Expression | SpreadElement)[]): Expression {
    if (args.length === 1 && t.isExpression(args[0])) {
      // dedent(expr) -> expr
      return args[0]!;
    }
    // Rare case:
    // dedent(foo, bar) -> [foo, bar][0]
    // to easily keep evaluation order and account for spread elements
    return t.memberExpression(
      t.arrayExpression(args),
      t.numericLiteral(0),
      true
    );
  }
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
