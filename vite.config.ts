import { defineConfig } from "vite-plus";
import { sharedLintIgnorePatterns } from "./oxlint.config.ts";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["packages/project-catalog/src/**/*.test.ts"],
  },
  lint: {
    ignorePatterns: [...sharedLintIgnorePatterns],
  },
  fmt: {
    ignorePatterns: ["hosting/**", "prek.toml"],
    semi: true,
    singleQuote: false,
    trailingComma: "es5",
    arrowParens: "avoid",
    tabWidth: 2,
    printWidth: 80,
  },
});
