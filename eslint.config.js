const path = require("node:path");
const { FlatCompat } = require("@eslint/eslintrc");
const js = require("@eslint/js");

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

module.exports = [
  {
    ignores: ["dist/**", "node_modules/**", "**/*.js"],
  },
  ...compat.config({
    parser: "@typescript-eslint/parser",
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      project: [
        path.join(__dirname, "tsconfig.json"),
        path.join(__dirname, "tsconfig.test.json"),
      ],
    },
    plugins: ["@typescript-eslint", "prettier"],
    extends: [
      "eslint:recommended",
      "plugin:@typescript-eslint/recommended",
      "plugin:@typescript-eslint/recommended-requiring-type-checking",
      "prettier",
    ],
    env: {
      node: true,
      es2022: true,
    },
    rules: {
      "prettier/prettier": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
    },
  }),
];
