---
title: "SymPy 符号计算能力调研"
description: "研究 SymPy 与类符号计算系统的核心机制：表达式结构、求导与积分规则、化简策略及积分变换的实现方式"
pubDatetime: 2026-02-16
modDatetime: 2026-02-17
tags: ["Python", "SymPy", "符号计算", "CAS", "科学计算"]
---

SymPy 是 Python 生态中最知名的开源符号计算库，也是计算机代数系统（Computer Algebra System, CAS）的代表实现。其表达式表示、规则应用和化简策略等机制对理解符号计算系统至关重要。本文将研究 SymPy 的核心机制，涵盖运算结构、求导与积分的规则实现、化简策略及积分变换，并在文末对比类 SymPy 系统（如 Symbolica、MathCore、Symmetrica 等）在表达式表示、规则驱动等层面的实现差异。

## 运算与核心结构

### 基本运算

SymPy 将表达式抽象为统一的 `Basic` 对象，核心运算对应以下内部结构：

| 结构  | 对应运算 | 示例                            |
| ----- | -------- | ------------------------------- |
| `Add` | 加法     | `a + b`                         |
| `Mul` | 乘法     | `a * b`                         |
| `Pow` | 幂       | `a ** b`                        |
| `Sub` | 减法     | `a - b`（内部为 `a + (-1)*b`）  |
| `Div` | 除法     | `a / b`（内部为 `a * b**(-1)`） |
| `Mod` | 取模     | `a % b`                         |

所有符号对象通过 `sympify()` 转为 SymPy 可用的类型；支持 `evaluate=False` 延迟求值，便于保留表达式原始结构。

### 关系与逻辑

比较运算包括 `Eq`（Equal，等于）、`Ne`（Not Equal，不等于）、`Lt`（Less Than，小于）、`Le`（Less or Equal）、`Gt`（Greater Than）、`Ge`（Greater or Equal）；逻辑运算有 `Or`、`And`、`Not`。符号对象可通过 `.is_*` 属性查询假设（如 `is_real`、`is_positive`），用于基于假设的化简。

### 初等函数

**三角函数**：`sin`、`cos`、`tan`、`cot`、`sec`、`csc`、`sinc`。当自变量为 π 的有理倍数时（如 π/2、π/6）会自动求值。

**反三角函数**：`asin`、`acos`、`atan`、`acot`、`asec`、`acsc`、`atan2`。`atan2(y, x)` 按象限正确确定角度范围 \((-\pi, \pi]\)。

**双曲函数**：`sinh`、`cosh`、`tanh`、`coth`、`sech`、`csch` 及对应反函数 `asinh`、`acosh`、`atanh` 等。

**指数与对数**：`exp`、`log`（自然对数）、`ln`。`sqrt(x)` 等价于 `x**0.5`。

**复数与其它**：`re`、`im`、`conjugate`、`Abs`、`sign`、`arg`；`Min`、`Max` 用于多变量极值。

### 特殊函数

支持 `gamma`、`factorial`、`binomial`、`hyper`、`meijerg`（Meijer G 函数）、`besselj`、`besseli`、`erf`（误差函数，error function）等。部分积分会返回含这些函数的非初等表达式。

## 求导规则

### API 与用法

- `diff(expr, x)` 或 `expr.diff(x)`：对 `expr` 关于 `x` 求导
- 高阶导数：`diff(expr, x, 3)` 或 `diff(expr, x, x, x)`
- 混合偏导：`diff(expr, x, y, y, z, 4)` 表示 ∂⁷/(∂x ∂y² ∂z⁴)
- 未求值形式：`Derivative(expr, x).doit()` 可延迟计算

### 自定义求导

- `_eval_derivative(self, x)`：在自定义子类中实现，可调用链式法则
- `fdiff(argindex=1)`：在 `Function` 子类中实现，返回函数本身导数（不含链式法则）

### 常用导数规则

| 表达式     | 导数                            |
| ---------- | ------------------------------- |
| `x` 对 `x` | `1`                             |
| 常数       | `0`                             |
| `a + b`    | `a' + b'`                       |
| `a * b`    | `a'*b + a*b'`                   |
| `a / b`    | `(a'*b - a*b')/b²`              |
| `a**b`     | `b*a**(b-1)*a' + a**b*ln(a)*b'` |
| `sin(x)`   | `cos(x)`                        |
| `cos(x)`   | `-sin(x)`                       |
| `tan(x)`   | `sec²(x)` 或 `1 + tan²(x)`      |
| `exp(x)`   | `exp(x)`                        |
| `log(x)`   | `1/x`                           |
| `asin(x)`  | `1/sqrt(1-x²)`                  |
| `Abs(x)`   | `sign(x)`                       |

