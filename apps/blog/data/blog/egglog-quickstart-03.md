---
title: "Egglog 快速入门（三）：复数定义与内置类型"
author: "zrr1999"
description: "承接第二篇的实数定义，先纯构造定义复数，再介绍 egglog 内置的 i64、Rational、f64、Vec、Set、MultiSet 等类型，以及 function、extract、cost 等特性，并展示如何用它们实现高效复数运算。"
pubDatetime: 2026-02-17
modDatetime: 2026-02-17
tags: ["编译/IR", "E-graph", "egg", "egglog", "等价饱和", "Term Rewriting"]
---

[第二篇](egglog-quickstart-02) 用纯构造从自然数扩展到整数、有理数与实数。本文**承接第二篇**：先用已有类型定义复数及其运算，再介绍 egglog 的**内置类型**，并展示如何用它们实现高效运算。

## 复数的纯构造定义

复数 $a + bi$ 可表示为实部、虚部的有序对 $(a, b)$，其中 $a, b \in \mathbb{R}$。第二篇已定义实数 `R`（含 `FromRat`、`Sqrt` 等），可直接用 `Rect(R, R)` 表示：

```racket
; 复数：Rect(re, im) 表示 re + im·i
(sort C)
(constructor Rect (R R) C)

; 加法：(a+bi) + (c+di) = (a+c) + (b+d)i
(constructor CAdd (C C) C)
(rewrite (CAdd (Rect re1 im1) (Rect re2 im2))
  (Rect (RAdd re1 re2) (RAdd im1 im2)))

; 乘法：(a+bi)(c+di) = (ac-bd) + (ad+bc)i
(constructor CMul (C C) C)
(rewrite (CMul (Rect a b) (Rect c d))
  (Rect (RSub (RMul a c) (RMul b d))
        (RAdd (RMul a d) (RMul b c))))
```

其中 `RAdd`、`RSub`、`RMul` 为第二篇定义的实数运算。这样复数的加法和乘法完全由重写规则给出，不依赖内置类型。

## egglog 内置类型概览

egglog 提供若干 primitive 类型，可直接用于构造器参数和 rewrite 规则，无需逐层构造：

| 类型          | 说明                    | 典型运算                                               |
| ------------- | ----------------------- | ------------------------------------------------------ |
| `i64`         | 64 位有符号整数，含负数 | `+` `-` `*` `/` `%` `<<` `>>`                          |
| `Rational`    | 有理数（分数）          | `+` `-` `*` `/`                                        |
| `f64`         | 64 位浮点数             | `+` `-` `*` `/` `min` `max`                            |
| `String`      | 字符串                  | 拼接、比较                                             |
| `Unit`        | 单值类型                | -                                                      |
| `Map[K,V]`    | 键值映射                | `get` `set`                                            |
| `Vec[T]`      | 有序序列                | `push` `pop` `get` `set` `length` `concat`             |
| `Set[T]`      | 无序集合，无重复        | `insert` `remove` `contains` `length`                  |
| `MultiSet[T]` | 无序多重集合，允重复    | `insert` `remove` `contains` `length` `pick` `map` `+` |

在 `rewrite` 中可直接用 `(+ a b)`、`(* a b)` 等对 primitive 做运算，例如 `(rewrite (Add (Num a) (Num b)) (Num (+ a b)))` 表示 constant folding。

## 用内置类型实现复数

实际计算中，用 `f64` 包装实部、虚部更高效。定义 `F64Rect` 并做 constant folding：

```racket
(datatype Complex
  (F64Rect f64 f64)
  (Var String)
  (CAdd Complex Complex)
  (CMul Complex Complex))

; constant folding：加法
(rewrite (CAdd (F64Rect a b) (F64Rect c d))
  (F64Rect (+ a c) (+ b d)))

; 乘法：(a+bi)(c+di) = (ac-bd) + (ad+bc)i
(rewrite (CMul (F64Rect a b) (F64Rect c d))
  (F64Rect (- (* a c) (* b d))
           (+ (* a d) (* b c))))
```

验证 $(1+2i) + (3+4i) = 4+6i$：

```racket
(let c1 (F64Rect 1.0 2.0))
(let c2 (F64Rect 3.0 4.0))
(let sum (CAdd c1 c2))
(let four-six (F64Rect 4.0 6.0))
(run 5)
(check (= sum four-six))
```

若用 `Rational` 替代 `f64`，可得精确有理复数；用 `i64` 则只能表示高斯整数（实部、虚部均为整数）。

