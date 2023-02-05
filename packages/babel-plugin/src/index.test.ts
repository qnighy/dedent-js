import { describe, expect, it } from "@jest/globals";
import { dedent } from "@qnighy/dedent";
import { transformAsync } from "@babel/core";
import plugin from "./index.js";

describe("@qnighy/babel-plugin-dedent", () => {
  async function transform(code: string): Promise<string> {
    const result = await transformAsync(code, {
      configFile: false,
      babelrc: false,
      plugins: [plugin],
    });
    if (result == null) {
      throw new Error("transformAsync returned nullish value");
    }
    return result.code ?? "";
  }
  // eslint-disable-next-line jest/no-disabled-tests
  it.skip("transforms dedent calls", async () => {
    const input = dedent`
      const text = dedent\`
        foo
        bar
      \`;
    `;
    const output = dedent`
      const text = \`foo
      bar
      \`;
    `;
    expect(await transform(input)).toBe(output);
  });
});
