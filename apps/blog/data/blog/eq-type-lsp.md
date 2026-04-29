---
title: "__eq__ 的返回类型与里氏替换原则"
author: "zrr1999"
description: "讨论 object.__eq__ 返回 bool 与里氏替换原则的冲突、返回非 bool 的特定情形（如 NumPy、array-api 规范下的数组），以及 typeshed 与各社区的实践取舍"
pubDatetime: 2026-01-24
modDatetime: 2026-01-24
tags: ["Python", "类型系统", "里氏替换原则", "array-api", "NumPy", "typeshed"]
---

在 Python 的静态类型生态里，`object.__eq__` 被 typeshed 和 CPython 文档标成 `-> bool`。不涉及数组库时，这通常没问题；但在**特定情况下**会暴露矛盾：一旦涉及 NumPy 或符合 [array-api 规范](https://data-apis.org/array-api/latest/API_specification/generated/array_api.array.__eq__.html) 的数组类型，`__eq__` 实际返回的是**布尔数组**。若按**里氏替换原则**（LSP）严格理解，子类返回 `ndarray[bool]` 就是在违背基类契约；若把 `object.__eq__` 视为 `-> Any`，类型系统对 `==` 的推理能力又会大大削弱。

本文结合 [Discuss 上关于 `__eq__` 类型放宽的讨论](https://discuss.python.org/t/make-type-hints-for-eq-of-primitives-less-strict/34240/10)、[typeshed #8217](https://github.com/python/typeshed/issues/8217) 与 [#3685](https://github.com/python/typeshed/issues/3685)、[NumPy #17368](https://github.com/numpy/numpy/issues/17368) / [#17778](https://github.com/numpy/numpy/pull/17778) 以及 [array-api #229](https://github.com/data-apis/array-api/issues/229) 的讨论，梳理 `__eq__` 返回类型与里氏替换原则的冲突从何而来、为何难解，以及各方的取舍。

## CPython 的 equality 运行时机制

`==` 在 CPython 里的行为可以概括为：

1. 先调**左操作数**的 `__eq__(self, other)`；
2. 若不存在或返回 `NotImplemented`，再调**右操作数**的 `__eq__(other, self)`；
3. 若仍不存在或返回 `NotImplemented`，则退化成**对象同一性比较**（`id(a) == id(b)`）。

因此，`object` 在运行时**并没有**一个「永远返回 `bool`」的 `__eq__` 实现；文档里建议自定义类让 `__eq__` 返回 `bool` 或 `NotImplemented`，但语言本身并不强制。一旦某个类（比如 NumPy 的 `ndarray`）让 `__eq__` 返回数组，`a == b` 在运行时的类型就可以是 `ndarray`，而不是 `bool`。

换句话说：**运行时的 equality 协议是「可扩展、可覆盖」的，类型系统若想同时兼顾里氏替换原则、文档约定和返回非 bool 的这类特例，就会撞墙。**

## typeshed 与里氏替换原则：`object.__eq__ -> bool` 的含义

在 [typeshed](https://github.com/python/typeshed) 和 stdlib 的 `builtins.pyi` 里，`object` 和常见内建类型被标成：

```text
def __eq__(self, __x: object) -> bool: ...
```

若按里氏替换原则理解：

- 子类重写 `__eq__` 时，**返回类型应当是 `bool` 的子类型**（在常见类型系统里就等于 `bool`）；
- 因此，任何声明 `__eq__ -> ndarray[bool]` 或 `-> Array` 的类，在类型论意义上都是在**违背里氏替换原则**。

[typeshed #8217](https://github.com/python/typeshed/issues/8217) 里举了一个很好的例子：自定义 `Matrix` 的 `__eq__` 返回 `Matrix[bool]`。当写 `float == matrix` 时：

- **静态上**：`float.__eq__(self, __x: object) -> bool` 的 `object` 可以接受 `Matrix`，类型检查器推断 `float == matrix` 为 `bool`；
- **运行时**：`float.__eq__` 对 `Matrix` 返回 `NotImplemented`，解释器会去调 `Matrix.__eq__(float)`，得到 `Matrix[bool]`。

于是出现了**静态类型与运行时类型不一致**，根源正是：primitives 的 stub 把 `__eq__` 标成「接受任意 `object`、返回 `bool`」，而实际对「无法处理」的类型会返回 `NotImplemented`，把皮球踢给右边。

在 [typeshed #3685](https://github.com/python/typeshed/issues/3685) 中曾有人提议：将 `object.__eq__`（以及其他比较方法）的返回类型改为 `Any`，这样「子类可把返回类型重写为任意类型」，并指出「`__eq__` 不返回 bool 非常常见，尤其是 NumPy 数组的逐元素比较」。该提议未获采纳，typeshed 仍维持 `-> bool`。

Discuss 上则有人提议：让 `object.__eq__` 标成 `-> NotImplemented`，并为 `float`、`complex` 等写更窄的签名（例如 `float.__eq__(self, other: int | float) -> bool`），以更忠实于 CPython 的 `float_richcompare` 等实现。这样做的代价是：几乎所有重写 `__eq__` 的类都会和 `object` 的签名「不兼容」，需要 `# type: ignore`，等于把矛盾转嫁到用户代码。typeshed 维护者最终没有采纳，**继续沿用 `-> bool`**，相当于在类型层面做了一次「善意谎言」：假设绝大多数 `__eq__` 都会返回 `bool`。

## 返回非 bool 的 `__eq__`：NumPy 与 array-api 规范

文档和 typeshed 的「`__eq__` 返回 `bool`」并非 runtime 唯一现实。典型例子是 NumPy 与 [array-api 规范](https://data-apis.org/array-api/latest/API_specification/generated/array_api.array.__eq__.html)（array-api 是规范，NumPy 等库是实现方）。规范中定义：

```text
array.__eq__(other: int|float|complex|bool|array, /) -> array
```

返回的是**元素级布尔结果的数组**（dtype 为 `bool`），而不是标量 `bool`，以便支持向量化、加速器库和与 `equal()` 等函数的语义对齐。NumPy 的 `ndarray` 以及遵守 array-api 规范的实现都遵循这一点：`arr == 3` 的类型是 `ndarray[bool]`，不是 `bool`。因此，**在类型层面**，这些类的 `__eq__` 若写清楚，就应当是 `-> Self` 或 `-> NDArray[bool]` 一类的数组类型，与 `object.__eq__ -> bool` 在里氏替换原则下直接冲突。

## 两种应对方式：不标 vs `# type: ignore[override]`

在 [NumPy #17368](https://github.com/numpy/numpy/issues/17368) 中，社区把 `ndarray` / `generic` 的类型标注拆成多步。**早期的** [PR #17778](https://github.com/numpy/numpy/pull/17778) 做比较运算的注解时，作者 [BvB93](https://github.com/numpy/numpy/pull/17778) 曾写明：

> The equivalency operators (**`__eq__`** and **`__ne__`**) were deliberately **excluded** as it is currently **impossible** to properly type them due to the existence of `object.__eq__`.

也就是说：`__eq__`、`__ne__` 一旦标成 `-> ndarray[bool]`，就会和 `object.__eq__ -> bool` 形成 override 不兼容，类型检查器会报错；当时 NumPy 选择了**不标**。**此后**类型 stubs 持续演进，NumPy 现已对 `__eq__` / `__ne__` 提供标注，通常需配合 `# type: ignore[override]` 等方式以绕过与 `object` 的 override 冲突，思路与 array-api #229 一致。

[array-api #229](https://github.com/data-apis/array-api/issues/229) 在讨论可 vendoring 的数组 Protocol 时，对 `__eq__` 和 `__ne__` **显式写出**了 `other: Union[bool, int, float, A]` 与 `-> A`，并在两处都加上 `# type: ignore[override]`，注释理由为：`object.__eq__` 接受任意 `object`、返回 `bool`，而 Protocol 需要收紧参数类型并让返回类型为数组 `A`，因此必须 override 且只能用 `type: ignore` 压制与基类签名的冲突。这可以视为在类型上如实刻画数组的 `__eq__`，同时承认对里氏替换原则的违背。

## 三种类型标注的取舍

可以把 `object.__eq__` 的标注粗分为三种路线：

| 路线                  | 做法                                                    | 对里氏替换原则                       | 对 `==` 的静态推理                     | 对返回非 bool 的子类                          |
| --------------------- | ------------------------------------------------------- | ------------------------------------ | -------------------------------------- | --------------------------------------------- |
| **A. 保持 `-> bool`** | 维持 typeshed 现状                                      | 与数组等冲突，形式上违背里氏替换原则 | 最好：`x == y` 可视为 `bool`           | 只能不标或 `# type: ignore`                   |
| **B. 改为 `-> Any`**  | 基类返回 `Any`                                          | 子类可返回任意类型，override 合法    | 很差：`x == y` 失去具体类型            | 可标 `-> NDArray[bool]` 等                    |
| **C. 特例化**         | `object` 仍 `-> bool`，子类单独标并接受违背里氏替换原则 | 对子类显式违背里氏替换原则           | 在已知类型上较好；`object` 上仍 `bool` | 需 `# type: ignore[override]` 或 checker 特判 |

- **A**：typeshed 和大多数类型检查器目前的实际选择；最大化「普通代码里 `==` 为 `bool`」的假设，代价是返回数组的 `__eq__` 无法诚实地标出来（早年 NumPy 的不标、以及现今 NumPy、array-api #229 的 `# type: ignore[override]` 都落在此格局下）。
- **B**：理论上最「老实」——既然有的子类真的会返回非 bool，把基类标成 `Any` 可以避免 override 错误；但 `Any` 会传染，`obj == x` 整体变成 `Any`，条件分支、重载解析都会变差，工程上牺牲太大。
- **C**：array-api #229 的 Protocol 即为一例：在类型上写出数组的 `__eq__` 签名，用 `# type: ignore[override]` 显式接受对里氏替换原则的违背。

## `object.__eq__ -> Any` 的问题

若采用 B，把 `object.__eq__` 视为 `-> Any`：

1. **丧失对 `==` 的静态约束**
   对类型为 `object` 的变量，`x == y` 只能是 `Any`，无法在 `if x == y:` 等分支中利用「结果为 bool」做窄化或优化。

2. **掩盖错误的 `__eq__` 实现**
   当前 `-> bool` 至少能在子类写出 `-> int`、`-> list` 时给出不兼容提示；改成 `-> Any` 后，任何返回类型都「合法」，类型检查器无法再帮你抓这类错误。

3. **与文档和教学不一致**
   官方教程和 PEP 都鼓励 `__eq__` 返回 `bool` 或 `NotImplemented`；类型系统若退到 `Any`，就相当于承认「我们放弃用类型表达这份契约」，对新手和规范遵守者都不友好。

4. **不解决 primitives 的 `NotImplemented` 建模问题**
   [Discuss 的讨论](https://discuss.python.org/t/make-type-hints-for-eq-of-primitives-less-strict/34240/10) 更关注的是：`float.__eq__(str)` 等会在运行时返回 `NotImplemented`，若把 `other` 标成 `object`，就无法在类型上区分「会返回 bool」和「会返回 NotImplemented」的情况。把 `object.__eq__` 改成 `Any` 对 primitives 的精确建模没有帮助，只是把不精确往上挪了一层。

## 结论

- **严格的里氏替换原则与 Python 的现实生态无法同时满足**：
  CPython 的 equality 协议允许 `__eq__` 返回非 bool，NumPy、符合 array-api 规范的数组类型等又正式把 `__eq__` 定义为返回数组，这与「`object.__eq__` 返回 `bool`」的抽象在类型论上直接冲突。

- **`object.__eq__ -> bool`**：
  是 typeshed 和主流类型检查器的**工程折中**：牺牲与返回数组之类型的里氏替换原则一致性、也牺牲对「primitives 何时返回 `NotImplemented`」的精确描述，以保留对绝大多数业务代码中 `==` 结果为 `bool` 的推理能力。

- **`object.__eq__ -> Any`**（如 typeshed #3685 所提议）：
  在 override 层面更宽松，理论上可让 NumPy、符合 array-api 规范的 `__eq__` 等合法地标成 `-> NDArray[bool]`，但会严重削弱对 `==` 的通用静态检查，并放大「错误 `__eq__` 实现」漏网的可能，**工程上得不偿失**，故未被采纳。

- **实践中的折中**：
  **早期** NumPy 在 [PR #17778](https://github.com/numpy/numpy/pull/17778) 中曾刻意不标注 `__eq__` / `__ne__`；**现在** NumPy 与 array-api [#229](https://github.com/data-apis/array-api/issues/229) 的 Protocol 一样，已对 `__eq__`/`__ne__` 显式写出数组签名并加上 `# type: ignore[override]`。二者都承认：在现有 `object.__eq__` 设计下，**无法既符合里氏替换原则又正确刻画返回非 bool 的 `__eq__`**，只能用 `type: ignore` 局部妥协。

长远来看，若希望返回数组的 `__eq__` 在类型系统中不被当成异类，要么需要类型系统对 `__eq__` 做**特殊重载规则**（例如对 `NDArray` 的 `==` 单独推断为 `NDArray[bool]`），要么需要在 PEP / typeshed 层面对「可返回非 bool 的 `__eq__`」给出显式例外说明，把「违背里氏替换原则」从隐式变成显式约定。在此之前，**`object.__eq__ -> bool` 加上「不标」或 `# type: ignore[override]`，是各方在当下最务实的妥协。**

## 参考资料

- [Make type hints for `__eq__` of primitives less strict — Python Discuss](https://discuss.python.org/t/make-type-hints-for-eq-of-primitives-less-strict/34240/10)
- [`__eq__`'s type hint for primitives accept `object` while in many cases it returns `NotImplemented` — typeshed #8217](https://github.com/python/typeshed/issues/8217)
- [object.\_\_eq\_\_ and other comparisons should have return type Any — typeshed #3685](https://github.com/python/typeshed/issues/3685)
- [ENH: Add annotations to `ndarray` and `generic` — NumPy #17368](https://github.com/numpy/numpy/issues/17368)
- [ENH: Add annotations for comparison operations — NumPy #17778](https://github.com/numpy/numpy/pull/17778)（早期曾排除 `__eq__`/`__ne__`，后 NumPy 已补上标注）
- [Protocol for array objects — array-api #229](https://github.com/data-apis/array-api/issues/229)
- [array.\_\_eq\_\_ — Array API Standard](https://data-apis.org/array-api/latest/API_specification/generated/array_api.array.__eq__.html)
