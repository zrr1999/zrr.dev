import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*.{astro,cjs,css,cts,js,json,jsx,md,mjs,mts,tsx,ts,yaml,yml}":
      "vp exec prettier --write",
  },
  fmt: {
    ignorePatterns: ["hosting/**"],
    semi: true,
    singleQuote: false,
    trailingComma: "es5",
    arrowParens: "avoid",
    tabWidth: 2,
    printWidth: 80,
  },
});
