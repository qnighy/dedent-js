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

  describe("Basic behavior", () => {
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

  describe("dedent detection", () => {
    it("ignores other template literals", async () => {
      const input = dedent`
        \`
          foo
          bar
        \`;
        foo\`
          foo
          bar
        \`;
        foo.bar\`
          foo
          bar
        \`;
        foo(bar)\`
          foo
          bar
        \`;
        foo()\`
          foo
          bar
        \`;
      `;
      const output = dedent`
        \`
          foo
          bar
        \`;
        foo\`
          foo
          bar
        \`;
        foo.bar\`
          foo
          bar
        \`;
        foo(bar)\`
          foo
          bar
        \`;
        foo()\`
          foo
          bar
        \`;`;
      expect(await transform(input)).toBe(output);
    });

    it("detects renamed imports", async () => {
      const input = dedent`
        import { dedent as m } from "@qnighy/dedent";
        const text = m\`
          foo
          bar
        \`;
      `;
      const output = dedent`
        import { dedent as m } from "@qnighy/dedent";
        const text = \`foo
        bar
        \`;`;
      expect(await transform(input)).toBe(output);
    });

    it("detects string imports", async () => {
      const input = dedent`
        import { "dedent" as dedent } from "@qnighy/dedent";
        const text = dedent\`
          foo
          bar
        \`;
      `;
      const output = dedent`
        import { "dedent" as dedent } from "@qnighy/dedent";
        const text = \`foo
        bar
        \`;`;
      expect(await transform(input)).toBe(output);
    });

    it("ignores global dedent", async () => {
      const input = dedent`
        const text = dedent\`
          foo
          bar
        \`;
      `;
      const output = dedent`
        const text = dedent\`
          foo
          bar
        \`;`;
      expect(await transform(input)).toBe(output);
    });

    it("ignores other imports", async () => {
      const input = dedent`
        import { dedentRaw as dedent } from "@qnighy/dedent";
        const text = dedent\`
          foo
          bar
        \`;
      `;
      const output = dedent`
        import { dedentRaw as dedent } from "@qnighy/dedent";
        const text = dedent\`
          foo
          bar
        \`;`;
      expect(await transform(input)).toBe(output);
    });
  });

  describe("escape handling", () => {
    it("throws an error if there is an invalid escape in the direct form", async () => {
      expect.assertions(1);
      const input = dedent`
        import { dedent } from "@qnighy/dedent";
        const text = dedent\`
          foo
          bar\\9
        \`;
      `;
      await expect(transform(input)).rejects.toEqual(
        expect.objectContaining({
          message: expect.stringMatching(
            /\\8 and \\9 are not allowed in template strings./
          ),
        })
      );
    });
    it("transforms the code successfully even if there is an invalid escape in the wrapper form", async () => {
      const input = dedent`
        import { dedent } from "@qnighy/dedent";
        const text = dedent(foo)\`
          foo
          bar\\9
        \`;
      `;
      const output = dedent`
        import { dedent } from "@qnighy/dedent";
        const text = foo\`foo
        bar\\9
        \`;`;
      expect(await transform(input)).toBe(output);
    });
  });

  describe("parsing wrapped expressions", () => {
    it("ignores wrapping dedent calls with too few arguments", async () => {
      const input = dedent`
        import { dedent } from "@qnighy/dedent";
        const text = dedent()\`
          foo
          bar
        \`;
      `;
      const output = dedent`
        import { dedent } from "@qnighy/dedent";
        const text = dedent()\`
          foo
          bar
        \`;`;
      expect(await transform(input)).toBe(output);
    });

    it("ignores wrapping dedent calls with too many arguments", async () => {
      const input = dedent`
        import { dedent } from "@qnighy/dedent";
        const text = dedent(foo, bar)\`
          foo
          bar
        \`;
      `;
      const output = dedent`
        import { dedent } from "@qnighy/dedent";
        const text = dedent(foo, bar)\`
          foo
          bar
        \`;`;
      expect(await transform(input)).toBe(output);
    });

    it("ignores wrapping dedent calls with spreads", async () => {
      const input = dedent`
        import { dedent } from "@qnighy/dedent";
        const text = dedent(...foo)\`
          foo
          bar
        \`;
      `;
      const output = dedent`
        import { dedent } from "@qnighy/dedent";
        const text = dedent(...foo)\`
          foo
          bar
        \`;`;
      expect(await transform(input)).toBe(output);
    });
  });

  describe("wrapped functions this-binding", () => {
    it("transforms MemberExpression with asValue wrapper", async () => {
      const input = dedent`
        import { dedent } from "@qnighy/dedent";
        const text = dedent(foo.bar)\`
          foo
          bar
        \`;
      `;
      const output = dedent`
        import { dedent } from "@qnighy/dedent";
        const text = (0, foo.bar)\`foo
        bar
        \`;`;
      expect(await transform(input)).toBe(output);
    });
  });
});
