# 平台边界

域名决定用户从哪里访问，仓库决定源码在哪里维护，部署单元决定哪些内容一起构建、发布和回滚。三者不需要一一对应。

这套结构统一两件事：小项目从 Lab 进入，公开文档从 `docs.zrr.dev` 发布。产品官网在项目侧独立演进。`blog.zrr.dev` 和 `slides.zrr.dev` 保持现有应用和部署。

## 日常操作

新增小项目时，在项目登记表加一条记录，并在 Lab 写介绍。文档原稿留在项目仓库，发布到 `docs.zrr.dev/<project>/`。

项目开始产品化时，在项目侧建立官网，入口使用 `<project>.zrr.dev`。Lab 保留目录卡片，原介绍页跳到这个官网。`<project>.zrr.dev/docs` 跳到 `docs.zrr.dev/<project>/`，章节路径保留。文档原稿仍在项目仓库。

项目获得专有域名时，给原来的官网部署换上正式入口。`<project>.zrr.dev` 整站跳到专有域名。专有域名上的 `/docs` 同样跳到 `docs.zrr.dev/<project>/`。官网可以留在代码仓库，也可以放在所属组织下的单独网站仓库。购买域名不再迁移网站工程。

文档权威地址在三个阶段都是 `docs.zrr.dev/<project>/`。产品站和专有域名上的 `/docs` 是进入这份文档的门口。

## 入口

| 入口                             | 定位                                   | 源码                                   |
| :------------------------------- | :------------------------------------- | :------------------------------------- |
| `zrr.dev`                        | 主站、身份与精选项目                   | `zrr1999/zrr.dev` 的 `apps/root`       |
| `lab.zrr.dev`                    | 小项目目录、实验介绍、已独立项目的索引 | `zrr1999/zrr.dev` 的 `apps/lab`        |
| `docs.zrr.dev/<project>/`        | 公开文档的权威地址                     | 页面框架在 `zrr.dev`，原稿在各项目仓库 |
| `<project>.zrr.dev`              | 产品化后的正式过渡官网                 | 项目侧仓库                             |
| 项目专有域名                     | 同一套官网的最终入口                   | 与上一阶段相同                         |
| `blog.zrr.dev`、`slides.zrr.dev` | 博客与幻灯片                           | 现有 `apps/blog`、`apps/slides`        |

```text
zrr.dev
    主站与精选项目

lab.zrr.dev
    /                         小项目目录
    /<project>/               介绍页，或跳到当前官网

docs.zrr.dev
    /                         文档目录与搜索
    /<project>/               该项目的权威文档

<project>.zrr.dev             独立部署的产品官网
    /docs/…                   跳到 docs.zrr.dev/<project>/…

<专有域名>                    同一套产品官网的新入口
    /docs/…                   跳到 docs.zrr.dev/<project>/…
```

Volvox、Spore 即使拥有独立官网，文档权威地址仍是 `docs.zrr.dev/volvox/`、`docs.zrr.dev/spore/`。官网放在哪里，和文档放在哪里，是两项决定。

## 生命周期

| 阶段     | 官网入口                     | 官网源码               | 文档权威地址                 |
| :------- | :--------------------------- | :--------------------- | :--------------------------- |
| 小项目   | `lab.zrr.dev/<project>/`     | 本仓库                 | `docs.zrr.dev/<project>/`    |
| 产品化   | `<project>.zrr.dev`          | 项目侧                 | 不变                         |
| 专有域名 | 专有域名                     | 项目侧，可以是单独仓库 | 不变                         |
| 归档     | 保留归档介绍，或仍可用的官网 | 留在当时的位置         | 保留最后可用版本，并标明归档 |

产品化是官网所有权的变化。项目需要独立的功能展示、安装入口、截图、发布节奏或品牌设计时，就可以把官网迁到项目侧。购买域名和开始收费都不是前提。已经买到域名的项目，也可以继续用 Lab 介绍。

`<project>.zrr.dev` 在使用期间是正式官网。

独立之后，Lab 保留一句话摘要、状态和官网链接，原介绍页跳到当前最终官网。Lab 直接跳到最终地址。已独立项目可以单独分组，目录仍以小项目为主。

```text
小项目：
lab.zrr.dev/example/ → 介绍页

产品化：
lab.zrr.dev/example/ → example.zrr.dev

专有域名：
lab.zrr.dev/example/ → product.example
example.zrr.dev/*    → product.example/*
```

`product.example` 是专有域名的占位符。

## 仓库

`zrr.dev` 继续用 Vite+ 和 catalog 管理前端依赖。Lab 与 Docs 沿用这套约定。

