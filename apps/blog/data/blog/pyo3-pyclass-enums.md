---
title: "在 PyO3 里优雅地使用 `#[pyclass]` enum"
description: "梳理 PyO3 中 `#[pyclass]` enum 的两种形态（简单枚举与复杂枚举）、在 Python 侧的行为，以及官方文档中特别提醒的 `Py::new` / `.into_pyobject()` 行为差异坑。"
pubDatetime: 2026-02-05
tags: ["Rust", "Python", "PyO3"]
---

如果你在用 PyO3 写 Python 拓展，很快就会遇到这样的问题：

- 想把一个 Rust 枚举暴露给 Python；
- 想在 Python 里写出 `isinstance(x, Node.Constant)` 这种优雅的类型检查；
- 想调试时一眼看出「这是哪个 variant」。

PyO3 文档把这块集中讲在 “Python classes” 章节的 [`#[pyclass]` enums](https://pyo3.rs/main/class.html#pyclass-enums) 一节。功能很强，但也埋了几个坑，最典型的就是：

> 对 `#[pyclass]` enum 用 `Py::new(py, MyEnum::Variant { .. })`，和用 `.into_pyobject(py)`，在 Python 侧的行为**不一样**。

本文基于这节文档和一个真实踩坑例子，系统梳理：

- `#[pyclass]` enum 的两种形态：简单枚举 vs 复杂枚举；
- complex enum 在 Python 侧的继承、`isinstance`、模式匹配语义；
- `Py::new` / `.into_pyobject()` 的行为差异以及正确用法。

## 两种 `#[pyclass]` enum：简单枚举 vs 复杂枚举

PyO3 对枚举的支持分两类：

- **简单枚举（simple enums）**：只有 unit variant 的 C-like enum；
- **复杂枚举（complex enums）**：包含 struct / tuple variant 的枚举。

这两类在 Python 里的行为完全不同，如果没意识到，很容易写出“看起来能跑，但行为微妙不对”的代码。

### 简单枚举：更像 Python 的 `enum.Enum`

先看一个文档里的典型例子：

```rust
use pyo3::prelude::*;

#[pyclass(eq, eq_int)]
#[derive(PartialEq)]
enum MyEnum {
    Variant,
    OtherVariant = 10,
}
```

这里发生了几件事：

- `MyEnum` 变成一个 Python 类；
- 每个 variant 变成一个 **类属性**：`MyEnum.Variant`、`MyEnum.OtherVariant`；
- PyO3 自动实现了：
  - `__eq__`（基于 `PartialEq`）；
  - `__int__`（枚举到整数）；
  - `__repr__`（如 `"MyEnum.Variant"`）。

Python 端体验很接近原生 `enum.Enum`：

```python
>>> from mymodule import MyEnum
>>> MyEnum.Variant == MyEnum.Variant
True
>>> MyEnum.OtherVariant == MyEnum.Variant
False
>>> int(MyEnum.OtherVariant)
10
>>> repr(MyEnum.Variant)
'MyEnum.Variant'
```

**限制**：

- 不能作为基类，也不能继承其他类；
- 目前不能直接和 Python 的 `IntEnum` 互操作。

如果你只需要一组离散标签或状态，简单枚举已经够用了。

### 复杂枚举：结构化数据 + 模式匹配

一旦枚举带上字段，就进入文档所谓的「complex enums」世界，比如：

```rust
use pyo3::prelude::*;

#[pyclass]
enum Shape {
    Circle { radius: f64 },
    Rectangle { width: f64, height: f64 },
    RegularPolygon(u32, f64),
    Nothing(),
}
```

PyO3 会把它映射成一个「基类 + 多个子类」的结构：

- 生成一个顶层 Python 类 `Shape`；
- 为每个 variant 生成一个 **子类**：
  - `Shape.Circle`
  - `Shape.Rectangle`
  - `Shape.RegularPolygon`
  - `Shape.Nothing`
- 每个 variant 的字段映射为属性或下标访问：
  - struct variant：`circle.radius`、`rect.width`、`rect.height`；
  - tuple variant：`square[0]`、`square[1]`（字段名 `_0`、`_1`、…）。

在 Python 3.10+ 中，还可以直接配合 `match` 使用（示例改写自文档）：

```python
def count_vertices(cls, shape):
    match shape:
        case cls.Circle():
            return 0
        case cls.Rectangle():
            return 4
        case cls.RegularPolygon(n):
            return n
        case cls.Nothing():
            return 0

cls = Shape
circle = Shape.Circle(radius=10.0)
square = Shape.RegularPolygon(4, 10.0)

assert isinstance(circle, cls)
assert isinstance(circle, cls.Circle)
assert count_vertices(cls, circle) == 0
assert count_vertices(cls, square) == 4
```

从 Python 视角看：

- `Shape` 是基类；
- 每个 variant 是 `Shape` 的子类；
- 具体实例同时满足 `isinstance(x, Shape)` 和 `isinstance(x, Shape.Circle)`。

这正是我们想要的「既有 sum type，又有子类型结构」的效果，非常适合表达 AST、计算图节点、错误类型树等。

## 为每个 variant 定制构造器：`#[pyo3(constructor = (...))]`

对 complex enum，PyO3 会自动为每个 variant 生成一个 Python 构造器：

```python
Shape.Circle(...)
Shape.Rectangle(...)
Shape.RegularPolygon(...)
```

但有时你会希望：

- 提供默认参数；
- 强制关键字参数；
- 在签名上更友好地暴露出来，而不是死板等于 Rust 字段顺序。

这时可以在 **variant 上** 写 `#[pyo3(constructor = (...))]`，语法与函数/方法的 `#[pyo3(signature = (...))]` 一致。例如：

```rust
use pyo3::prelude::*;

#[pyclass]
enum Shape {
    #[pyo3(constructor = (radius=1.0))]
    Circle { radius: f64 },

    #[pyo3(constructor = (*, width, height))]
    Rectangle { width: f64, height: f64 },

    #[pyo3(constructor = (side_count, radius=1.0))]
    RegularPolygon { side_count: u32, radius: f64 },

    Nothing(),
}
```

对应的 Python 用法就变成：

```python
>>> circle = Shape.Circle()
>>> circle.radius
1.0

>>> square = Shape.Rectangle(width=1, height=1)
>>> square.width, square.height
(1, 1)

>>> hexagon = Shape.RegularPolygon(6)
>>> hexagon.side_count, hexagon.radius
(6, 1.0)
```

你可以把每个 variant 想象成「有自己构造签名的子类」，只是声明点写回了 Rust 上。

## 文档里的大坑：`Py::new` vs `.into_pyobject()` 行为不一致

官方文档在 complex enum 那一节专门加了一个 Warning，大意是：

> 对 `#[pyclass]` enum，`Py::new(py, MyEnum::Variant { .. })` 和 `.into_pyobject(py)` 的行为不一样。
> 用 `Py::new` 得到的只是「基类实例」，不是 variant 子类；
> 想得到「正确」的 Python 对象，需要用 `.into_pyobject(py)`。

这在你写 Rust 端工厂方法时，很容易正好踩中。

### 真实踩坑场景：`repr` / `isinstance` 不对劲

假设你有一个 complex enum 表示计算图节点：

```rust
#[pyclass]
enum Node {
    Constant { value: Py<PyAny>, dtype: DataType },
    // 其他 variant 省略
}
```

你希望在 Python 里有两种用法：

- 使用 PyO3 自动生成的 variant 构造器：`Node.Constant(...)`；
- 使用你自己写的静态工厂：`Node.constant(...)`。

于是你很自然地写了一个静态方法：

```rust
use pyo3::prelude::*;

#[pymethods]
impl Node {
    #[staticmethod]
    fn constant(py: Python<'_>, value: Py<PyAny>, dtype: DataType) -> PyResult<Py<Self>> {
        let node = Node::Constant { value, dtype };
        Py::new(py, node)
    }
}
```

看起来没问题，但在 Python 里一比较就露馅了：

```python
x = Node.constant(value, dtype)   # Rust 写的静态方法
y = Node.Constant(value, dtype)   # PyO3 自动生成的 variant 构造器

repr(x)  # <boning.core._core.Node object at ...>
repr(y)  # <boning.core._core.Node_Constant object at ...>

isinstance(x, Node)          # True
isinstance(x, Node.Constant) # False  ← 出乎预期

isinstance(y, Node)          # True
isinstance(y, Node.Constant) # True   ← 符合预期
```

原因很简单：

- `Py::new(py, node)` 走的是「把整个 enum 当作一个普通 `#[pyclass]` struct 来包装」的路径；
- 而 Python 侧的 `Node.Constant(...)` 会经过 PyO3 为 complex enum 自动生成的「variant 子类构造」逻辑。

结果就是：你以为在 Rust 里“模拟了” `Node.Constant(...)`，其实只是构造了裸 `Node`，导致：

- `repr` 看起来不对；
- `isinstance(x, Node.Constant)` 不工作；
- 花式 `match` / 模式匹配也不如预期。

### 正确姿势：在 Rust 端“模拟” `Node.Constant(...)`

要让 Rust 侧的静态方法行为和 `Node.Constant(...)` 完全一致，只需要改一行：

- 不要用 `Py::new`；
- 改用 `.into_pyobject(py)`。

也就是把上面的实现改成：

```rust
use pyo3::prelude::*; // 确保引入 IntoPyObject trait

#[pymethods]
impl Node {
    #[staticmethod]
    fn constant(py: Python<'_>, value: Py<PyAny>, dtype: DataType) -> PyResult<Py<Self>> {
        // 关键：用 into_pyobject，而不是 Py::new
        let obj = Node::Constant { value, dtype }.into_pyobject(py)?;
        Ok(obj.unbind())  // Bound<'py, Node> -> Py<Node>
    }
}
```

或者你也可以直接返回 `Bound<'_, Self>`：

```rust
#[pymethods]
impl Node {
    #[staticmethod]
    fn constant(py: Python<'_>, value: Py<PyAny>, dtype: DataType) -> PyResult<Bound<'_, Self>> {
        Node::Constant { value, dtype }.into_pyobject(py)
    }
}
```

此时，在 Python 里比较这两个构造路径：

```python
x = Node.constant(value, dtype)
y = Node.Constant(value, dtype)

repr(x) == repr(y)                # 都是 <...Node_Constant object at ...>
isinstance(x, Node.Constant)      # True
isinstance(y, Node.Constant)      # True
```

你就真正得到了「Rust 工厂方法完全模拟 Python variant 构造器」的效果。

可以把这条经验总结成一句话：

> **对于 `#[pyclass]` enum，尤其是 complex enum，如果你在 Rust 里手写工厂方法，希望行为等价于 Python 侧的 variant 构造（`MyEnum.Variant(...)`），就用 `.into_pyobject(py)`，而不要用 `Py::new(py, ...)`。**

## 什么时候该用 `#[pyclass]` enum？

最后用一个小 checklist，总结何时适合上 `#[pyclass]` enum，以及该注意什么。

- **简单枚举适用场景**：
  - 只需要一组离散标签或状态；
  - 需要整数值、比较、`repr` 好看；
  - 不需要继承或复杂结构。

- **复杂枚举适用场景**：
  - 想表达 AST、计算图节点、错误类型树等 sum type；
  - 每个 variant 携带不同字段；
  - 希望在 Python 里用 `isinstance` 和 `match` 做模式匹配。

- **complex enum 的实践要点**：
  - 在顶层 `enum` 上加 `#[pyclass]`；
  - 每个 variant 按需加 `#[pyo3(constructor = (...))]` 定制构造器签名；
  - 在 Rust 侧实现工厂方法时，优先用 `.into_pyobject(py)`，避免 `Py::new` 带来的基类实例问题。

理解了这些，`#[pyclass]` enum 就不再是 PyO3 文档里一个“略显黑盒”的章节，而是一个可以放心用在实际项目里的建模工具：既保留了 Rust 枚举的表达力，又在 Python 侧给了你清晰的类结构和良好的调试体验。
