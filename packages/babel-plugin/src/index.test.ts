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
  it("transforms dedent calls", async () => {
    const input = dedent`
      import { dedent } from "@qnighy/dedent";
      const text = dedent\`
        foo
        bar
      \`;
    `;
    // TODO: remove imports
    const output = dedent`
      import { dedent } from "@qnighy/dedent";
      const text = \`foo
      bar
      \`;`;
    expect(await transform(input)).toBe(output);
  });
  it("transforms wrapping dedent calls", async () => {
    const input = dedent`
      import { dedent } from "@qnighy/dedent";
      const text = dedent(foo)\`
        foo
        bar
      \`;
    `;
    // TODO: remove imports
    const output = dedent`
      import { dedent } from "@qnighy/dedent";
      const text = foo\`foo
      bar
      \`;`;
    expect(await transform(input)).toBe(output);
  });
});