### 隐式求导与有限差分

- `sympy.geometry.util.idiff(eq, y, x)`：隐式微分
- `differentiate_finite()`、`as_finite_difference()`：在无解析导数时用有限差分近似

## 积分规则

### 主 API

- 不定积分：`integrate(f, x)` → ∫f dx
- 定积分：`integrate(f, (x, a, b))` → ∫ₐᵇ f dx
- 多重积分：传入多个 `(变量, 下界, 上界)` 元组

### 积分策略

SymPy 使用多种策略组合：

- **heurisch**：基于 Risch-Norman 启发式的积分算法，通用性强
- **manualintegrate**：规则驱动的分步积分，便于教学或逐步推导
- **meijerg**：利用 Meijer G 函数（广义超几何函数的推广）处理特殊函数积分
- **Risch**：Risch 算法（判定初等函数不定积分是否存在的形式化方法，部分实现），用于初等函数积分

通过 `sympy_rubi` 扩展还可使用 Rubi（Rule-based Integration，基于规则的积分）规则式积分，可提供更细粒度的分步结果。

无法得到闭式解时，会返回未求值的 `Integral` 对象，可配合 `evalf()`（evaluate to float，数值求值）做数值积分。

### 常用积分示例

| 被积函数    | 积分                |
| ----------- | ------------------- |
| `1`         | `x + C`             |
| `xⁿ` (n≠-1) | `x^(n+1)/(n+1) + C` |
| `1/x`       | `log(x) + C`        |
| `exp(x)`    | `exp(x) + C`        |
| `sin(x)`    | `-cos(x) + C`       |
| `cos(x)`    | `sin(x) + C`        |
| `1/(1+x²)`  | `atan(x) + C`       |

多项式与 `exp`、`sin`、`cos` 的乘积也可积分；部分积分会得到含误差函数 `erf`、菲涅尔积分（Fresnel）等非初等结果。

### 积分变换

| 变换        | 函数                                              |
| ----------- | ------------------------------------------------- |
| Mellin      | `mellin_transform` / `inverse_mellin_transform`   |
| Laplace     | `laplace_transform` / `inverse_laplace_transform` |
| Fourier     | `fourier_transform` / `inverse_fourier_transform` |
| 正弦 / 余弦 | `sine_transform` / `cosine_transform` 及逆变换    |
| Hankel      | `hankel_transform` / `inverse_hankel_transform`   |

Laplace 变换还提供 `laplace_correspondence`、`laplace_initial_conds` 等辅助函数，便于求解微分方程。

## 化简规则

### 通用化简

`simplify(expr)` 综合多种策略，无保证输出形式。参数包括：

- `ratio`：默认 1.7，若 `(结果长度)/(输入长度) > ratio` 则返回原式
- `measure`：自定义复杂度函数，默认 `count_ops`（统计运算数量的函数）
- `rational`、`inverse`：控制有理数转换与逆函数化简

建议在明确需求时优先使用专项化简函数，以获得可预期的结果。

### 多项式与有理式

| 函数               | 作用              |
| ------------------ | ----------------- |
| `expand()`         | 展开多项式与乘积  |
| `factor()`         | 有理系数因式分解  |
| `collect(expr, x)` | 按 `x` 合并同类项 |
| `cancel()`         | 化为 p/q 并约分   |
| `apart()`          | 部分分式分解      |
| `together()`       | 合并为单分式      |

### 三角函数与幂

| 函数                  | 作用                                |
| --------------------- | ----------------------------------- |
| `trigsimp()`          | 三角恒等式化简                      |
| `expand_trig()`       | 展开 `sin(x+y)`、倍角公式等         |
| `powsimp()`           | x^a·x^b → x^(a+b)，x^a·y^a → (xy)^a |
| `expand_power_exp()`  | x^(a+b) → x^a·x^b                   |
| `expand_power_base()` | (xy)^a → x^a·y^a                    |
| `powdenest()`         | (x^a)^b → x^(ab)                    |

### 对数与根式

| 函数              | 作用                                        |
| ----------------- | ------------------------------------------- |
| `expand_log()`    | log(xy) → log(x)+log(y)，log(xⁿ) → n·log(x) |
| `logcombine()`    | 逆操作：log(x)+log(y) → log(xy)             |
| `radsimp()`       | 分母有理化、去根号                          |
| `collect_sqrt()`  | 合并含 √ 的项                               |
| `collect_const()` | 合并常数系数                                |
| `rcollect()`      | 递归收集和式                                |

