# AGENTS.md

面向 AI 代理的仓库约定。概览与部署见 [README](./README.md)。

## 结构

| 路径                   | 说明                                                                    |
| :--------------------- | :---------------------------------------------------------------------- |
| `apps/root/`           | 主页 `zrr.dev`（`sixbones.dev` → 308）                                  |
| `apps/blog/`           | 博客 `blog.zrr.dev`；`public/images` → `hosting/images/`                |
| `apps/slides/`         | 幻灯片 `slides.zrr.dev`；源在 `hosting/slides/<slug>/`                  |
| `packages/site-meta/`  | 站点身份：作者、版权文案、共用字体 URL                                  |
| `packages/site-theme/` | blog/slides 共用主题 CSS；`brand.css` 供 root 对齐品牌色                |
| `hosting/`             | 静态资源子模块（[zrr1999/hosting](https://github.com/zrr1999/hosting)） |

## 网站展示

- 网站统一使用“六个骨头”作为展示名，通过 `packages/site-meta` 的 `SITE_AUTHOR` 复用；网站不照搬简历姓名。
- 根站点的章节标题使用 `PageContent` 与 `SectionHeading`，按显示顺序自动编号，不手写章节序号。

## 工具链

统一用 **Vite+（`vp`）**，不要直接调 pnpm/npm/yarn（PATH 里的 `pnpm` 可能是旧版 `vp` shim）。

| 命令                                 | 说明                               |
| :----------------------------------- | :--------------------------------- |
| `vp install`                         | 安装依赖                           |
| `vp run dev` / `build` / `preview`   | 各 app 脚本（见根 `package.json`） |
| `vp fmt` / `lint` / `check` / `test` | 格式、lint、类型、测试             |

- **catalog**：Astro、Vite+、TypeScript、Tailwind 等版本在 `pnpm-workspace.yaml` 的 catalog / overrides 中统一；app 侧用 `catalog:`。
- **改 Astro / vite-plus 后**必须本地跑通 `vp run build`（或按 app `vp run --filter … build`），避免 vite-plus-core `generateBundle` 的 `Not implemented`（[vitejs/vite#22356](https://github.com/vitejs/vite/issues/22356)）。
- **TypeScript** 钉在 6.x：`astro check` 不兼容 TS 7 原生编译器（[withastro/astro#17268](https://github.com/withastro/astro/issues/17268)）。
- **pre-commit**：[prek](https://github.com/j178/prek)（`prek.toml`）。`vp install` → `prepare` 装钩子；本机需有 `prek`（如 `uvx prek`）。
- **PR 标题**：始终使用英文，与对话或 PR 正文的语言无关；同时遵守仓库既有标题格式。
- **CI**：`.github/workflows/`（校验，非生产部署）。部署模型见 [README](./README.md#部署模型)。
- 勿单独安装 Vitest / Oxlint / Oxfmt / tsdown；从 `vite-plus` 导入，不要从 `vite` / `vitest` 导入。自定义脚本与内置同名时用 `vp run <script>`。

内容集合 Zod：`import { z } from "astro/zod"`，与 `defineCollection` 分两条 import（见 `apps/blog/src/content.config.ts`）。

## 博客规范

文章在 `apps/blog/data/blog/`（Markdown / Typst）。Frontmatter 必填：`title`、`description`、`pubDatetime`、`tags`（默认 `["未分类"]`）；可选 `modDatetime`、`draft`、`featured` 等（见 `content.config.ts`）。

- 开篇 1～2 段引入，标题用 frontmatter；小节用 `##` / `###` / `####`，标题内不用「一、二、三」或「1.1」类序号；节间不用 `---`。
- 中英文之间加空格；能写纯中文则少混用；文末用 `## 参考文献` 或 `## 参考资料`。
- 示例：`eq-type-lsp.md`、`pycapsule-dlpack.md`、`incus-qcow2.md`。

## 代理自检

- [ ] 拉代码后 `vp install`
- [ ] 改完跑 `vp check`（及需要时的 `vp test` / 相关 `build`）
- [ ] 提交信息简洁；密钥不进仓库
