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
      const input = dedent`\
        import { dedent } from "@qnighy/dedent";
        const text = dedent\`\\
          foo
          bar
        \`;
      `;
      const output = dedent`\
        const text = \`\\
        foo
        bar
        \`;`;
      expect(await transform(input)).toBe(output);
    });
    it("transforms wrapping dedent calls", async () => {
      const input = dedent`\
        import { dedent } from "@qnighy/dedent";
        const text = dedent(foo)\`\\
          foo
          bar
        \`;
      `;
      const output = dedent`\
        const text = foo\`\\
        foo
        bar
        \`;`;
      expect(await transform(input)).toBe(output);
    });
  });

  describe("dedent detection", () => {
    it("ignores other template literals", async () => {
      const input = dedent`\
        \`\\
          foo
          bar
        \`;
        foo\`\\
          foo
          bar
        \`;
        foo.bar\`\\
          foo
          bar
        \`;
        foo(bar)\`\\
          foo
          bar
        \`;
        foo()\`\\
          foo
          bar
        \`;
      `;
      const output = dedent`\
        \`\\
          foo
          bar
        \`;
        foo\`\\
          foo
          bar
        \`;
        foo.bar\`\\
          foo
          bar
        \`;
        foo(bar)\`\\
          foo
          bar
        \`;
        foo()\`\\
          foo
          bar
        \`;`;
      expect(await transform(input)).toBe(output);
    });

    it("detects renamed imports", async () => {
      const input = dedent`\
        import { dedent as m } from "@qnighy/dedent";
        const text = m\`\\
          foo
          bar
        \`;
      `;
      const output = dedent`\
        const text = \`\\
        foo
        bar
        \`;`;
      expect(await transform(input)).toBe(output);
    });

    it("detects string imports", async () => {
      const input = dedent`\
        import { "dedent" as dedent } from "@qnighy/dedent";
        const text = dedent\`\\
          foo
          bar
        \`;
      `;
      const output = dedent`\
        const text = \`\\
        foo
        bar
        \`;`;
      expect(await transform(input)).toBe(output);
    });

    it("detects simple namespace imports", async () => {
      const input = dedent`\
        import * as m from "@qnighy/dedent";
        const text = m.dedent\`\\
          foo
          bar
        \`;
      `;
      const output = dedent`\
        const text = \`\\
        foo
        bar
        \`;`;
      expect(await transform(input)).toBe(output);
    });

    it("detects namespace imports with simple computed member access", async () => {
      const input = dedent`\
        import * as m from "@qnighy/dedent";
        const text = m["dedent"]\`\\
          foo
          bar
        \`;
      `;
      const output = dedent`\
        const text = \`\\
        foo
        bar
        \`;`;
      expect(await transform(input)).toBe(output);
    });

    it("ignores namespace imports with complex computed member access", async () => {
      const input = dedent`\
        import * as m from "@qnighy/dedent";
        const text = m[dedent]\`\\
          foo
          bar
        \`;
      `;
      const output = dedent`\
        import * as m from "@qnighy/dedent";
        const text = m[dedent]\`\\
          foo
          bar
        \`;`;
      expect(await transform(input)).toBe(output);
    });

    it("ignores non-namespace MemberExpression as a tag", async () => {
      const input = dedent`\
        const text = foo.bar.baz\`\\
          foo
          bar
        \`;
      `;
      const output = dedent`\
        const text = foo.bar.baz\`\\
          foo
          bar
        \`;`;
      expect(await transform(input)).toBe(output);
    });

    it("ignores global dedent", async () => {
      const input = dedent`\
        const text = dedent\`\\
          foo
          bar
        \`;
      `;
      const output = dedent`\
        const text = dedent\`\\
          foo
          bar
        \`;`;
      expect(await transform(input)).toBe(output);
    });

    it("ignores other imports", async () => {
      const input = dedent`\
        import { dedentRaw as dedent } from "@qnighy/dedent";
        const text = dedent\`\\
          foo
          bar
        \`;
      `;
      const output = dedent`\
        import { dedentRaw as dedent } from "@qnighy/dedent";
        const text = dedent\`\\
          foo
          bar
        \`;`;
      expect(await transform(input)).toBe(output);
    });
  });

  describe("escape handling", () => {
    it("throws an error if there is an invalid escape in the direct form", async () => {
      expect.assertions(1);
      const input = dedent`\
        import { dedent } from "@qnighy/dedent";
        const text = dedent\`\\
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
      const input = dedent`\
        import { dedent } from "@qnighy/dedent";
        const text = dedent(foo)\`\\
          foo
          bar\\9
        \`;
      `;
      const output = dedent`\
        const text = foo\`\\
        foo
        bar\\9
        \`;`;
      expect(await transform(input)).toBe(output);
    });
  });

  describe("parsing wrapped expressions", () => {
    it("ignores wrapping dedent calls with too few arguments", async () => {
      const input = dedent`\
        import { dedent } from "@qnighy/dedent";
        const text = dedent()\`\\
          foo
          bar
        \`;
      `;
      const output = dedent`\
        import { dedent } from "@qnighy/dedent";
        const text = dedent()\`\\
          foo
          bar
        \`;`;
      expect(await transform(input)).toBe(output);
    });

    it("ignores wrapping dedent calls with too many arguments", async () => {
      const input = dedent`\
        import { dedent } from "@qnighy/dedent";
        const text = dedent(foo, bar)\`\\
          foo
          bar
        \`;
      `;
      const output = dedent`\
        import { dedent } from "@qnighy/dedent";
        const text = dedent(foo, bar)\`\\
          foo
          bar
        \`;`;
      expect(await transform(input)).toBe(output);
    });

    it("ignores wrapping dedent calls with spreads", async () => {
      const input = dedent`\
        import { dedent } from "@qnighy/dedent";
        const text = dedent(...foo)\`\\
          foo
          bar
        \`;
      `;
      const output = dedent`\
        import { dedent } from "@qnighy/dedent";
        const text = dedent(...foo)\`\\
          foo
          bar
        \`;`;
      expect(await transform(input)).toBe(output);
    });
  });

  describe("wrapped functions this-binding", () => {
    it("transforms MemberExpression with asValue wrapper", async () => {
      const input = dedent`\
        import { dedent } from "@qnighy/dedent";
        const text = dedent(foo.bar)\`\\
          foo
          bar
        \`;
      `;
      const output = dedent`\
        const text = (0, foo.bar)\`\\
        foo
        bar
        \`;`;
      expect(await transform(input)).toBe(output);
    });
  });

  describe("import removal", () => {
    it("removes imports in the simplest case", async () => {
      const input = dedent`\
        import { dedent } from "@qnighy/dedent";
        const text = dedent\`\\
          foo
          bar
        \`;
      `;
      const output = dedent`\
        const text = \`\\
        foo
        bar
        \`;`;
      expect(await transform(input)).toBe(output);
    });

    it("removes namespace imports as well", async () => {
      const input = dedent`\
        import * as m from "@qnighy/dedent";
        const text = m.dedent\`\\
          foo
          bar
        \`;
      `;
      const output = dedent`\
        const text = \`\\
        foo
        bar
        \`;`;
      expect(await transform(input)).toBe(output);
    });

    it("removes imports even if there are multiple uses", async () => {
      const input = dedent`\
        import { dedent } from "@qnighy/dedent";
        const text1 = dedent\`\\
          foo
          bar
        \`;

        const text2 = dedent\`\\
          foo
          bar
        \`;
      `;
      const output = dedent`\
        const text1 = \`\\
        foo
        bar
        \`;
        const text2 = \`\\
        foo
        bar
        \`;`;
      expect(await transform(input)).toBe(output);
    });

    it("removes only the import specifier if other imports are in use", async () => {
      const input = dedent`\
        import { dedent, dedentRaw } from "@qnighy/dedent";
        const text = dedent\`\\
          foo
          bar
        \`;
      `;
      const output = dedent`\
        import { dedentRaw } from "@qnighy/dedent";
        const text = \`\\
        foo
        bar
        \`;`;
      expect(await transform(input)).toBe(output);
    });

    it("doesn't remove unused ones", async () => {
      const input = dedent`\
        import { dedent } from "@qnighy/dedent";
        import { dedent as dedent2 } from "@qnighy/dedent";
        import { dedent as dedent3 } from "@qnighy/dedent";
        const text = dedent\`\\
          foo
          bar
        \`;
        dedent3;
      `;
      const output = dedent`\
        import { dedent as dedent2 } from "@qnighy/dedent";
        import { dedent as dedent3 } from "@qnighy/dedent";
        const text = \`\\
        foo
        bar
        \`;
        dedent3;`;
      expect(await transform(input)).toBe(output);
    });

    it("doesn't remove imports if there are other non-removable uses", async () => {
      const input = dedent`\
        import { dedent } from "@qnighy/dedent";
        const text = dedent\`\\
          foo
          bar
        \`;
        dedent;
      `;
      const output = dedent`\
        import { dedent } from "@qnighy/dedent";
        const text = \`\\
        foo
        bar
        \`;
        dedent;`;
      expect(await transform(input)).toBe(output);
    });

    it("doesn't remove namespace imports if there are other non-removable uses", async () => {
      const input = dedent`\
        import * as m from "@qnighy/dedent";
        const text = m.dedent\`\\
          foo
          bar
        \`;
        m.dedent;
      `;
      const output = dedent`\
        import * as m from "@qnighy/dedent";
        const text = \`\\
        foo
        bar
        \`;
        m.dedent;`;
      expect(await transform(input)).toBe(output);
    });
  });
});
