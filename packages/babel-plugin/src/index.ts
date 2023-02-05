import type { PluginObj } from "@babel/core";
export default function plugin(
  _babel: typeof import("@babel/core")
): PluginObj {
  return {
    name: "@qnighy/dedent",
    visitor: {},
  };
}
