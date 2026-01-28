import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Extend Next.js recommended configs
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    // Global ignores - these directories are never linted
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "public/**",
      "*.config.js",
      "*.config.mjs",
      "prisma/migrations/**",
    ],
  },
  {
    // TypeScript/JavaScript files configuration
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    rules: {
      // Security: Disable dangerous patterns
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",

      // Allow unused vars prefixed with underscore
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ],

      // Allow any for complex dynamic types (use sparingly)
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
];

export default eslintConfig;