```text
zrr.dev/
├── apps/
│   ├── root/
│   ├── blog/
│   ├── slides/
│   ├── lab/                    # 目录与小项目介绍
│   └── docs/                   # 文档门户、搜索与发布入口
├── packages/
│   ├── site-meta/
│   ├── site-theme/
│   └── project-catalog/        # 登记、校验、地址与跳转
├── tooling/
│   └── docs/                   # 获取、构建、组装、检查
├── infra/
│   └── redirects/              # zrr.dev 域名上的跳转
├── .work/                      # 临时源码与中间产物，不提交
└── dist/                       # 发布产物，不提交
```

这份目录是职责边界。`apps/lab`、`apps/docs`、`tooling/docs` 和 `infra/redirects` 在对应阶段再创建。`.work/` 已忽略。

小项目仓库保持代码和文档原稿：

```text
project/
├── src/
├── docs/
└── 文档配置文件
```

产品化之后，官网进入项目侧。monorepo 可以使用 `apps/website/`，单独的网站仓库也可以。目录名按仓库现状放置，构建产品官网时不需要 checkout `zrr.dev`。

```text
project/
├── src/
├── docs/
├── website/                    # 或组织下的单独网站仓库
└── .github/workflows/
```

共享视觉可以在以后做成有版本的包。官网不依赖 `zrr.dev` 的 `main` 分支来构建。

## 项目登记

每个项目一份 TOML，文件名是长期稳定的项目标识。仓库改名、转移组织、更换官网域名，都不改变 `/cue/`、`/spore/` 这些文档路径。

```toml
name = "Zendev"
repository = "zendev-lab/zendev"
summary = "Repository-native development workflow toolkit"
status = "active"

[site]
kind = "lab"

[docs]
ref = "main"
builder = "zensical"
config = "zensical.toml"
legacy_hosts = ["docs.zendev.zrr.dev"]
```

网站归属只有 `kind`：

| `kind`     | 含义                             |
| :--------- | :------------------------------- |
| `lab`      | 本仓库渲染介绍页，不写外部 URL   |
| `external` | 必须写官网 URL。本仓库只保留入口 |

`status` 是另一个维度，取 `active` 或 `archived`。Lab 项目和独立官网都可以归档。

地址由标识推导：

```text
项目标识：zendev
Lab：https://lab.zrr.dev/zendev/
文档：https://docs.zrr.dev/zendev/
```

开始独立维护官网时，只改网站描述：

```toml
[site]
kind = "external"
url = "https://zendev.zrr.dev/"
```

官网在单独仓库时，加上 `site.repository`。购买专有域名后，把 `url` 改成新的源站地址。

登记表生成 Lab 卡片、文档目录、项目切换、官网按钮，以及属于 `zrr.dev` 的跳转。产品仓库自己声明官网的构建命令和部署域名。登记表记录“去哪里访问”。域名变更时，用检查核对目录链接和产品官网的 canonical。

构建期通过 `@zrr-website/project-catalog/load` 读取登记。地址、跳转和校验从 `@zrr-website/project-catalog` 引入。标识不能占用 `blog`、`slides`、`lab`、`docs`、`www`、`pagefind`、`assets`、`search`。

第一版文档构建器只有 `zensical`。出现第二种构建方式时，先扩展类型，再允许项目使用。

## 文档

各项目保留一份原稿。中央构建按登记的 ref 取出该版本，分别构建，再组装成一个静态目录，检查后一次发布。页面不使用 iframe，也不给每个项目留一个运行时拼起来的文档站。

```text
读取项目登记
    ↓
把 ref 解析成 commit SHA
    ↓
获取该版本的原稿和必要代码
    ↓
分别构建到隔离目录
    ↓
组装 dist/docs
    ↓
生成搜索索引、站点地图和来源清单
    ↓
检查链接、资源、跳转与 canonical
    ↓
发布完整站点
```

```text
dist/docs/
├── index.html
├── <project>/
├── pagefind/
├── sitemap.xml
└── 404.html
```

Cloudflare Workers Static Assets 随部署上传这个目录。Docs 不需要按请求转发的网关。

项目仓库拥有正文、图片、目录、项目导航和 API 生成逻辑。中央仓库拥有最终域名与路径、公共主题、项目切换、搜索入口、输出目录和发布规则。中央构建在临时工作区生成有效配置，按显式规则合并两边。Zensical 的 `docs_dir` 和 `site_dir` 相对配置文件解析，`site_url` 是 canonical。移动配置或只改 `site_url` 不能代替路径修正。Rill 的 `docs_dir` 指向生成目录，接入时要保留它自己的相对路径。

