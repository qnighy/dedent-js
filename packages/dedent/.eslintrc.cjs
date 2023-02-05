// @ts-check

/** @type {import("eslint").Linter.Config} */
const config = {
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:node/recommended",
    "prettier",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["./tsconfig.eslint.json"],
    tsconfigRootDir: __dirname,
  },
  reportUnusedDisableDirectives: true,
  rules: {
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        varsIgnorePattern: "^_",
        argsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      },
    ],
    "no-constant-condition": [
      "error",
      {
        checkLoops: false,
      },
    ],
    "node/no-unsupported-features/es-syntax": "off",
    // Specifying *.js for *.ts doesn't work now
    "node/no-missing-import": "off",
  },
  overrides: [
    {
      files: ["*.test.ts"],
      extends: ["plugin:jest/recommended"],
      rules: {
        "node/no-unpublished-import": "off",
      },
    },
  ],
  ignorePatterns: ["cjs/dist/**/*", "dist/**/*"],
};
module.exports = config;
