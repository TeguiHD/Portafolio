import js from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default [
  // Base JavaScript recommended rules
  js.configs.recommended,

  // TypeScript recommended rules
  ...tseslint.configs.recommended,

  // Global configuration
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2024,
        React: "readonly",
        JSX: "readonly",
      },
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },

  // React configuration
  {
    files: ["**/*.{jsx,tsx}"],
    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks,
    },
    rules: {
      // React rules
      "react/react-in-jsx-scope": "off", // Not needed in Next.js
      "react/prop-types": "off", // Using TypeScript
      "react/jsx-uses-react": "off",
      "react/jsx-uses-vars": "error",

      // React Hooks rules - MUST be errors
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },

  // TypeScript/JavaScript files
  {
    files: ["**/*.{ts,tsx,js,jsx,mjs}"],
    rules: {
      // ============================================
      // Security: ERRORS - Non-negotiable
      // ============================================
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",

      // ============================================
      // Code Quality: Warnings for gradual improvement
      // ============================================
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-require-imports": "off",

      // Empty catch blocks with comments are OK
      "no-empty": ["error", { allowEmptyCatch: true }],

      // These are common patterns that don't affect security
      "no-case-declarations": "warn", // Use {} blocks in case statements
      "no-useless-escape": "warn",
      "no-control-regex": "warn",
      "prefer-const": "warn",
    },
  },

  // Ignore patterns
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "public/**",
      "*.config.js",
      "*.config.mjs",
      "prisma/migrations/**",
      ".pnpm-store/**",
    ],
  },
];
