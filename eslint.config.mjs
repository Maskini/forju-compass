import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Promptfoo plugins and the Node preload use the CommonJS loader.
  {files:["tools/release/**/*.cjs"],rules:{"@typescript-eslint/no-require-imports":"off"}},
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "work/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "tools/visitor-checks/report*/**",
    "tools/visitor-checks/results*/**",
  ]),
]);

export default eslintConfig;
