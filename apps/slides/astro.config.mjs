import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import AstroPWA from "@vite-pwa/astro";

import preact from "@astrojs/preact";

import {
  hostingSlidesCopyIntegration,
  hostingSlidesPublicPlugin,
} from "./hosting-slides-plugin.mjs";

export default defineConfig({
  prefetch: true,
  site: "https://slides.zrr.dev",
  i18n: {
    locales: ["en", "zh-cn"],
    defaultLocale: "zh-cn",
  },
  integrations: [hostingSlidesCopyIntegration(), AstroPWA(), preact()],
  vite: {
    plugins: [hostingSlidesPublicPlugin(), tailwindcss()],
  },
});