### 其它专用化简

`separatevars()`、`nsimplify()`、`combsimp()`、`gammasimp()`、`besselsimp()`、`kroneckersimp()`、`hyperexpand()`、`posify()` 等用于特定类型的化简。基于假设时可使用 `refine(expr, assumptions)` 和 `ask()`。

## 级数展开与极限

- 级数：`expr.series(x, x0, n)`，默认 `x0=0`、`n=6`，返回带 `O(x^n)` 的展开式
- 去除阶项：`.removeO()`
- 极限：`limit(f, x, x0)`，支持 `'+'`、`'-'` 单侧极限
- 未求值形式：`Limit(...).doit()`

## 方程求解与矩阵

- **代数方程**：`solve(eq, x)` 求解线性、二次及部分高阶方程
- **微分方程**：`dsolve`（differential equation solve）求常微分方程（Ordinary Differential Equation, ODE）符号解
- **矩阵**：`Matrix` 支持行列式、逆、特征值、LU 分解（Lower-Upper 分解）等
- **LaTeX 输出**：`latex(expr)` 生成 LaTeX 代码，便于文档与论文排版

## 数值计算

- `expr.evalf()`（evaluate to float）：符号表达式数值求值
- `integral.evalf(50)`：可指定精度
- 依赖 `mpmath`（多精度浮点运算库）实现高精度计算

## 类符号计算系统的机制对比

### 表达式表示

SymPy 将表达式抽象为不可变 `Basic` 树结构，子类（`Add`、`Mul`、`Pow` 等）通过 `.args` 和 `.func` 实现结构化遍历。同类系统在表示层有多种取舍：AST 指抽象语法树（Abstract Syntax Tree）；DAG 指有向无环图（Directed Acyclic Graph）；Hash-consed 指哈希一致化（hash consing），一种结构共享技术；GMP 指 GNU 多精度算术库；i64 指 64 位有符号整数。

| 系统           | 表达式结构      | 特点                                       |
| -------------- | --------------- | ------------------------------------------ |
| **SymPy**      | 不可变 AST      | `Basic` 基类，`func(*args)` 结构共享       |
| **Symbolica**  | 内部 DAG        | 侧重性能，有理算术基于 GMP                 |
| **Symmetrica** | Hash-consed DAG | 结构共享、确定性排序、无浮点（i64 有理数） |
| **rusymbols**  | 极简 AST        | 100% Rust、易扩展，适合研究实现            |

### 规则与策略

求导、积分、化简均依赖规则应用。SymPy 的 `_eval_derivative`、`fdiff` 实现链式法则；积分组合 heurisch、manualintegrate、meijerg 等策略。对比：

- **Symbolica**：模式匹配（`replace_all`）驱动重写，级数展开、Gröbner 基（格罗布纳基，用于多项式理想计算的代数工具）等
- **MathCore**：类 SymPy 的规则式微积分，字符串解析 + 符号计算
- **Symmetrica**：模块化 `calculus`、`polys`、`solver`，规则与内核分离

### 化简机制

SymPy 的 `simplify()` 无保证输出形式，依赖 `ratio`、`measure` 等启发式；专项函数（`trigsimp`、`powsimp`、`logcombine` 等）提供可预期变换。Symbolica 通过模式匹配做重写；Symmetrica 的 `simplify` 与 `Store` 配合，在 hash-consed（哈希一致化）结构上做等价化简。

## 参考文献

**SymPy 文档**：

- [SymPy 官方站点](https://www.sympy.org)
- [核心模块](https://docs.sympy.org/latest/modules/core.html)
- [初等与特殊函数](https://docs.sympy.org/latest/modules/functions/index.html)
- [化简模块](https://docs.sympy.org/latest/modules/simplify/simplify.html)
- [积分模块](https://docs.sympy.org/latest/modules/integrals/integrals.html)
- [微积分教程](https://docs.sympy.org/latest/tutorials/intro-tutorial/calculus.html)
- [化简教程](https://docs.sympy.org/latest/tutorials/intro-tutorial/simplification.html)

**Rust 生态**：

- [Symbolica](https://symbolica.io) / [GitHub](https://github.com/symbolica-dev/symbolica)
- [MathCore](https://github.com/Nonanti/mathcore)
- [cas-rs](https://github.com/ElectrifyPro/cas-rs)
- [Symmetrica](https://github.com/Sir-Teo/Symmetrica)
- [rusymbols](https://github.com/simensgreen/rusymbols)