| 方面     | 约定                                        |
| :------- | :------------------------------------------ |
| 原稿     | 项目仓库中的一份                            |
| 路径     | 每个项目只拥有 `/<project>/` 下的内容和资源 |
| 链接     | 构建结果使用最终子路径                      |
| 编辑入口 | 指向项目仓库中的原稿                        |
| 权威规范 | 可以从 `spec/` 等原目录发布                 |
| 发布范围 | 只发布登记过的目录                          |

依赖代码生成的 API 文档，使用同一次构建锁定的代码版本。构建环境特别重的项目，可以改由项目仓库产出带源信息的静态产物，再由中央组装。那是例外，第一版不为每个项目增加发布系统。

`ref = "main"` 表示跟踪策略。一次构建把它解析成 SHA，并写入 `sources.lock.json`，记录中央网站版本、各项目仓库与 SHA、文档构建器及锁版本、公共主题版本和发布路径。这份清单随部署产物保存。

项目更新文档时，中央仓库不接收“更新文档副本”或“更新 SHA”的拉取请求。中央历史记录网站和发布规则的变化。

本地开发可以指定一个项目和本地源码目录。改一个项目的文档时，不需要下载其他项目，启动博客开发服务时也不拉取项目源码。

第一版提供中央手动构建，并按需要定期检查来源版本。之后再用受信的 GitHub App，把分支更新或正式发布变成中央构建通知。

使用 `repository_dispatch` 时，接收工作流位于默认分支。工作流里的 `GITHUB_SHA` 是中央仓库的提交，源项目 SHA 单独传递并验证。普通 `GITHUB_TOKEN` 的权限限于它所在的仓库。可写中央仓库的长期凭证不放进每个项目。

分项目构建，整站发布。任一必要构建失败，就保留上一份成功的 Docs 站点。这次失败不改变已经在线上的文档，也不挡住 Lab、主站或产品官网。发布入口串行执行。事件只表示可能有新内容，每次构建都重新核对登记项目的目标版本。

来源 SHA、主题版本、构建配置和发布路径上的缓存，等出现实际的性能瓶颈再加。

## 域名与跳转

新增两个中央部署单元，与现有站点分开发布：

```text
zrr-website-lab   → lab.zrr.dev
zrr-website-docs  → docs.zrr.dev
```

产品官网使用自己的部署单元。专有域名可以绑到原来的 Worker。绑定域名之外，还要单独配置旧域名跳转。

| 跳转                                  | 维护位置                                 |
| :------------------------------------ | :--------------------------------------- |
| `lab.zrr.dev/<project>/` → 当前官网   | 项目登记生成                             |
| `<project>.zrr.dev` → 专有域名        | `zrr.dev` 域名规则，由登记生成           |
| `<project>.zrr.dev/docs/…` → 中央文档 | 同上，专有域名阶段使用，避免再经过新官网 |
| 官网内部旧路径 → 新路径               | 产品仓库                                 |
| 官网 `/docs/…` → 中央文档             | 产品仓库                                 |
| 中央文档旧路径 → 新路径               | 中央文档发布配置                         |
| `*.zrr.dev` 上的旧文档主机            | 登记里的 `legacy_hosts`，由中央部署      |

同一条规则只在一处维护。路径跳转可以用静态 `_redirects`。按来源域名匹配的规则使用域名级 Redirect Rules。正式切换使用 `308`。旧入口直接指向最终目的地，并长期保留。

```text
lab.zrr.dev/example/
    → product.example/

example.zrr.dev/features/
    → product.example/features/

example.zrr.dev/docs/reference/cli/
    → docs.zrr.dev/example/reference/cli/

product.example/docs/reference/cli/
    → docs.zrr.dev/example/reference/cli/
```

域名迁移保留路径和查询参数。Lab 介绍页跳到官网的 canonical URL。切换后检查 HTTPS、canonical 和 sitemap。

`zrr.dev` 使用明确的域名绑定和这些跳转。不为 `*.zrr.dev` 增加一个通用网站路由器。

`legacy_hosts` 里的跳转，在 `docs.zrr.dev/<project>/` 已经提供对应页面之后才部署。

## 阅读体验

文档门户提供项目切换、搜索、官网链接、仓库链接和编辑入口。项目内部侧栏由该项目维护。

官网解释项目价值，文档首页引导学习和使用，README 提供仓库入口和快速开始。三处各写各的内容。

搜索在完整的 `dist/docs` 组装之后用 Pagefind 建立。页面可以带上项目字段，用来过滤。总入口默认搜索全部项目。进入一个项目后默认搜索该项目，并可以改搜全部。

