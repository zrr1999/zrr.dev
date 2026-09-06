---
title: "E-graphs 学习笔记：动机与 Explanations"
author: "六个骨头"
description: "传统 Term Rewriting 的局限如何引出 E-graph；volvox 实战困境；egg 的 explain_equivalence、FlatExplanation 与 TreeExplanation，以及如何读懂除法化简的证明序列。"
pubDatetime: 2026-02-11
modDatetime: 2026-02-12
tags:
  [
    "编译/IR",
    "E-graph",
    "Term Rewriting",
    "egg",
    "程序综合",
    "程序验证",
    "证明",
    "Volvox",
  ]
---

在程序语言相关工具（优化、综合、验证）中，通常要对项（term）做等价变换。传统做法是 Term Rewriting，但它有根本性的局限。本文介绍这些局限及 E-graph 的动机，并讲解 egg 的 Explanations 机制——如何获取与理解「为什么两个项等价」的证明。

## 为什么需要 E-graph

### 传统 Term Rewriting 的局限

Term Rewriting 的基本流程是：

1. 给定项 $t$ 和一组重写规则 $l \to r$
2. 在 $t$ 的某个子项上用模式 $l$ 做匹配，得到替换 $\sigma$
3. 用 $\sigma$ 实例化右侧 $r$ 得到 $r[\sigma]$
4. 用 $r[\sigma]$ 替换该子项

**例子**：对 $42 \times (7 + 7)$ 应用规则 $x + x \to 2 \times x$：

- 匹配 $7 + 7$，得到 $\sigma = \{x: 7\}$
- $r[\sigma] = 2 \times 7$
- 结果：$42 \times (2 \times 7)$

每一步都很清晰，但问题在于「选择」。

### 破坏性与选择困难

核心问题在于「选择」：

**破坏性**：一旦应用某条规则，原项被覆盖，无法再回到原表达式。单步重写是单向的。

**局部 vs 全局**：在某个时刻选哪条规则、对哪个子项重写，往往难以做出全局最优决策。贪心策略容易走错路。

**回溯代价高**：想尝试另一条路，只能回溯，成本很高。

**例子**：C 编译器希望把 $a \times 2$ 改成更便宜的 $a \ll 1$。对 $(a \times 2) / 2$：

- 先改写乘法得到 $(a \ll 1) / 2$ —— 看似进步，但掩盖了乘除抵消的可能
- 更优的结果是直接得到 $a$

这说明：仅靠贪心、单步重写容易走错路，局部最优不等于全局最优。

### 正确思路：同时探索所有改写

理想的思路是：对所有可能的重写路径都进行探索，而不是在某一步上做单一路径选择。这样就不会因为「选错」而错过更好的结果。

但若每次重写都复制一份新项，空间会指数爆炸：

- $n$ 条规则 → $n$ 个新项
- 每项再应用 $n$ 条规则 → $n^2$ 项
- 深度 $m$ 需要存储约 $n^m$ 项

因此需要一个能**紧凑表示大量等价项**的数据结构。这就是 E-graph（等价类图，equivalence-class graph）要解决的问题。

### 实战：volvox 中的 SymPy 化简困境

