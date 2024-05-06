async function main() {
  const files = ["cook.ts", "dedentRaw.ts", "evalTemplate.ts", "mod.ts"];
  for (const file of files) {
    const origFile = file === "mod.ts" ? "index.ts" : file;
    const origPath =
      new URL(`../packages/dedent/src/${origFile}`, import.meta.url).pathname;
    const origSource = await Deno.readTextFile(origPath);

    const replacedSource = origSource.replace(
      /from "(.*)\.js"/g,
      'from "$1.ts"',
    ).replace(
      /eslint-disable-next-line @typescript-eslint\/no-explicit-any/g,
      "deno-lint-ignore no-explicit-any",
    );
    const newPath = new URL(`./${file}`, import.meta.url).pathname;
    Deno.writeTextFileSync(newPath, replacedSource);
  }

  await Deno.copyFile(
    new URL("../README.md", import.meta.url).pathname,
    new URL("./README.md", import.meta.url).pathname,
  );

  const packageJsonPath =
    new URL("../packages/dedent/package.json", import.meta.url).pathname;
  const packageJson = JSON.parse(await Deno.readTextFile(packageJsonPath));

  const denoJsonPath = new URL("./deno.json", import.meta.url).pathname;
  const denoJson = JSON.parse(await Deno.readTextFile(denoJsonPath));
  denoJson.version = packageJson.version;

  await Deno.writeTextFile(denoJsonPath, JSON.stringify(denoJson, null, 2));

  const command = new Deno.Command(Deno.execPath(), {
    args: [
      "fmt",
      ...files.map((file) => new URL(`./${file}`, import.meta.url).pathname),
      new URL("./README.md", import.meta.url).pathname,
      new URL("./deno.json", import.meta.url).pathname,
    ],
    stdin: "null",
    stdout: "piped",
    stderr: "piped",
  });
  const { success } = await command.output();
  if (!success) {
    throw new Error("deno fmt failed");
  }
}

if (import.meta.main) {
  await main();
}