Pagefind 按页面 `lang` 选择语言索引，中文分词使用支持该能力的 extended 构建。全项目搜索和跨语言搜索要分开验收。

第一版的文档路径是：

```text
docs.zrr.dev/<project>/...
```

实验项目可以跟踪主分支，需要稳定文档的项目可以跟踪发布版本。页面标出对应的版本或提交。需要多版本时再增加：

```text
docs.zrr.dev/<project>/dev/...
docs.zrr.dev/<project>/v/<version>/...
```

版本策略和官网是否独立无关。第一版不构建每个历史 tag。

## 发布边界

构建任务不持有生产部署凭证。部署任务只接收已经检查的静态产物。来自拉取请求的文档构建不进入生产。

中央只接受登记表里允许的仓库、来源和构建方式。事件载荷不能指定 shell 命令、下载地址或发布路径。生产来源必须是允许的分支或发布版本。

预览使用独立来源，并禁止索引。未审核的 HTML 或脚本不发布到生产 `docs.zrr.dev` 下面的预览目录。

| 检查                 | 期望                               |
| :------------------- | :--------------------------------- |
| 项目标识和发布路径   | 唯一，并避开公共资源目录           |
| 链接、图片和脚本     | 在最终子路径下可用                 |
| 官网与文档 canonical | 指向各自当前的正式地址             |
| 编辑入口             | 回到原稿仓库和路径                 |
| 不存在的页面         | 返回真实 404                       |
| 重定向               | 无循环，已知旧入口直接到达最终目标 |
| 搜索结果             | 地址、项目归属和语言行为正确       |
| 来源记录             | 能查到本次发布使用的各项目 SHA     |

已有的链接、格式和类型检查继续使用。新增代码负责登记和发布路径，不另做一套通用 lint。

## 落地顺序

第一阶段在本仓库增加 `apps/lab`、`apps/docs` 和登记表的站点消费。先接入 Zendev，走通获取源码、子路径构建、编辑链接和旧主机跳转。再接入 Rill，确认资源、搜索和导航互不干扰。Rill 的 `docs_dir` 不是默认目录，适合作为第二个样本。这一阶段不迁移官网，也不更换文档框架。

第二阶段把公开文档逐个接到 `docs.zrr.dev/<project>/`。新站可用之后，关闭原来的文档发布，并保留旧地址跳转。公共主题、项目切换和搜索归中央维护。各仓库继续保留原稿和项目导航。

第三阶段选一个准备产品化的项目，在项目侧建立官网并部署到 `<project>.zrr.dev`。登记从 `lab` 改为 `external`，Lab 介绍页改为跳转，文档地址不变。验收标准是：官网可以离开 `zrr.dev` 独立构建、发布和回滚，同时继续使用中央文档。以后购买专有域名，只调整域名绑定、canonical、目录链接和跳转。

## 当前登记

| 标识     | 代码仓库            | 网站                                                            | 文档                                                  |
| :------- | :------------------ | :-------------------------------------------------------------- | :---------------------------------------------------- |
| `cue`    | `zendev-lab/cue`    | Lab                                                             | 尚未登记构建方式                                      |
| `spark`  | `zendev-lab/spark`  | Lab                                                             | 尚未登记构建方式                                      |
| `zendev` | `zendev-lab/zendev` | Lab                                                             | Zensical，旧主机 `docs.zendev.zrr.dev`                |
| `rill`   | `zrr1999/rill`      | Lab                                                             | Zensical，旧主机 `rill.zrr.dev`                       |
| `spore`  | `spore-lang/spore`  | `https://spore-lang.dev/`，网站仓库 `spore-lang/spore-lang.dev` | 仍由 `docs.spore-lang.dev` 发布，接入中央文档前不登记 |

`rill.zrr.dev` 目前是文档站，同时也是 Rill 日后的产品主机名。文档迁到 `docs.zrr.dev/rill/` 之前，不部署这条旧主机跳转。Rill 产品化时删掉 `legacy_hosts`，把 `rill.zrr.dev` 交给官网。

Spore 的官网已经在组织下的单独仓库。`docs.spore-lang.dev` 不属于 `zrr.dev`，它的跳转由 Spore 网站仓库维护。中央文档接入后，该主机和 `spore-lang.dev/docs` 都指向 `docs.zrr.dev/spore/`。

Volvox 还没有可确认的公开代码仓库，登记表里先不放。首页上的个人项目也不自动进入登记表。

首页项目列表仍写在 `apps/root`。Lab 接管目录之前，调整已登记项目的对外摘要时，登记表和首页一起改。

登记表生成的跳转规则还没有部署。`lab.zrr.dev` 和 `docs.zrr.dev` 也还没有 Worker。