## MultiSet：无序多重集合

`MultiSet` 是有序无关的集合，**允许重复元素**，与 `Set` 不同。构造方式为 `(MultiSet e1 e2 ...)`，元素顺序不影响相等性：`(MultiSet 1 2 3)` 与 `(MultiSet 1 3 2)` 等价，但 `(MultiSet 1 1 2)` 与 `(MultiSet 1 2)` 不等价。

常用操作示例：

```racket
(datatype Math (Num i64) (Add Math Math) (Mul Math Math))

; 创建多重集合
(let xs (MultiSet (Num 1) (Num 2) (Num 3)))

; 相等性：顺序无关， multiplicity 有关
(check (= xs (MultiSet (Num 1) (Num 3) (Num 2))))
(fail (check (= xs (MultiSet (Num 1) (Num 1) (Num 2) (Num 3)))))

; insert 返回新多重集合；contains / not-contains 检查成员
(let ys (insert xs (Num 4)))
(check (contains ys (Num 4)))
(check (not-contains xs (Num 4)))

; + 为两多重集合的并（保留所有重复）
(check (= (+ xs xs) (MultiSet (Num 1) (Num 2) (Num 3) (Num 1) (Num 2) (Num 3))))
```

`map` 可对 MultiSet 中每个元素应用函数，结果仍为 MultiSet，重写规则可作用于映射后的元素，用于等价饱和中的批量变换。

## Vec 与 Set

`Vec` 表示**有序序列**，可用 `(sort T (Vec E))` 定义元素类型为 `E` 的向量类型 `T`。典型操作有 `push`、`pop`、`get`、`set`、`length`、`concat`。

`Set` 表示**无序集合**，不含重复元素，操作类似 MultiSet 的 `insert`、`remove`、`contains`、`length`，但不支持 `pick`（集合中元素无「任取一个」的确定语义）和多重性概念。

## function：自定义函数与合并语义

除 `relation`（关系表）和 `constructor`（代数数据类型）外，egglog 还提供 `function`，表示**输入到输出的函数依赖**。当同一输入产生多个输出时，可用 `:merge` 指定合并方式，合并表达式需满足**单调性**（形成格），以保证不同合并顺序得到一致结果：

```racket
(function LowerBound (Math) i64 :merge (max old new))
```

`function` 可配合 `:cost` 参与 extract 时的代价计算；可用 `set` action 更新函数值。

## extract 与 cost

`(extract expr)` 从 e-graph 中提取表达式的最优表示。默认每个 constructor 代价为 1；可通过 constructor 的 `:cost` 或 function 的 `:cost` 自定义。extract 会选择**代价最小**的等价形式，常用于程序优化场景。

## 其他命令速览

| 命令                            | 说明                                          |
| ------------------------------- | --------------------------------------------- |
| `ruleset` / `combined-ruleset`  | 规则分组，控制 `run` 或 `run-schedule` 的执行 |
| `prove` / `prove-exists`        | 证明给定事实成立                              |
| `push` / `pop`                  | 保存/恢复 e-graph 状态                        |
| `input` / `output`              | 从 CSV 读写函数数据                           |
| `print-function` / `print-size` | 打印函数表内容或大小                          |
| `include`                       | 包含其他 `.egg` 文件                          |

第二篇已介绍 `ruleset` 与 `run-schedule` 的用法；`prove`、`push`/`pop` 等适用于更复杂的交互与调试场景。

## 小结

承接第二篇的实数定义，复数可用 `Rect(R,R)` 纯构造；egglog 内置 `i64`、`Rational`、`f64`、`String`、`Map`、`Vec`、`Set`、`MultiSet` 等类型，可用 `F64Rect(f64,f64)` 配合 constant folding 实现高效复数运算。`MultiSet` 允许重复、顺序无关；`Vec` 为有序序列；`function` 支持自定义合并语义；`extract` 按 cost 选取最优表示。内置类型适合优化与数值计算，纯构造适合形式化与等价性证明。

## 参考文献

- [egglog tutorial: Equality Saturation](https://egraphs-good.github.io/egglog-tutorial/01-basics.html)
- [egglog 文档](https://egraphs-good.github.io/egglog/docs/egglog/)
- [egglog Command 类型说明](https://egraphs-good.github.io/egglog/docs/egglog/ast/type.Command.html)
- [egglog Python Multiset 示例](https://egglog-python.readthedocs.io/stable/auto_examples/multiset.html)
