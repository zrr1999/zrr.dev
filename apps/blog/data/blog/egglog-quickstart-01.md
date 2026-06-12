---
title: "Egglog 快速入门（一）：用等价饱和定义自然数运算"
author: "Zhan Rongrui"
description: "以 Peano 自然数的加法与乘法为例，介绍 egglog 语言：datatype、constructor、rewrite、check、run-schedule 与 saturate，以及 egg 与 egglog 的关系。"
pubDatetime: 2026-02-13
modDatetime: 2026-02-13
tags: ["编译/IR", "E-graph", "egg", "egglog", "等价饱和", "Term Rewriting"]
---

[egg](https://github.com/egraphs-good/egg) 是 Rust 实现的 e-graph 库，用于等价饱和（equality saturation）和程序优化；[egglog](https://github.com/egraphs-good/egglog) 是 egg 的继任者，将 e-graph 与 Datalog 结合，形成一门专门用于等价饱和应用的领域语言。egglog 比 egg 更通用、更高效，且用户无需写 Rust，只需用类 racket 的 S 表达式即可定义数据类型、重写规则和等价性检查。

本文是 **Egglog 快速入门** 系列的第一篇，以 Peano 自然数的加法与乘法为例，逐步拆解 egglog 程序的结构，说明 `datatype`、`constructor`、`rewrite`、`check`、`fail`、`run-schedule` 与 `saturate` 的用法。第二篇将把自然数扩展到整数、有理数与实数。

## 完整示例程序

下面是一段完整的 egglog 程序，定义 Peano 自然数、加法、乘法，并验证 $4 = 2 + 2$ 与 $6 = 2 \times 3$：

```racket
; recursive definition of naturals
(datatype N (Z) (S N))

; small constants
(let zero  (Z))
(let one   (S (Z)))
(let two   (S (S (Z))))
(let three (S (S (S (Z)))))

; addition
(constructor Plus (N N) N)
(rewrite (Plus (Z)   n) n)
(rewrite (Plus (S m) n) (S (Plus m n)))

; check that addition works
(let four1 (S three))
(let four2 (Plus two two))
(fail (check (= four1 four2)))
(run-schedule (saturate (run)))
(check (= four1 four2))

; multiplication
(constructor Times (N N) N)
(rewrite (Times (Z)   n) (Z))
(rewrite (Times (S m) n) (Plus n (Times m n)))

; check that multiplication works
(let six1 (Times two three))
(let six2 (Plus two (Plus two two)))
(fail (check (= six1 six2)))
(run-schedule (saturate (run)))
(check (= six1 six2))
```

下面逐段说明各部分的含义。

## 定义 Peano 自然数：datatype

```racket
(datatype N (Z) (S N))
```

`datatype` 声明一个代数数据类型。这里 `N` 是类型名，有两个构造器：

- `(Z)`：零，无参数；
- `(S N)`：后继，接受一个 `N` 类型的参数。

即标准的 Peano 自然数：$0 = \mathrm{Z}$，$1 = \mathrm{S}(\mathrm{Z})$，$2 = \mathrm{S}(\mathrm{S}(\mathrm{Z}))$，以此类推。

`datatype` 会展开为 `sort` 和若干 `constructor`，相当于在 e-graph 中注册这些构造器，供后续重写与匹配使用。

## 定义常量：let

```racket
(let zero  (Z))
(let one   (S (Z)))
(let two   (S (S (Z))))
(let three (S (S (S (Z)))))
```

`let` 将表达式绑定到变量。这些绑定会把对应的项加入 e-graph，并建立名称到 e-class 的映射。`zero`、`one`、`two`、`three` 分别对应 $0$、$1$、$2$、$3$。

## 加法：constructor 与 rewrite

```racket
(constructor Plus (N N) N)
(rewrite (Plus (Z)   n) n)
(rewrite (Plus (S m) n) (S (Plus m n)))
```

`constructor` 为已有类型添加新的构造器。`Plus` 接受两个 `N`，返回 `N`，因此 `(Plus m n)` 表示 $m + n$ 的语法形式。

两条 `rewrite` 规则定义了加法的语义：

1. **基准情况**：`(Plus (Z) n) => n`，即 $0 + n = n$。
2. **归纳情况**：`(Plus (S m) n) => (S (Plus m n))`，即 $(m+1) + n = (m + n) + 1$。

在 e-graph 中，`rewrite` 的作用是：只要左侧模式能匹配到图中的某个项，就将该项与根据右侧构建的新项**合并到同一个 e-class**，表示二者等价。等价饱和会反复应用这些规则，直到无法再推导出新的等价关系。

## 验证加法：check 与 fail

```racket
(let four1 (S three))
(let four2 (Plus two two))
(fail (check (= four1 four2)))
(run-schedule (saturate (run)))
(check (= four1 four2))
```

- `four1` 是 $3 + 1 = 4$ 的直接构造：`(S three)`；
- `four2` 是 $2 + 2 = 4$ 的形式：`(Plus two two)`。

在**未运行重写规则之前**，e-graph 中 `four1` 与 `four2` 尚不等价，因此 `(check (= four1 four2))` 会失败。`fail` 表示「期望该命令失败」；若内部命令失败，则 `fail` 成功，用于断言「运行前二者不等价」。

`(run-schedule (saturate (run)))` 会执行默认规则集，直到**饱和**（saturate），即不再产生新的等价关系。饱和后，加法的两条规则已将 `(Plus two two)` 归约到与 `(S (S (S (S (Z)))))` 等价的 e-class，因此此时 `(check (= four1 four2))` 会通过。

## 乘法：同样模式

```racket
(constructor Times (N N) N)
(rewrite (Times (Z)   n) (Z))
(rewrite (Times (S m) n) (Plus n (Times m n)))
```

乘法定义：

- $0 \times n = 0$；
- $(m+1) \times n = n + (m \times n)$，即 $m \times n + n$。

验证部分：

```racket
(let six1 (Times two three))   ; 2 * 3 = 6
(let six2 (Plus two (Plus two two)))  ; 2 + 2 + 2 = 6
(fail (check (= six1 six2)))
(run-schedule (saturate (run)))
(check (= six1 six2))
```

乘法规则会通过「展开-化简」将 `(Times two three)` 和 `(Plus two (Plus two two))` 归约到同一 e-class，因此饱和后二者等价。

## run-schedule 与 saturate

`(run N)` 表示运行规则 **N 轮**；每轮对所有规则做一次匹配-应用，然后重建 e-graph。固定轮数可能不足（未饱和）或过多（浪费时间）。

`(run-schedule (saturate (run)))` 的含义是：

- `(run)`：运行**默认规则集**（未显式指定 ruleset 的 rewrite 都属于该规则集）；
- `saturate`：反复运行直到**饱和**，即某一轮不再产生新的 union。

这样既能保证推导完整，又避免多余迭代。对于更复杂的程序，还可以用 `ruleset` 将规则分组，用 `(run-schedule (saturate ruleset1) (run ruleset2 4))` 等形式控制执行顺序和次数。

## 规则的两点注意

与 egg 一致，egglog 的规则有两点需要留意：

1. **定义 ≠ 执行**：只写 `rewrite` 并不会立刻改变 e-graph，必须通过 `run` 或 `run-schedule` 执行。
2. **仅在已有项上匹配**：规则只对 e-graph 中**已存在**的项进行匹配。若某项从未被构造或 union 进来，则不会触发对应规则。因此要先 `let` 出 `four1`、`four2` 等，重写才有机会作用到它们。

## 小结

egglog 通过 `datatype` / `constructor` 定义类型与项，通过 `rewrite` 声明等价关系，e-graph 在底层维护这些等价类；`check` 用于验证等价性，`fail` 用于断言失败；`run-schedule` 与 `saturate` 控制规则执行直到饱和。上述 Peano 自然数例子展示了「用重写规则定义运算语义、用等价饱和验证等式」的典型流程，是理解 egglog 的入门示例。

更多细节可参考 [egglog 官方教程](https://egraphs-good.github.io/egglog-tutorial/01-basics.html) 和 [egglog 文档](https://egraphs-good.github.io/egglog/docs/egglog/)。

## 参考文献

- [egglog tutorial: Equality Saturation](https://egraphs-good.github.io/egglog-tutorial/01-basics.html)
- [egglog 文档](https://egraphs-good.github.io/egglog/docs/egglog/)
- [Better Together: Unifying Datalog and Equality Saturation](https://www.mwillsey.com/papers/egglog)
