const config = {
  extends: "./babel.config.js",
  presets: [
    ["@babel/env", { modules: "commonjs" }],
  ]
};
export { config as default };
