const eslint = require("@eslint/js");
const tseslint = require("@typescript-eslint/eslint-plugin");
const tsparser = require("@typescript-eslint/parser");
const importPlugin = require("eslint-plugin-import");
const prettierConfig = require("eslint-config-prettier");

module.exports = [
  // Ignore patterns
  {
    ignores: ["build/**/*", "eslint.config.js", ".eslintrc.js"],
  },

  // Base ESLint recommended rules
  eslint.configs.recommended,

  // Configuration for JavaScript and TypeScript files
  {
    files: ["**/*.js", "**/*.ts"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parser: tsparser,
      parserOptions: {
        project: ["./tsconfig.json", "./tsconfig.dev.json"],
      },
      globals: {
        console: "readonly",
        process: "readonly",
        require: "readonly",
        module: "readonly",
        exports: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        Buffer: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
      import: importPlugin,
    },
    rules: {
      // TypeScript recommended rules
      ...tseslint.configs.recommended.rules,

      // Google style guide rules (adapted for flat config)
      "no-var": "warn",
      "prefer-const": "error",
      "prefer-rest-params": "warn",
      "prefer-spread": "warn",
      "no-extra-bind": "warn",
      "no-new-func": "error",
      "no-new-wrappers": "error",
      "no-throw-literal": "warn",
      "block-scoped-var": "warn",
      curly: ["warn", "multi-line"],
      eqeqeq: "warn",
      "guard-for-in": "warn",
      "no-alert": "warn",
      "no-caller": "error",
      "no-eval": "error",
      "no-extend-native": "warn",
      "no-extra-bind": "warn",
      "no-implied-eval": "error",
      "no-iterator": "error",
      "no-labels": "warn",
      "no-lone-blocks": "warn",
      "no-loop-func": "warn",
      "no-multi-str": "warn",
      "no-new": "warn",
      "no-proto": "error",
      "no-script-url": "error",
      "no-sequences": "warn",
      "no-with": "error",
      radix: "warn",
      "max-len": [
        "error",
        {
          code: 80,
          tabWidth: 2,
          ignoreUrls: true,
          ignoreStrings: true,
          ignoreTemplateLiterals: true,
          ignoreRegExpLiterals: true,
        },
      ],
      "new-cap": "warn",
      "no-array-constructor": "warn",
      "no-new-object": "warn",
      quotes: ["warn", "double", { allowTemplateLiterals: true }],
      semi: "warn",
      "spaced-comment": ["warn", "always"],

      // Custom rules from original config
      "import/no-unresolved": 0,
      indent: ["error", 2],
    },
  },

  // Configuration for test files with Mocha globals
  {
    files: ["test/**/*.js", "test/**/*.ts"],
    languageOptions: {
      globals: {
        describe: "readonly",
        it: "readonly",
        before: "readonly",
        beforeEach: "readonly",
        after: "readonly",
        afterEach: "readonly",
      },
    },
  },

  // Prettier config should be last to override other formatting rules
  prettierConfig,
];
