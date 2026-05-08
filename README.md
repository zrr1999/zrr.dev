# zrr.dev

个人网站项目，包含主页、博客和幻灯片展示功能。

当前生产域名为 `zrr.dev`、`blog.zrr.dev` 和 `slides.zrr.dev`；旧域名 `sixbones.dev`、`blog.sixbones.dev` 和 `slides.sixbones.dev` 保留为永久重定向入口。

## 项目简介

基于 Astro 的个人网站，包含：

- **个人主页**：卡片式布局展示个人信息和各个网站入口
- **博客系统**：使用 Astro 内容集合管理，支持 Markdown 和 Typst 格式
- **幻灯片展示**：展示个人演示文稿和技术分享
- **响应式设计**：适配各种设备尺寸
- **SEO优化**：内置 Open Graph 和 Twitter Card 支持

## 技术栈

- **框架**：[Astro](https://astro.build)
- **样式**：[Tailwind CSS](https://tailwindcss.com)
- **内容**：Markdown、Typst
- **部署**：[Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)（`wrangler deploy`，见各 `apps/*/wrangler.jsonc`）

## 开发命令

项目使用 [Vite+](https://vite-plus.dev)（`vp`），在根目录执行：

| 命令             | 说明                                                        |
| :--------------- | :---------------------------------------------------------- |
| `vp install`     | 安装依赖                                                    |
| `vp run dev`     | 启动开发服务器                                              |
| `vp run build`   | 构建到 `./dist/`                                            |
| `vp run preview` | 预览构建结果                                                |
| `vp fmt`         | 在仓库根目录格式化（Oxfmt，读取 `vite.config.ts` 的 `fmt`） |
| `vp lint`        | 代码检查                                                    |
| `vp check`       | 格式 + lint + 类型检查                                      |

各应用内的 `pnpm run format` / `format:check` 会调用 `vp fmt`（与根目录 `vp fmt` 共用同一份 `fmt` 配置）。

## 部署模型

生产部署统一为 [Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)：先对各应用执行 Astro 构建（输出到 `apps/*/dist`），再在同一应用目录用 [Wrangler](https://developers.cloudflare.com/workers/wrangler/) 发布。自定义域名在各自 `wrangler.jsonc` 的 `routes` 中声明（`custom_domain: true`），由 Cloudflare 按 Worker Custom Domain 流程接管，无需再使用 **Cloudflare Pages**。

| 应用          | Worker 名（`wrangler.jsonc` 的 `name`） | 生产域名（`routes`）     | 本地构建命令                              | 根目录一键发布（build + deploy） |
| :------------ | :-------------------------------------- | :----------------------- | :---------------------------------------- | :------------------------------- |
| `apps/root`   | `zrr-website-root`                      | `zrr.dev`、`www.zrr.dev` | `pnpm --filter @zrr-website/root build`   | `vp run deploy:cf:root`          |
| `apps/blog`   | `zrr-website-blog`                      | `blog.zrr.dev`           | `pnpm --filter @zrr-website/blog build`   | `vp run deploy:cf:blog`          |
| `apps/slides` | `zrr-website-slides`                    | `slides.zrr.dev`         | `pnpm --filter @zrr-website/slides build` | `vp run deploy:cf:slides`        |

发布前需已登录 Cloudflare CLI（`wrangler login`）或同时设置 **`CLOUDFLARE_API_TOKEN`** 与 **`CLOUDFLARE_ACCOUNT_ID`**。API Token 建议使用 Cloudflare 的 `Edit Cloudflare Workers` 模板（或至少包含 Workers Scripts 编辑权限）；如果不提供账号 ID，Wrangler 会先调用 `/memberships` 自动发现账号，此时 token 还需要 Memberships 读取权限。在干净环境（例如 CI）中需先安装依赖：`corepack enable && pnpm install --frozen-lockfile`。

### 旧域名永久重定向

旧域名应在 Cloudflare 仪表盘中通过 `Redirect Rules` 或 `Bulk Redirects` 配置为 `308` 永久重定向，并保留原始路径与查询参数：

| 旧域名                  | 目标域名                    |
| :---------------------- | :-------------------------- |
| `sixbones.dev/*`        | `https://zrr.dev/$1`        |
| `blog.sixbones.dev/*`   | `https://blog.zrr.dev/$1`   |
| `slides.sixbones.dev/*` | `https://slides.zrr.dev/$1` |

生产主机名由上述 Worker 的 **`routes` + `custom_domain`** 管理；旧域名仅作为跳转入口，不再由仓库生成单独的静态跳转分支。

## 项目结构

```
zrr.dev/
├── apps/
│   ├── root/            # 个人主页应用（zrr.dev）
│   ├── blog/            # 博客应用（blog.zrr.dev）
│   │   ├── src/         # 源代码
│   │   └── data/blog/   # 博客文章
│   └── slides/          # 幻灯片应用（slides.zrr.dev）
├── hosting/             # 托管相关配置
└── package.json         # 项目配置
```

## 个人主页

卡片式布局，展示：

- 个人简介和教育背景
- 博客入口
- 幻灯片集合入口
- GitHub 主页链接
- 简历链接
- 关于页面

主页部署在 `zrr.dev`，`sixbones.dev` 保留为永久重定向入口。

## 博客

文章位于 `apps/blog/data/blog/`，支持 Markdown (.md) 和 Typst (.typ)。Frontmatter 与正文规范见 [AGENTS.md](./AGENTS.md#博客编写规范)。

- `apps/blog/src/config.ts` - 站点配置
- `apps/blog/src/content.config.ts` - 内容集合配置

## 幻灯片

每套幻灯片为 `hosting/slides/` 下的独立目录；`apps/slides` 在开发与生产构建时从该路径提供 `/slides/*`，**不必**再在 `apps/slides/public/slides` 维护软链接。

## 工具链版本说明

本仓库用 **Vite+**（`vite-plus` / `@voidzero-dev/vite-plus-core`）统一驱动 Vite、格式化与测试。为与当前 Rolldown 集成兼容，**各应用将 Astro 固定为 `6.1.8`（精确版本）**，并将 **Vite+ 核心栈固定为 `0.1.18`**（见根目录 `pnpm-workspace.yaml` 的 `catalog` 与 `overrides`）。

在 **Astro 6.1.10+ / 6.2.x** 与 **vite-plus `0.1.19`–`0.1.20`** 的组合下，生产构建可能在 `@voidzero-dev/vite-plus-core` 的 `generateBundle` 阶段触发 **`Not implemented`**：与 [vitejs/vite#22356](https://github.com/vitejs/vite/issues/22356)（Rolldown 兼容层里对 esbuild `BuildResult` 的占位代理、与 **`astro:dev-toolbar`** 在 `optimizeDeps` 的 `onEnd` 中读取 `result.metafile`）描述一致。在 **Vite / Vite+** 合入修复前，不要解开下述 Astro 与 Vite+ 的锁定；构建日志里 **`resolve.alias` / `optimizeDeps.esbuildOptions` 弃用** 也多来自 **Astro 自带插件与生态**，在锁定组合下只能等上游。

`@astrojs/internal-helpers` 通过 pnpm **override** 对齐到 **`0.9.0`**，以满足 `@astrojs/markdown-remark` 等对子路径导出（如 `./object`）的要求，并避免与工作区提升版本不一致导致的运行时报错。

内容集合的 Zod 请使用 **`import { z } from "astro/zod"`**（与 `defineCollection` **分两条 import**），见 `apps/blog/src/content.config.ts`，以避免 `astro check` 对 `astro:content` 再导出 `z` 的弃用提示。

## 配置

- `package.json` / `pnpm-workspace.yaml` - 依赖与多包脚本（根目录 `pnpm run dev` 等会筛 `apps/*`）；含上述 catalog / overrides
- [AGENTS.md](./AGENTS.md) - AI 代理工作流与规范
- Cloudflare Workers — `wrangler.jsonc`（静态资源与自定义域名路由），`vp run deploy:cf:*` 发布

## 许可证

版权所有 © 2026 Zhan Rongrui。以 GNU 通用公共许可证第 3 版（GPL-3.0）发布，完整条文见 [LICENSE](./LICENSE)。
