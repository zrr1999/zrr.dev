# zrr.dev 新增博文约定

适用于 `zrr1999/zrr.dev`。以下是写作入口，实际仓库的 `AGENTS.md`、schema 和脚本更新时，以当前文件为准。

## 读取位置

| 文件或目录                                        | 用途                       |
| ------------------------------------------------- | -------------------------- |
| `AGENTS.md`                                       | 博客排版、工具链和自检要求 |
| `apps/blog/src/content.config.ts`                 | 文章字段和内容加载规则     |
| `apps/blog/data/blog/`                            | Markdown / Typst 文章      |
| `apps/blog/package.json`、根 `package.json`       | 校验和构建脚本             |
| `apps/blog/src/utils/getPath.ts`                  | 文章 URL 规则              |
| `apps/blog/src/pages/posts/[...slug]/index.astro` | 页面生成与草稿过滤         |
| `README.md`                                       | 素材目录和部署模型         |

同类文章可参考 `_language/eq-type-lsp.md`、`_engineering/pycapsule-dlpack.md`、`_homelab/incus-qcow2.md`，不照搬旧版本命令和 API 用法。

## 新建文件与元数据

默认创建 `apps/blog/data/blog/_<主题>/<slug>.md`，从现有 `_language/`、`_ai/`、`_engineering/`、`_homelab/`、`_math/` 中选择最接近的主题，其余维度用 `tags`。只保留一层主题目录；以下划线开头的目录仅用于作者侧分组，不进入 URL。

文件名采用简短英文 kebab-case，不以 `_` 开头，在整个 `data/blog/` 下保持唯一。跨主题检查同名 `.md`、`.typ` 和实际路由是否冲突。用户要求 Typst 时参考现有 `.typ` 文件的元数据与写法，不把 Markdown frontmatter 直接套进去。

Markdown 最小结构如下，尖括号内容需替换成真实值：

```yaml
---
title: "<准确表达文章问题或结论的标题>"
description: "<说明文章具体讨论什么，避免重复标题和宣传用语>"
pubDatetime: <当前或用户指定的 ISO 8601 日期时间，包含时区>
tags: ["<复用已有相关标签>"]
---
```

- 明确填写 `title`、`description`、`pubDatetime`、`tags`；没有合适标签时使用 `["未分类"]`。
- 作者默认由 schema 经 `packages/site-meta` 的 `SITE_AUTHOR` 提供，当前展示名为“六个骨头”，不复制旧文章的姓名。新文章通常不写 `modDatetime`；不自动设置 `featured`、`canonicalURL` 或封面。
- 用户要求草稿，或关键事实尚待补全时使用 `draft: true`，并在交付时说明缺口。正文完整且用户未要求草稿时可省略该字段；这表示内容可参与构建，不代表已经部署。
- 是否发布由 `draft` 决定，不创建 `_drafts/` 之类的目录来隐藏文章。
- 当前文章路由会过滤 `draft: true`，开发模式也不会生成该详情页。不要把草稿页面打不开误判为正文构建失败。需要查看渲染时，在临时副本中验证，或按用户意图调整状态；不要为预览直接改变正式稿件状态。
- 未来日期并不保证文章详情页被隐藏，不能将 `pubDatetime` 当作可靠的定时发布或访问控制机制。

## 正文与素材

正文排版遵循仓库根 `AGENTS.md` 的“博客规范”，不在本 reference 重复维护。

- 配图目录为 `hosting/images/blog/<slug>/`，Markdown 文章引用 `/images/blog/<slug>/<file>`。`apps/blog/public/images` 是指向 `hosting/images/` 的软链。Typst 配图使用项目根路径 `/public/images/blog/<slug>/<file>`，避免相对 `../` 随主题目录深度变化。
- `hosting/` 是独立子模块；添加配图前查看其状态，只处理本篇素材。如果需要提交交付，先交付子模块内容，再更新父仓库指针。

## 校验与交付

统一使用 `vp`，不直接调用 npm、pnpm 或 yarn。首次拉取后或依赖未就绪时执行 `vp install`，按仓库规则检查依赖变更。

从仓库根目录运行：

```sh
vp check
vp run build:cf:blog
```

先核对脚本仍存在。博客构建当前包含 `astro check` 与 `astro build`；生成失败时根据实际错误修复本篇问题，环境或既有问题需单独报告。提交前还需按仓库要求通过 `prek`，只做正文改动通常不需要新增单元测试。

非草稿文章检查生成的详情页及使用到的图片、代码高亮、表格、公式或图示。草稿应确认内容 schema 和构建通过，并明确详情页未生成；若未做视觉检查，不声称已验证页面显示。

当前常规文章路径为 `/posts/<slug>`，`_主题/` 不进入 URL；依据 `getPath.ts` 和实际生成结果核对。线上地址只能作为预期路径展示，未部署时不要标记为已上线。