在开发 [volvox](https://github.com/volvox-ai/volvox) 框架时，我在代码生成阶段用 SymPy 做表达式化简，也遇到类似问题。

场景是在 `codegen.py` 中：需要把 `floor(x/y)` 变成整除操作，以便生成更高效的 Python 代码。理论上可以用恒等式：

$
\lfloor x/y \rfloor = (x - x \bmod y) / y
$

但实际使用 `expr.replace(...)` 做模式替换时，问题出现了：

1. **表达式越化越复杂**：在某些情况下，应用这条规则会让表达式膨胀，而不是收敛。SymPy 的 replace 是破坏性的，一旦替换就回不去，也没有「成本」概念来比较不同表达式的优劣。

2. **规则顺序敏感**：化简规则的施加顺序影响很大。比如先化简 `(x % y) // y \to 0` 和先展开 `floor(x/y)`，结果可能完全不同。手动调顺序很脆弱，也很难保证全局最优。

3. **最终妥协**：为了稳定，只能保留两条最简单的规则（如 `floor(x/y) \to \mathtt{FloorDiv}(x, y)` 和 `(x \% y) // y \to 0`），放弃更激进的改写，以免误伤。

这正是 Term Rewriting 的典型困境：缺少一种能同时表示多种等价形式、并在其中做全局选择的机制。E-graph 恰好能填补这个空白。下面介绍 egg 的 Explanations 机制——在等价饱和后如何获取可解释的证明。

## egg 的 Explanations 机制

本小节对应 egg 官方教程 [03_explanations](https://egraphs-good.github.io/egg/egg/tutorials/_03_explanations/index.html)。

### 为什么需要 Explanations

在 e-graph 上做等价饱和后，我们不仅想知道最优结果，有时还需要知道**推导过程**：

- **调试错误规则**：若某条规则导致错误等价，需要 trace 显示推导路径
- **验证**：自动测试或 translation validation
- **可解释性**：向用户解释化简依据

egg 采用 [Proof-Producing Congruence Closure](https://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.76.1716&rep=rep1&type=pdf) 的思路，为等价关系生成 `Explanation`。

### 启用 Explanations

默认情况下 Runner 不记录证明信息。需要显式启用：

```rust
let mut runner = Runner::default()
    .with_explanations_enabled()  // 必须调用
    .with_expr(&start)
    .run(&rules);
```

`with_explanations_enabled()` 会在 e-graph 中开启 union 的 justification 记录，后续才能调用 `explain_equivalence`。

### explain_equivalence

给定起点表达式 `start` 和终点表达式 `end`，若两者在 e-graph 中等价，可生成证明：

```rust
let mut explanation = runner.explain_equivalence(&start, &end);
```

返回的 `Explanation<L>` 封装了从 `start` 到 `end` 的完整推导，支持两种表示：

| 方法                    | 返回类型 | 用途                               |
| ----------------------- | -------- | ---------------------------------- |
| `get_flat_string()`     | String   | 扁平证明，逐步展示每一步重写，易读 |
| `get_string()`          | String   | 树形证明，结构紧凑，支持子证明共享 |
| `get_string_with_let()` | String   | 树形 + let 绑定，进一步共享子证明  |

### FlatExplanation vs TreeExplanation

#### FlatExplanation：逐步展开

**结构**：`Vec<FlatTerm>`，每个元素是一个完整的项，与前一个之间恰好有一次重写。

**特点**：

- 每一步都是完整 S 表达式
- 每行（除第一行）恰好有一个 `(Rewrite=> rule expr)` 或 `(Rewrite<= rule expr)` 标注
- **易读**：适合人类理解、调试

**解读**：

- `Rewrite=>`：前一行的项经规则重写得到当前项
- `Rewrite<=`：当前项经规则重写得到前一行的项（方向相反）

#### TreeExplanation：树形紧凑

**结构**：`Vec<Rc<TreeTerm>>`，每个 `TreeTerm` 的子节点可以是 `Explanation`，即子项也有自己的证明。

**特点**：

- 子项可独立包含从 initial 到 final 的证明
- 支持 `Rc` 共享，避免重复
- **紧凑**：适合程序处理、证明检验

**格式**：`(Explanation initial-term final-term (Rewrite=> rule ...) ...)` 表示该子项从 initial 经若干重写变为 final。

#### 何时用哪种

| 场景                 | 推荐                                   |
| -------------------- | -------------------------------------- |
| 人工阅读、调试       | `get_flat_string()`                    |
| 自动化验证、证明检查 | `get_string()` 或 TreeExplanation 对象 |
| 需要最小化证明大小   | `get_string_with_let()`                |

### 除法化简示例与证明解读

#### 规则与程序

```rust
let rules: &[Rewrite<SymbolLang, ()>] = &[
    rw!("div-one"; "?x" => "(/ ?x 1)"),
    rw!("unsafe-invert-division"; "(/ ?a ?b)" => "(/ 1 (/ ?b ?a))"),
    rw!("simplify-frac"; "(/ ?a (/ ?b ?c))" => "(/ (* ?a ?c) (* (/ ?b ?c) ?c))"),
    rw!("cancel-denominator"; "(* (/ ?a ?b) ?b)" => "?a"),
    rw!("times-zero"; "(* ?a 0)" => "0"),
];

let start = "(/ (* (/ 2 3) (/ 3 2)) 1)".parse().unwrap();
let end = "1".parse().unwrap();
```

含义：$(2/3) \times (3/2)$ 再除以 1，应等于 1。

#### 输出证明序列解析

典型输出为：

```text
(/ (* (/ 2 3) (/ 3 2)) 1)
(Rewrite<= div-one (* (/ 2 3) (/ 3 2)))
(* (Rewrite=> unsafe-invert-division (/ 1 (/ 3 2))) (/ 3 2))
(Rewrite=> cancel-denominator 1)
```

**逐步解读**：

1. **第 1 行**：初始项 `(/ (* (/ 2 3) (/ 3 2)) 1)`，即 $\frac{(2/3)\times(3/2)}{1}$。

2. **第 2 行**：`(Rewrite<= div-one (* (/ 2 3) (/ 3 2)))`
   - `Rewrite<=`：当前项是由**后**一项经规则得到的
   - 即 `(* (/ 2 3) (/ 3 2))` 经 `div-one` 变成 `(/ (* (/ 2 3) (/ 3 2)) 1)`
   - 规则：`?x => (/ ?x 1)`，给任意项外包裹 `/ ... 1`

3. **第 3 行**：`(* (Rewrite=> unsafe-invert-division (/ 1 (/ 3 2))) (/ 3 2))`
   - 整体是 `(* (/ 1 (/ 3 2)) (/ 3 2))`
   - 第一个子项 `(/ 1 (/ 3 2))` 由 `unsafe-invert-division` 从前一对应位置得到
   - 规则：`(/ ?a ?b) => (/ 1 (/ ?b ?a))`，即 $\frac{a}{b} \to \frac{1}{b/a}$
   - 这里 `(/ 2 3)` 变成 `(/ 1 (/ 3 2))`，即 $\frac{2}{3} = \frac{1}{3/2}$

4. **第 4 行**：`(Rewrite=> cancel-denominator 1)`
   - `(* (/ 1 (/ 3 2)) (/ 3 2))` 经 `cancel-denominator` 得到 `1`
   - 规则：`(* (/ ?a ?b) ?b) => ?a`，即 $\frac{a}{b} \times b = a$
   - 代入 $a=1, b=3/2$：$\frac{1}{3/2} \times \frac{3}{2} = 1$

#### 数学等价链

用数学记号归纳：

$$
\frac{(2/3)\times(3/2)}{1}
\stackrel{\textrm{div-one}^{-1}}{=} (2/3)\times(3/2)
\stackrel{\textrm{inv}}{=} \frac{1}{3/2} \times \frac{3}{2}
\stackrel{\textrm{cancel}}{=} 1
$$

### 危险规则：除以零

教程指出，上述规则在含 `0` 的项上可能推导出荒谬结论。例如从 `0` 开始：

```text
0
(Rewrite<= times-zero (* (/ 1 0) 0))
(Rewrite=> cancel-denominator 1)
```

即：$0 = (/1/0) \times 0 \stackrel{\textrm{cancel}}{=} 1$。问题在于 `(/ 1 0)` 本身不应存在。此时可用 `explain_existence` 追踪某个项（如 `(/ 1 0)`）为何会出现在 e-graph 中，定位规则或输入的 bug。

### 运行示例

在仓库根目录下可运行 `egg-tutorial/` 示例：

```bash
cd egg-tutorial
cargo run
```

需先安装 Rust（`rustup default stable`）。将同时输出 FlatExplanation 和 TreeExplanation。

## 参考文献

- [egg tutorials 03_explanations](https://egraphs-good.github.io/egg/egg/tutorials/_03_explanations/index.html)
- [Proof-Producing Congruence Closure](https://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.76.1716&rep=rep1&type=pdf)
