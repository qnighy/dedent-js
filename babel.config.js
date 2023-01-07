const config = {
  presets: [
    "@babel/env",
    ["@babel/typescript", { allowDeclareFields: true }],
  ]
};
export { config as default };
