// @ts-check

/** @type {import("@babel/core").TransformOptions} */
const config = {
  targets: "last 1 Chrome version",
  presets: [
    ["@babel/env", { modules: false }],
    ["@babel/typescript", { allowDeclareFields: true }],
  ],
};
export { config as default };
