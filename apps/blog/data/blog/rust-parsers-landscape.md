---
title: "在 Rust 里写解析器：Chumsky、Pest 以及其他选择"
author: "六个骨头"
description: "对比 Chumsky 与 Pest 的设计理念与使用体验，并盘点 Rust 生态中常见的解析方案，帮助你为自己的语言、DSL 或工具链做出选型。"
pubDatetime: 2026-02-23
tags: ["Rust", "编译器", "解析器", "语言工具链"]
---

## 解析器在 Rust 里的几条路径

Rust 生态的解析器库大致可以分成几类：

- **组合子式解析器（Parser Combinator）**：在 Rust 代码中用组合子拼装语法规则，例如 Chumsky、nom / winnow。
- **基于文法文件的生成器**：把语法写成独立的文法文件，再生成解析代码，例如 Pest、LALRPOP。
- **面向 IDE / 工具链的增量解析方案**：如 Rowan、Tree-sitter，更偏向“永不失败”的错误恢复和增量更新。
- **纯词法层的工具**：如 Logos，只负责把源码切成 Token，后续解析自己接。

本文主要对比 Chumsky vs Pest，再顺带盘点一下其他常见选项，给一个比较清晰的心智地图。

## Chumsky vs Pest：两种完全不同的哲学

### 核心理念对比

|          | **Chumsky**                     | **Pest**                            |
| -------- | ------------------------------- | ----------------------------------- |
| 类型     | Parser Combinator               | PEG Grammar 文件                    |
| 语法定义 | 直接写在 Rust 代码里            | 独立的 `.pest` 文法文件             |
| 错误恢复 | ✅ 强调错误恢复与容错           | ❌ 主要做“失败就报错”，恢复较弱     |
| 学习曲线 | 中等：要习惯组合子风格          | 较低：看起来像 BNF，容易上手        |
| 类型安全 | ✅ 直接产出强类型 AST           | ⚠️ 返回通用 `Pair` 树，需要手工映射 |
| 生态绑定 | 常与 Ariadne 搭配做漂亮错误信息 | 本身专注在解析，错误展示需自己处理  |

可以简单理解为：

- **Pest** 更像“写文法 → 生成解析器”的传统流程，语法直观、工程分层清晰；
- **Chumsky** 更像“在 Rust 里拼积木”，用组合子堆出你的语法，同时顺手构建 AST、处理错误和 span。

## 示例：用 Pest 解析简单算术表达式

目标：解析 `1 + 2 - 3` 这样的表达式，把它识别成一串 `number` 和 `op`。

### `calc.pest`

```pest
number = @{ ASCII_DIGIT+ }
op     =  { "+" | "-" }
expr   =  { number ~ (op ~ number)* }
WHITESPACE = _{ " " }
```

### `main.rs`

```rust
use pest::Parser;
use pest_derive::Parser;

#[derive(Parser)]
#[grammar = "calc.pest"]
struct CalcParser;

fn main() {
    let pairs = CalcParser::parse(Rule::expr, "1 + 2 - 3").unwrap();

    for pair in pairs {
        for inner in pair.into_inner() {
            println!("{:?}: {}", inner.as_rule(), inner.as_str());
        }
    }
}
```

**输出：**

```text
number: "1"
op: "+"
number: "2"
op: "-"
number: "3"
```

你拿到的是一个**通用的 Pair 树**，里面只有“这是一个 `Rule::number`、`Rule::op`，它的文本是啥”。接下来通常要做两件事：

- **遍历 Pair 树**，按照自己的语义规则重建一个 AST；
- 在这个过程中手动维护 span 或位置信息，以便后续报错用。

优点是：

- `.pest` 文件的语法非常直观，团队里不写 Rust 的同学也能看懂、甚至参与修改；
- 文法和代码彻底分离，工程组织上比较清爽。

代价是：

- AST 构建的样板代码较多；
- 错误恢复和错误信息需要自己额外下功夫。

## 示例：用 Chumsky 直接构建强类型 AST

同样的目标，解析 `1 + 2 - 3`，这次我们想直接拿到一个带结构信息的 AST。

