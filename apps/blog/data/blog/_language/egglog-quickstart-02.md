---
title: "Egglog 快速入门（二）：从自然数到整数、有理数与实数"
author: "Zhan Rongrui"
description: "承接第一篇的 Peano 自然数，逐步扩展：先引入 Neg 构造器得到整数，再定义有理数为整数对，并展示 rule、:when、relation、birewrite 等 egglog 特性。"
pubDatetime: 2026-02-15
modDatetime: 2026-02-15
tags: ["编译/IR", "E-graph", "egg", "egglog", "等价饱和", "Term Rewriting"]
---

[第一篇](egglog-quickstart-01) 用 Peano 构造和纯重写规则定义了自然数的加法与乘法。本文从自然数出发，**逐步扩展**到整数与有理数，在此过程中展示 `constructor` 扩展、`rule`、`:when`、`relation`、`birewrite` 等 egglog 特性。第三篇将介绍内置类型，并以复数为例展示其应用。

## 从自然数到整数：引入 Neg

自然数 $\mathbb{N}$ 有零与后继。要得到整数 $\mathbb{Z}$，需要引入**负数**。一种做法是新增构造器 `Neg`：设 `Neg(n)` 表示 $-(n+1)$，即 `Neg(Z)` = $-1$，`Neg(S(Z))` = $-2$，以此类推。

```racket
; 复用第一篇的 N
(datatype N (Z) (S N))

; 整数：非负用 Pos，负用 Neg
;(datatype Z (Pos N) (Neg N))
; 用 constructor 扩展：为已有 sort 添加构造器
(sort Z)
(constructor Pos (N) Z)
(constructor Neg (N) Z)

; 自然数运算（同第一篇）
(constructor Plus (N N) N)
(rewrite (Plus (Z) n) n)
(rewrite (Plus (S m) n) (S (Plus m n)))

(constructor Times (N N) N)
(rewrite (Times (Z) n) (Z))
(rewrite (Times (S m) n) (Plus n (Times m n)))
```

接下来定义整数的加法 `IAdd`。非负 + 非负直接复用自然数加法；负 + 负可归约为 `Neg(Plus(S m)(S n))`；$0 + (-k) = -k$；正 + 负则需要递归处理（如 $(m+1) + (-(n+2)) = m + (-(n+1))$）。为简洁，下面只写出部分关键规则，完整定义可进一步推导：

```racket
(constructor IAdd (Z Z) Z)

; Pos(a) + Pos(b) = Pos(a+b)
(rewrite (IAdd (Pos a) (Pos b)) (Pos (Plus a b)))

; Neg(a) + Neg(b) = -(a+1) - (b+1) = -(a+b+2) = Neg(Plus(S a)(S b))
(rewrite (IAdd (Neg a) (Neg b)) (Neg (Plus (S a) (S b))))

; 0 + Neg(n) = Neg(n)
(rewrite (IAdd (Pos (Z)) (Neg n)) (Neg n))
(rewrite (IAdd (Neg n) (Pos (Z))) (Neg n))

; (m+1) + (-1) = m，即 Pos(S m) + Neg(Z) = Pos(m)
(rewrite (IAdd (Pos (S m)) (Neg (Z))) (Pos m))
(rewrite (IAdd (Neg (Z)) (Pos (S m))) (Pos m))

; (m+1) + (-(n+2)) = m + (-(n+1))：递归
(rewrite (IAdd (Pos (S m)) (Neg (S n))) (IAdd (Pos m) (Neg n)))
(rewrite (IAdd (Neg (S n)) (Pos (S m))) (IAdd (Pos m) (Neg n)))

; 交换律、结合律：用 birewrite 同时生成双向规则
(birewrite (IAdd x y) (IAdd y x))
(birewrite (IAdd (IAdd x y) z) (IAdd x (IAdd y z)))
```

加上 `birewrite` 后，`IAdd(a, b)` 与 `IAdd(b, a)` 会被归于同一 e-class，`IAdd(IAdd(a,b), c)` 与 `IAdd(a, IAdd(b,c))` 亦然，等价饱和能探索更多等价形式。验证 $2 + (-2) = 0$：

```racket
(let two (Pos (S (S (Z)))))
(let neg-two (Neg (S (Z))))
(let zero (Pos (Z)))
(let sum (IAdd two neg-two))
(fail (check (= sum zero)))
(run-schedule (saturate (run)))
(check (= sum zero))
```

## rule 与 relation

除 `rewrite` 外，egglog 还支持更一般的 `rule`：左侧是模式匹配，右侧是 `action`（如 `union`、`set`、向 `relation` 插入事实）。`relation` 声明一个关系表，可用于存储额外的事实；`rule` 在匹配成功时执行 action，例如向 relation 插入记录。

```racket
(datatype Expr (Add Expr Expr) (Var String) (Num i64))
(relation demand (Expr))

; 当 e 形如 Add(a,b) 时，向 demand 关系插入 a 和 b
(rule ((= e (Add a b)))
  ((demand a)
   (demand b)))
```

这种 demand 关系可用于按需推导，避免盲目展开。下面有理数部分会用到 `relation` 和 `rule` 表达「非零」约束。

## 有理数：整数对与 :when 条件

有理数可表示为分子、分母均为整数的分数 $\frac{p}{q}$（$q \neq 0$）。先声明 `Rat` 类型，再用 `Rat(p, q)` 表示 $p/q$：

