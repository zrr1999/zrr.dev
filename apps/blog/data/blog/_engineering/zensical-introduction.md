---
title: "Zensical：面向文档的现代静态站生成器"
author: "六个骨头"
description: "Zensical 由 Material for MkDocs 的原班团队打造，用 Rust 与 Python 重构文档工具链。本文介绍其安装、配置、双主题与从 MkDocs 的平滑迁移。"
pubDatetime: 2026-01-27
modDatetime: 2026-01-27
tags: ["文档", "Zensical", "静态站点", "MkDocs", "Material"]
---

Zensical 是一款面向项目文档的现代静态站生成器，由 [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/) 的创建者从零设计，在保持「开箱即用、易用、可深度定制」理念的同时，用 Rust 与 Python 重写工具链，追求更快的迭代速度、更好的写作体验和可扩展的架构。目前处于 alpha 阶段，已与 Material for MkDocs 兼容，便于现有项目平滑迁移。

## 什么是 Zensical？

Zensical 用 Markdown 编写文档，通过 `zensical.toml`（或过渡期支持的 `mkdocs.yml`）配置，生成完全自包含的静态站点，无需数据库或后端服务。文档可部署到 GitHub Pages、CDN 或任意 Web 服务器，也可按离线场景打包分发。

### 核心特性

- **极简配置**： sensible 默认值下，仅需设置 `site_name` 即可构建
- **实时预览**：内置 Web 服务器，源码变更时自动重建并刷新
- **双主题**：`modern`（默认）为全新设计，`classic` 复刻 Material for MkDocs 的视觉效果
- **TOML 配置**：采用 TOML 替代 YAML，减少缩进错误和类型歧义（如 `no`、`off` 被误解析为布尔）
- **MkDocs 兼容**：可原生读取 `mkdocs.yml`，便于从现有 MkDocs / Material 项目迁移

## 安装与快速开始

Zensical 以 [Python 包](https://pypi.org/project/zensical) 发布，建议在虚拟环境中安装。

**使用 uv：**

```bash
uv init
uv add zensical
```

在目标目录执行 `zensical new .` 可生成标准结构：

```
.
├── .github/      # 含 GitHub Actions 工作流
├── docs/
│   ├── index.md
│   └── markdown.md
└── zensical.toml
```

之后可使用 `zensical serve` 在 localhost:8000 预览，用 `zensical build` 生成静态站点到 `site/`（默认）目录。

## 基本配置

`zensical.toml` 在 `[project]` 作用域下配置。除 `site_name` 外，强烈建议设置 `site_url`，以支持即时导航、即时预览和自定义错误页等能力。

示例：

```toml
[project]
site_name = "我的文档站"
site_url = "https://docs.example.com"
```

常用选项还包括：`site_description`、`site_author`、`copyright`、`docs_dir`、`site_dir`、`dev_addr`（开发服务器地址，默认 `localhost:8000`）等，详见 [官方文档](https://zensical.org/docs/setup/basics/)。

## 主题与从 MkDocs 迁移

Zensical 提供 `modern` 与 `classic` 两种主题。若希望延续 Material for MkDocs 的观感，可设置为 `classic`：

```toml
[project.theme]
variant = "classic"
```

两种主题的 HTML 结构与 Material for MkDocs 一致，既有的 CSS、JavaScript 定制在多数情况下可直接复用；若遇到表现差异，可优先尝试 `classic` 主题。

从 MkDocs 迁移时，可直接保留 `mkdocs.yml`，Zensical 会原生解析。新项目则推荐使用 `zensical.toml`，未来部分配置会逐渐从 `[project]` 拆出，官方会提供自动迁移工具。

## 参考文献

- [Zensical 官网](https://zensical.org/)
- [Zensical 文档：Get started](https://zensical.org/docs/get-started/)
- [Zensical 文档：Create your site](https://zensical.org/docs/create-your-site/)
- [Zensical 文档：Setup / Basics](https://zensical.org/docs/setup/basics/)
- [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/)
