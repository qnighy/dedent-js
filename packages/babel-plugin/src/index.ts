import type {
  Expression,
  Identifier,
  ImportDeclaration,
  StringLiteral,
  // eslint-disable-next-line node/no-unpublished-import
} from "@babel/types";
import type { NodePath, PluginObj } from "@babel/core";
import { cook, dedentRaw } from "@qnighy/dedent";

export default function plugin(
  _babel: typeof import("@babel/core")
): PluginObj {
  return {
    name: "@qnighy/dedent",
    visitor: {
      TaggedTemplateExpression(path) {
        const tag = path.get("tag");
        if (isDedentFn(tag)) {
          const raws = dedentRaw(
            path.node.quasi.quasis.map((q) => q.value.raw)
          );
          raws.forEach((raw, i) => {
            path.node.quasi.quasis[i]!.value.raw = raw;
            try {
              path.node.quasi.quasis[i]!.value.cooked = cook(raw);
            } catch (e) {
              if (e instanceof SyntaxError) {
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
          // TODO
        }
      },
    },
  };

  function isDedentFn(expr: NodePath<Expression>): boolean {
    if (expr.isIdentifier()) {
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
      // TODO
      return false;
    }
    return false;
  }
}

function importName(imported: Identifier | StringLiteral): string {
  if (imported.type === "StringLiteral") {
    return imported.value;
  } else {
    return imported.name;
  }
}
