import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  prefetch: true,
  site: "https://zrr.dev",
  i18n: {
    locales: ["en", "zh-cn"],
    defaultLocale: "zh-cn",
  },
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
