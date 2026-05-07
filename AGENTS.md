# AGENTS.md

AI 代理配置、工作流程与项目规范。项目概览见 [README](./README.md)。

## 项目结构

- `apps/root/` - 个人主页（`zrr.dev`，`sixbones.dev` 永久重定向到此）
- `apps/blog/` - 博客（`blog.zrr.dev`，`blog.sixbones.dev` 永久重定向到此）
- `apps/slides/` - 幻灯片（`slides.zrr.dev`，`slides.sixbones.dev` 永久重定向到此）

## 可用代理

### 代码优化代理

负责优化代码质量、格式化和最佳实践。

**职责范围**：

- 代码格式化和风格统一
- 性能优化建议
- 重构和代码清理
- 遵循项目编码规范

### 文档维护代理

负责维护项目文档的完整性和准确性。

**职责范围**：

- 更新 README 和其他文档
- 优化博客文章内容
- 确保文档与代码同步
- 修复文档中的错误和不一致

### 测试代理

负责编写和维护测试用例。

**职责范围**：

- 编写单元测试
- 编写集成测试
- 维护测试覆盖率
- 修复失败的测试

## 配置

- `package.json`（根目录脚本通过 pnpm `--filter './apps/*'` 在各 app 上执行 dev/build 等）与 `pnpm-workspace.yaml`
- **版本锁定（代理改依赖前必读）**：Astro 与各 app 保持一致且当前固定为 **`6.1.8`**；Vite+ 栈通过 workspace **catalog + overrides** 固定为 **`0.1.18`**。将 Astro 升到 **6.1.10+ / 6.2** 或将 vite-plus 升到 **0.1.19+** 前，须在本地跑通 **`pnpm run build`**，否则可能遇到 vite-plus-core 在 `generateBundle` 中的 **`Not implemented`**。`@astrojs/internal-helpers` 由 override 固定在 **`0.9.0`** 以匹配 markdown 集成。说明见 [README 工具链版本说明](./README.md#工具链版本说明)。
- `.github/workflows/` - CI / 校验（不负责生产部署）
- `.github/agents/` - 代理配置（若存在）

## 常用命令

项目使用 Vite+（`vp`），勿直接使用 pnpm/npm/yarn。详见下方 Vite+ 章节。

| 命令           | 说明               |
| :------------- | :----------------- |
| `vp install`   | 安装依赖           |
| `vp run dev`   | 启动开发服务器     |
| `vp run build` | 构建生产代码       |
| `vp fmt`       | 格式化代码         |
| `vp lint`      | 代码检查           |
| `vp check`     | 格式 + lint + 类型 |
| `vp test`      | 运行测试           |

## 工作流程

- **代码优化**：分析 → 识别机会 → 在仓库根运行 `vp fmt` / `vp check`（或各包 `vp fmt`）→ `vp test` → 提交
- **文档更新**：审查 → 更新内容 → 在相关包目录运行 `vp fmt . --check` 或通过根目录 `vp check` → 提交
- **测试维护**：分析覆盖率 → 补充用例 → `vp test` → 提交

## 最佳实践

- 提交前运行 `vp check` 和 `vp test`
- 遵循常规提交规范，单次提交保持最小化
- 审查代理更改时验证测试通过、文档同步

## 部署模型

- 生产环境使用 Cloudflare Pages 原生 Git 集成，直接跟踪 `main` 分支。
- 不要重新引入 GitHub Actions + orphan branch、Wrangler secrets 或其他仓库内发布步骤来做生产部署。
- 预期存在 3 个 Cloudflare Pages 项目，分别对应 `apps/root`、`apps/blog`、`apps/slides`；构建命令与输出目录以 [README](./README.md#部署模型) 为准。
- 旧域名 `sixbones.dev`、`blog.sixbones.dev`、`slides.sixbones.dev` 必须继续保留为 `308` 永久重定向入口，并将请求转发到新的公开域名。

## 博客编写规范

文章位于 `apps/blog/data/blog/`，使用 Markdown。

### Frontmatter

必填字段（参见 `src/content.config.ts`）：

- `title`：标题
- `description`：摘要，用于列表和 SEO
- `pubDatetime`：发布日期
- `modDatetime`：修改日期（可选）
- `tags`：标签数组，默认 `["未分类"]`

可选：`author`（默认 `SITE.author`）、`draft`、`featured`、`canonicalURL` 等。

### 正文结构

- **开篇**：1～2 段摘要或引入，不另行写 `# 标题`（标题来自 frontmatter）。
- **标题层级**：使用 `##`、`###`、`####` 表示一级、二级、三级小节；**不在标题中使用「一、二、三」或「1.1、2.1」等序号**，由层级表达结构即可。
- **节间**：节与节之间**不用** `---` 分隔。
- **参考文献**：放在文末，使用 `## 参考文献` 或 `## 参考资料`，链接列表即可。

### 排版与用词

- **中英文空格**：中文与英文单词或缩写之间加空格（如 `多 Agent 系统`、`LLM 作为`）。
- **减少中英混用**：能改用纯中文的尽量用纯中文；括号内的英文译名（如 `管道式/Pipeline`）可视情况改为纯中文（如 `流水线`）。
- **用词**：准确、易理解，尽量不用生僻词（如优先用「本质区别」而非「根本分野」）。

### 可选的 H1

若希望正文首行为与 `title` 相同的 `# 标题`（如部分教程），可保留；多数文章可直接从引言 `##` 开始。

### 参考示例

- `eq-type-lsp.md`：无 H1，`##` 小节、无序号、无 `---`
- `pycapsule-dlpack.md`：无 H1，`##` / `###` 结构
- `incus-qcow2.md`：短篇，`##` 小节 + `## 参考资料`

## 参考

- [README](./README.md) - 项目概览与快速上手
- [Astro](https://astro.build) | [Vite+](https://vite-plus.dev) | [pnpm](https://pnpm.io)

<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, but it invokes Vite through `vp dev` and `vp build`.

## Vite+ Workflow

`vp` is a global binary that handles the full development lifecycle. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

### Start

- create - Create a new project from a template
- migrate - Migrate an existing project to Vite+
- config - Configure hooks and agent integration
- staged - Run linters on staged files
- install (`i`) - Install dependencies
- env - Manage Node.js versions

### Develop

- dev - Run the development server
- check - Run format, lint, and TypeScript type checks
- lint - Lint code
- fmt - Format code
- test - Run tests

### Execute

- run - Run monorepo tasks
- exec - Execute a command from local `node_modules/.bin`
- dlx - Execute a package binary without installing it as a dependency
- cache - Manage the task cache

### Build

- build - Build for production
- pack - Build libraries
- preview - Preview production build

### Manage Dependencies

Vite+ automatically detects and wraps the underlying package manager such as pnpm, npm, or Yarn through the `packageManager` field in `package.json` or package manager-specific lockfiles.

- add - Add packages to dependencies
- remove (`rm`, `un`, `uninstall`) - Remove packages from dependencies
- update (`up`) - Update packages to latest versions
- dedupe - Deduplicate dependencies
- outdated - Check for outdated packages
- list (`ls`) - List installed packages
- why (`explain`) - Show why a package is installed
- info (`view`, `show`) - View package information from the registry
- link (`ln`) / unlink - Manage local package links
- pm - Forward a command to the package manager

### Maintain

- upgrade - Update `vp` itself to the latest version

These commands map to their corresponding tools. For example, `vp dev --port 3000` runs Vite's dev server and works the same as Vite. `vp test` runs JavaScript tests through the bundled Vitest. The version of all tools can be checked using `vp --version`. This is useful when researching documentation, features, and bugs.

## Common Pitfalls

- **Using the package manager directly:** Do not use pnpm, npm, or Yarn directly. Vite+ can handle all package manager operations.
- **Always use Vite commands to run tools:** Don't attempt to run `vp vitest` or `vp oxlint`. They do not exist. Use `vp test` and `vp lint` instead.
- **Running scripts:** Vite+ built-in commands (`vp dev`, `vp build`, `vp test`, etc.) always run the Vite+ built-in tool, not any `package.json` script of the same name. To run a custom script that shares a name with a built-in command, use `vp run <script>`. For example, if you have a custom `dev` script that runs multiple services concurrently, run it with `vp run dev`, not `vp dev` (which always starts Vite's dev server).
- **Do not install Vitest, Oxlint, Oxfmt, or tsdown directly:** Vite+ wraps these tools. They must not be installed directly. You cannot upgrade these tools by installing their latest versions. Always use Vite+ commands.
- **Use Vite+ wrappers for one-off binaries:** Use `vp dlx` instead of package-manager-specific `dlx`/`npx` commands.
- **Import JavaScript modules from `vite-plus`:** Instead of importing from `vite` or `vitest`, all modules should be imported from the project's `vite-plus` dependency. For example, `import { defineConfig } from 'vite-plus';` or `import { expect, test, vi } from 'vite-plus/test';`. You must not install `vitest` to import test utilities.
- **Type-Aware Linting:** There is no need to install `oxlint-tsgolint`, `vp lint --type-aware` works out of the box.

## CI Integration

For GitHub Actions, consider using [`voidzero-dev/setup-vp`](https://github.com/voidzero-dev/setup-vp) to replace separate `actions/setup-node`, package-manager setup, cache, and install steps with a single action.

```yaml
- uses: voidzero-dev/setup-vp@v1
  with:
    cache: true
- run: vp check
- run: vp test
```

## Review Checklist for Agents

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to validate changes.
<!--VITE PLUS END-->
