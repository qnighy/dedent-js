// @ts-check

/** @type {import("@babel/core").TransformOptions} */
const config = {
  targets: "node 14.20",
  presets: [
    ["@babel/env", { modules: false }],
    ["@babel/typescript", { allowDeclareFields: true }],
  ],
};
export { config as default };
