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
- **部署**：Cloudflare Pages 原生 Git 集成

## 开发命令

项目使用 [Vite+](https://vite-plus.dev)（`vp`），在根目录执行：

| 命令             | 说明                   |
| :--------------- | :--------------------- |
| `vp install`     | 安装依赖               |
| `vp run dev`     | 启动开发服务器         |
| `vp run build`   | 构建到 `./dist/`       |
| `vp run preview` | 预览构建结果           |
| `vp fmt`         | 格式化代码             |
| `vp lint`        | 代码检查               |
| `vp check`       | 格式 + lint + 类型检查 |

## 部署模型

生产部署由 Cloudflare Pages 直接从 Git 仓库拉取 `main` 分支完成；仓库本身不再通过 GitHub Actions 发布 orphan branch，也不需要 Wrangler 或 Cloudflare API secrets。

三套站点分别对应三个 Cloudflare Pages 项目，建议都以仓库根目录作为 `Root directory`：

| 应用          | Cloudflare Pages 项目 | 生产域名         | Production branch | Build command                             | Build output directory |
| :------------ | :-------------------- | :--------------- | :---------------- | :---------------------------------------- | :--------------------- |
| `apps/root`   | root 站点项目         | `zrr.dev`        | `main`            | `pnpm --filter @zrr-website/root build`   | `apps/root/dist`       |
| `apps/blog`   | blog 站点项目         | `blog.zrr.dev`   | `main`            | `pnpm --filter @zrr-website/blog build`   | `apps/blog/dist`       |
| `apps/slides` | slides 站点项目       | `slides.zrr.dev` | `main`            | `pnpm --filter @zrr-website/slides build` | `apps/slides/dist`     |

如果 Cloudflare 未自动识别工作区安装步骤，可显式设置安装命令为 `corepack enable && pnpm install --frozen-lockfile`。

### 旧域名永久重定向

旧域名应在 Cloudflare 仪表盘中通过 `Redirect Rules` 或 `Bulk Redirects` 配置为 `308` 永久重定向，并保留原始路径与查询参数：

| 旧域名                  | 目标域名                    |
| :---------------------- | :-------------------------- |
| `sixbones.dev/*`        | `https://zrr.dev/$1`        |
| `blog.sixbones.dev/*`   | `https://blog.zrr.dev/$1`   |
| `slides.sixbones.dev/*` | `https://slides.zrr.dev/$1` |

新域名应直接绑定到各自的 Cloudflare Pages 项目；旧域名仅作为跳转入口，不再由仓库生成单独的静态跳转分支。

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

文件位于 `apps/slides/public/slides/`，每个幻灯片为独立目录。

## 配置

- `package.json` / `turbo.json` - 依赖与 Turborepo 构建
- [AGENTS.md](./AGENTS.md) - AI 代理工作流与规范
- Cloudflare Pages - 生产部署与域名绑定（在 Cloudflare 仪表盘中配置）

## 许可证

MIT。