```rust
use chumsky::prelude::*;

#[derive(Debug)]
enum Expr {
    Num(i64),
    Add(Box<Expr>, Box<Expr>),
    Sub(Box<Expr>, Box<Expr>),
}

fn parser() -> impl Parser<char, Expr, Error = Simple<char>> {
    let num = text::int(10)
        .map(|s: String| Expr::Num(s.parse().unwrap()))
        .padded();

    let op = just('+').or(just('-')).padded();

    num.then(op.then(num).repeated())
        .foldl(|lhs, (op, rhs)| match op {
            '+' => Expr::Add(Box::new(lhs), Box::new(rhs)),
            '-' => Expr::Sub(Box::new(lhs), Box::new(rhs)),
            _   => unreachable!(),
        })
}

fn main() {
    let result = parser().parse("1 + 2 - 3");
    println!("{:#?}", result);
}
```

**输出：**

```text
Ok(
    Sub(
        Add(Num(1), Num(2)),
        Num(3),
    )
)
```

这里的几个关键点：

- `text::int(10)` 直接帮你识别整数；`map` 把它变成 `Expr::Num`，**解析和 AST 构建是同一步完成的**。
- `then`、`repeated`、`foldl` 这些组合子完全在 Rust 类型系统里工作：你最后得到的是一个 **`Expr`**，而不是一棵“通用 parse tree”。
- 错误类型（这里是 `Simple<char>`）由组合子统一管理，可以在上层转换成更丰富的错误结构，结合 Ariadne 做“rustc 风格”的多标签错误输出。

相比 Pest：

- **优点**：没有 Pair → AST 的中间样板层，类型安全、可组合性很强；和 span / 错误恢复的集成更自然。
- **缺点**：文法散落在 Rust 代码里，对“习惯看 BNF/EBNF”的人来说不够直观；组合子风格本身也有个适应过程。

## 错误恢复与 IDE 友好性：Chumsky 的优势在哪里？

传统很多解析库都把重点放在“**成功解析一份合法输入**”，而对“**如何优雅地处理不合法输入**”关注较少。对于编译器前端、LSP、静态分析工具来说，这个优先级其实是反过来的——现实世界的代码大部分时间是“不合法”的。

Chumsky 的设计基本上是沿着这条思路来的：

- **内置 span 支持**：你可以为自己的 span 类型实现 `Span` trait，`map_with_span` 可以在构建 AST 时保留来源位置信息。
- **与 Ariadne 的紧密配合**：
  - Chumsky 负责产出含 span 的错误、警告等信息；
  - Ariadne 负责把它们打印成 rustc 一样的“代码片 + 高亮标签 + 多条注释”的诊断信息。
- **错误恢复机制**：只要你合理配置“在出错时如何恢复”（比如跳过某些 token、插入缺失的分号等），就很难让解析器彻底崩掉，往往能：
  - 一次性报告多处语法错误；
  - 仍然产出一棵“足够好”的 AST 供后续阶段使用（比如类型检查、名字解析）。

如果你想在**语义层**（名字解析、类型检查等）继续报漂亮的错误，核心做法就是：

- 在解析阶段用 `map_with_span` 把 span 塞进 AST；
- 语义分析阶段如果发现“未声明的变量”“类型不匹配”等问题，直接拿回这些 span，丢给 Ariadne 渲染。

相比之下，Pest 本身并不围绕“永不失败式解析”和 IDE 场景设计，你需要更多手工工作来：

- 维护 span；
- 在出错时走自定义的恢复逻辑；
- 再把通用 Pair 树上的错误映射到用户看到的诊断上。

## 除了 Chumsky 和 Pest 还能选什么？

### nom / winnow：偏向性能和二进制协议的组合子

- **类型**：Parser Combinator。
- **擅长领域**：
  - 高性能解析二进制协议、网络包；
  - 在已知输入大多是“合法且规整”的场景（比如协议栈）。
- **特点**：
  - 零拷贝、迭代器友好、性能非常好；
  - 错误恢复和 IDE 友好性不是首要目标，做复杂的 span、错误渲染会比较“反人类”。

如果你是做 **网络协议解析、日志格式解析** 之类的工作，`nom` / `winnow` 依然是非常好的选择；但如果是做 **语言前端 / LSP**，一般会更推荐 Chumsky 这种更偏“语言工具链”的库。

### LALRPOP：LR 风格的文法生成器

- **类型**：基于文法文件的生成器，走 LALR 风格的解析。
- **优点**：
  - 对来自传统编译原理背景的人非常亲切；
  - 对某些左递归、表达式优先级等复杂语法，LR 风格可能比 PEG / LL 组合子更直观。
