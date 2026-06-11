import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import vue from "@astrojs/vue";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import AstroPWA from "@vite-pwa/astro";
import pagefind from "astro-pagefind";
import mdx from "@astrojs/mdx";
import { unified } from "@astrojs/markdown-remark";
import mermaid from "astro-mermaid";
import { typst } from "astro-typst";
import remarkMath from "remark-math";
import remarkCodeTitles from "remark-code-titles";
import remarkToc from "remark-toc";
import remarkCollapse from "remark-collapse";

import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeKatex from "rehype-katex";

import { SITE } from "./src/config";

const markdownRemarkPlugins = [
  [remarkToc, { heading: "目录" }],
  [
    remarkCollapse,
    {
      test: "目录",
      summary: "查看目录",
    },
  ],
  remarkCodeTitles,
  remarkMath,
];

const markdownRehypePlugins = [rehypeSlug, rehypeAutolinkHeadings, rehypeKatex];

const markdownProcessor = unified({
  remarkPlugins: markdownRemarkPlugins,
  rehypePlugins: markdownRehypePlugins,
});

export default defineConfig({
  prefetch: true,
  site: SITE.website,
  i18n: {
    locales: ["en", "zh-cn"],
    defaultLocale: "zh-cn",
  },
  integrations: [
    mermaid({ autoTheme: true }),
    mdx({ processor: markdownProcessor }),
    typst({
      options: {
        remPx: 14,
      },
      target: id => {
        if (id.includes("/data/")) return "html";
        if (id.endsWith(".html.typ") || id.includes("/html/")) return "html";
        return "svg";
      },
    }),
    sitemap(),
    vue(),
    react(),
    pagefind(),
    AstroPWA(),
  ],
  markdown: {
    syntaxHighlight: "shiki",
    remarkPlugins: markdownRemarkPlugins,
    rehypePlugins: markdownRehypePlugins,
    shikiConfig: {
      themes: { light: "min-light", dark: "night-owl" },
      wrap: true,
    },
  },
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ["@resvg/resvg-js"],
    },
    ssr: {
      external: ["@myriaddreamin/typst-ts-node-compiler"],
    },
  },
  // scopedStyleStrategy: "where",
  // experimental: {
  // },
});