```racket
(sort Rat)
(constructor Rat (Z Z) Rat)
```

为在运算中避免除零，可用 `relation` 表达「非零」约束，并用 `:when` 在规则中引用。上文已介绍 `rule`，这里用 `rule` 向 `nonzero` 关系插入「哪些整数非零」的事实：

```racket
(relation nonzero (Z))

; Pos(S n) 和 Neg(n) 均非零
(rule ((= z (Pos (S n)))) ((nonzero z)))
(rule ((= z (Neg n))) ((nonzero z)))
```

有理数加法和乘法规则可写成：

```racket
; 整数乘法（可复用第一篇 Times 或类似定义，此处略）
(constructor IMul (Z Z) Z)
; ...

; Rat(a,b) + Rat(c,d) = Rat(a*d+b*c, b*d)，要求 b,d 非零
(constructor RatAdd (Rat Rat) Rat)
(rewrite (RatAdd (Rat a b) (Rat c d)) (Rat (IAdd (IMul a d) (IMul b c)) (IMul b d))
  :when ((nonzero b) (nonzero d)))

; Rat(a,b) * Rat(c,d) = Rat(a*c, b*d)，要求 b,d 非零
(constructor RatMul (Rat Rat) Rat)
(rewrite (RatMul (Rat a b) (Rat c d)) (Rat (IMul a c) (IMul b d))
  :when ((nonzero b) (nonzero d)))
```

`:when` 表示该规则仅在满足条件时触发，展示了 egglog 的**条件重写**能力。约分可再添约分规则扩展。

## birewrite：双向等价

`rewrite` 是单向的；`birewrite` 会同时生成左右两个方向的规则，适用于交换律、结合律等双向等价。上文已在整数加法中用到：

```racket
(birewrite (IAdd x y) (IAdd y x))
(birewrite (IAdd (IAdd x y) z) (IAdd x (IAdd y z)))
```

等价于分别写 `(rewrite (IAdd x y) (IAdd y x))` 和 `(rewrite (IAdd y x) (IAdd x y))`，更简洁。同理，自然数加法也可加 `(birewrite (Plus x y) (Plus y x))`，有理数乘法可加 `(birewrite (RatMul a b) (RatMul b a))`。当规则左右对称时，用 `birewrite` 省去重复书写。

## 实数：有理数的扩展

有理数 $\mathbb{Q}$ 在数轴上有「空隙」：例如不存在有理数 $q$ 满足 $q^2 = 2$。数学中常见的完备化方式有两种：**Dedekind 分割**把实数定义为有理数的一种分割 $(A, B)$（$A$ 中每个元小于 $B$ 中每个元，且 $A$ 无最大元）；**Cauchy 序列**把实数定义为有理数列等价类（两序列等价当且仅当其差趋于 0）。两种方式都通过「填满空隙」得到完备的 $\mathbb{R}$。

在 egglog 的纯构造框架下，我们无法逐点表示所有实数（实数是不可数的），因此采用**符号化**策略：先嵌入有理数，再引入 $\sqrt{\cdot}$ 等符号构造器，表示可构造的一类实数，而非形式化完整的 $\mathbb{R}$。

```racket
; 实数：FromRat 将有理数嵌入为实数；(Sqrt R) 表示平方根
(sort R)
(constructor FromRat (Rat) R)
(constructor Sqrt (R) R)

; 有理数可直接作为实数参与运算
(constructor RAdd (R R) R)
(constructor RSub (R R) R)
(constructor RMul (R R) R)

; 有理数加法/乘法/减法在实数上的提升
(rewrite (RAdd (FromRat a) (FromRat b)) (FromRat (RatAdd a b)))
(rewrite (RSub (FromRat a) (FromRat b)) (FromRat (RatSub a b)))
(rewrite (RMul (FromRat a) (FromRat b)) (FromRat (RatMul a b)))

; sqrt(x)*sqrt(x) = x
(rewrite (RMul (Sqrt x) (Sqrt x)) x)
```

其中 `RatAdd`、`RatSub`、`RatMul` 为有理数运算（`RatSub` 依赖整数减法，可类似 `RatAdd` 定义）。`FromRat` 将有理数「提升」为实数；`Sqrt` 表示平方根，如 `(Sqrt (FromRat (Rat 2 1)))` 即 $\sqrt{2}$。更复杂的无理数（如 $\pi$、$e$）可类似添加构造器。第三篇将在此基础上定义复数。

## 小结

从自然数出发，通过 `constructor` 扩展出 `Pos`/`Neg` 得到整数，再用 `Rat(Z,Z)` 表示有理数，用 `FromRat`、`Sqrt` 等表示实数；用 `rule` 和 `relation` 表达 demand 与非零约束，用 `:when` 做条件重写，用 `birewrite` 处理交换律、结合律等双向等价。第三篇将承接本篇定义复数，再介绍 egglog 内置类型并展示其应用。

## 参考文献

- [egglog tutorial: Equality Saturation](https://egraphs-good.github.io/egglog-tutorial/01-basics.html)
- [egglog 文档](https://egraphs-good.github.io/egglog/docs/egglog/)
- [egglog integer_math.egg](https://github.com/egraphs-good/egglog/blob/main/tests/integer_math.egg)
