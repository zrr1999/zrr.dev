# zrr.dev

[Astro](https://astro.build) 个人站：主页、博客（Markdown / Typst）、幻灯片。**生产**：`zrr.dev`、`blog.zrr.dev`、`slides.zrr.dev`。旧域名 `sixbones.dev` 等仍为 `308` 入口，须在 Cloudflare 侧配置跳转（参见下表）。

**栈**：Tailwind、[Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/) + Wrangler。**工具**：Vite+（[vite-plus.dev](https://vite-plus.dev)，全局 `vp`）；日常开发与安装依赖请以 `vp` 为准（勿用裸 `pnpm` / `npm` / `yarn` 替代 toolchain），详见 [AGENTS.md](./AGENTS.md)。workspace 详见 `pnpm-workspace.yaml`。pre-commit、[版本锁定](AGENTS.md#配置)（Astro **`6.1.8`**、Vite+ **`0.1.18`** 等）亦在 AGENTS。

## 开发与检查

仓库根：

| 命令             | 说明                             |
| :--------------- | :------------------------------- |
| `vp install`     | 安装依赖                         |
| `vp run dev`     | 各 app 开发服务（过滤 `apps/*`） |
| `vp run build`   | 全部应用生产构建 → `apps/*/dist` |
| `vp run preview` | 预览构建结果                     |
| `vp check`       | 格式 + lint + 类型               |

另有 `vp fmt`、`vp lint`、`vp test`（见 AGENTS）。Pre-commit、[prek](https://github.com/j178/prek)：根目录 `pnpm install` 会跑 `prepare`，写入钩子；首次克隆可再执行 `prek install-hooks`。

## 项目结构

```
apps/root/      → 主页
apps/blog/
  data/blog/    → 文章
apps/slides/    → 幻灯前端；幻灯源在 hosting/slides/（不经 public 软链）
hosting/
```

博客 frontmatter / 排版规范：[AGENTS.md — 博客编写规范](./AGENTS.md#博客编写规范)。

## 部署模型

对每个应用：**先构建再 `wrangler deploy`**（脚本已拆分）。

| 应用          | Worker               | 域名                  | 构建                     | 部署                      |
| :------------ | :------------------- | :-------------------- | :----------------------- | :------------------------ |
| `apps/root`   | `zrr-website-root`   | `zrr.dev`（含 `www`） | `vp run build:cf:root`   | `vp run deploy:cf:root`   |
| `apps/blog`   | `zrr-website-blog`   | `blog.zrr.dev`        | `vp run build:cf:blog`   | `vp run deploy:cf:blog`   |
| `apps/slides` | `zrr-website-slides` | `slides.zrr.dev`      | `vp run build:cf:slides` | `vp run deploy:cf:slides` |

串联示例：`vp run build:cf:root && vp run deploy:cf:root`。

发布需 `wrangler login` 或环境变量 **`CLOUDFLARE_API_TOKEN`**（及按需 **`CLOUDFLARE_ACCOUNT_ID`**）。干净环境：`corepack enable && pnpm install --frozen-lockfile`。

### 旧域名跳转

| 来源                    | 目标                        |
| :---------------------- | :-------------------------- |
| `sixbones.dev/*`        | `https://zrr.dev/$1`        |
| `blog.sixbones.dev/*`   | `https://blog.zrr.dev/$1`   |
| `slides.sixbones.dev/*` | `https://slides.zrr.dev/$1` |

## 许可证

GPL-3.0 · © 2026 Zhan Rongrui · [LICENSE](./LICENSE)