- **缺点**：
  - 工具链和调试体验更接近“Yacc/Bison 时代”，需要适应；
  - 错误恢复、IDE 增量解析这些问题上需要自己额外设计。

如果你更习惯 **Yacc/Bison 风味**，而又希望使用 Rust，LALRPOP 是值得认真看一眼的。

### Rowan 与基于事件的增量解析

- **定位**：为 IDE / 语言服务器提供**可增量更新的具体语法树（CST）**。
- **代表性使用者**：`rust-analyzer`。

核心思想大致是：

- 解析阶段不是直接构建 AST，而是生成一系列“事件”（enter node / leave node / token）；
- 事件流再交给 Rowan 组装成一棵可共享结构的树（Green/Red nodes），方便局部更新、保留注释和空白等；
- 再在 CST 之上构建更高层的 AST、类型信息等。

这套东西本身并**不是**一个通用解析库，而更像“**解析完成之后，怎么把结果组织得对 IDE 友好**”。

在实践中，可以考虑：

- 用 Chumsky 做解析和错误恢复；
- 在 Chumsky 产出的结构基础上，构建 Rowan 的 Green/Red 树。

这类架构适合你打算做一个“**有 IDE 等级支持**”的语言。

### Tree-sitter 以及 Rust 绑定

- **类型**：增量、面向 IDE 的解析框架，多语言通用。
- **特点**：
  - 用特定 DSL 写文法，生成可增量更新的解析器；
  - 很多主流编辑器/IDE（包括 NeoVim、VSCode 插件）使用它为多语言提供语法高亮、结构化信息。

对 Rust 来说，更常见的用法是：

- 使用已有语言的 Tree-sitter grammar；
- 或者自己维护一份 grammar，主要为编辑器服务。

如果你的目标是“**我有一门语言，想让它在现有编辑器表现得像一级公民**”，Tree-sitter 是一个非常务实的选项。

### Logos：只做 Token 的快速词法器

- **定位**：高性能、声明式的 lexer。

通常的组合是：

- `Logos` 产出 token 流；
- 再交给 Chumsky / nom / Pest / LALRPOP 等做语法级解析。

如果你对语法层已经比较满意，只是想把**词法阶段**从手写状态里解放出来，可以单独考虑 Logos。

## 选型建议：你到底该用哪个？

可以根据自己的场景反推：

- **我想写一个有点“像 Rust 那样”的语言前端 / 编译器 / LSP**：
  - **优先考虑：Chumsky + Ariadne**：
    - 强类型 AST；
    - 错误恢复体验好；
    - 和 span / 诊断系统集成自然。
  - 如果你非常在意 IDE 增量更新，可以再叠加 Rowan / Tree-sitter 的思路。

- **我需要一个简单可读、对团队友好的语法定义方式**：
  - **优先考虑：Pest 或 LALRPOP**：
    - `.pest` / `.lalrpop` 文件类似 BNF，易读易审查；
    - 再用手工代码从 parse tree 转成 AST。

- **我做的是网络协议、日志格式、二进制文件解析，性能优先**：
  - **优先考虑：nom / winnow**：
    - 针对高性能、零拷贝场景优化；
    - 错误恢复一般不是刚需。

- **我的主要目标是让语言在编辑器里“像一级公民”**：
  - **优先考虑：Tree-sitter 或 Rowan 系列方案**：
    - 从一开始就按 IDE 需求设计 CST 和增量解析。

更现实一点的答案是：**真正的项目往往会“混搭”这些工具**：

- Logos + Chumsky + Ariadne：从词法到解析再到错误展示，一条龙；
- Pest / LALRPOP + 自己的错误系统：重用语法定义，自己管理诊断；
- Chumsky 负责语法 + Rowan 负责树结构 + 自己写的类型检查：语言工具链全家桶。

## 参考资料

- Chumsky：<https://github.com/zesterer/chumsky/>
- Ariadne（错误渲染）：<https://github.com/zesterer/ariadne>
- Pest：<https://pest.rs/>
- nom：<https://github.com/rust-bakery/nom>
- winnow：<https://github.com/winnow-rs/winnow>
- LALRPOP：<https://github.com/lalrpop/lalrpop>
- Rowan：<https://github.com/rust-analyzer/rowan>
- Tree-sitter：<https://tree-sitter.github.io/tree-sitter/>
- Logos：<https://github.com/maciejhirsz/logos>
