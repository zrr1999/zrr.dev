---
title: "Welford算法：在线计算均值和方差的优雅解决方案"
author: "zrr1999"
description: "Welford算法是一种在线计算均值和方差的数值稳定算法，本文从改进点、公式推导、具体实现三个方面详细介绍这一经典算法"
pubDatetime: 2025-10-24
tags: ["算法", "数值计算", "统计学"]
---

在数据处理和统计计算中，我们经常需要计算一组数据的均值和方差。对于静态数据集，这很简单；但对于流式数据或内存受限的场景，传统的两遍扫描方法就显得力不从心了。Welford算法正是为解决这一问题而生的优雅解决方案。

## 算法的改进点

### 传统方法的问题

传统计算方差的方法通常需要两遍扫描：

1. **第一遍**：计算均值 $\bar{x} = \frac{1}{n}\sum_{i=1}^{n}x_i$
2. **第二遍**：计算方差 $\sigma^2 = \frac{1}{n}\sum_{i=1}^{n}(x_i - \bar{x})^2$

这种方法存在以下问题：

- **内存需求**：需要存储所有数据点，对于大数据集不现实
- **数值稳定性**：当数据值很大而方差相对较小时，会出现严重的精度损失
- **实时性差**：无法处理流式数据，必须等待所有数据到达

### Welford算法的优势

Welford算法通过在线更新的方式，一次遍历就能同时计算均值和方差：

1. **单遍扫描**：只需要遍历数据一次
2. **常数空间**：只需要维护几个累积变量
3. **数值稳定**：避免了大数相减导致的精度损失
4. **实时更新**：支持流式数据处理
5. **易于并行化**：可以方便地合并多个部分结果

## 公式推导

### 基本思想

Welford算法的核心思想是维护以下三个量的递推关系：

- $n$：当前已处理的数据点数量
- $\mu_n$：前n个数据点的均值
- $M_n$：前n个数据点的平方和偏差

### 递推公式推导

设当前有n个数据点 $x_1, x_2, \ldots, x_n$，现在要加入第$(n+1)$个数据点 $x_{n+1}$。

**均值的更新**：

$$\mu_{n+1} = \frac{1}{n+1}\sum_{i=1}^{n+1}x_i = \frac{1}{n+1}(n\mu_n + x_{n+1}) = \mu_n + \frac{x_{n+1} - \mu_n}{n+1}$$

**平方和偏差的更新**：

定义 $M_n = \sum_{i=1}^{n}(x_i - \mu_n)^2$，我们需要推导 $M_{n+1}$ 的递推关系。

首先，注意到：
$$M_{n+1} = \sum_{i=1}^{n+1}(x_i - \mu_{n+1})^2$$

我们可以将其分解为：
$$M_{n+1} = \sum_{i=1}^{n}(x_i - \mu_{n+1})^2 + (x_{n+1} - \mu_{n+1})^2$$

对于前n项，我们有：
$$\sum_{i=1}^{n}(x_i - \mu_{n+1})^2 = \sum_{i=1}^{n}[(x_i - \mu_n) + (\mu_n - \mu_{n+1})]^2$$

展开并利用 $\sum_{i=1}^{n}(x_i - \mu_n) = 0$，可以得到：

$$\sum_{i=1}^{n}(x_i - \mu_{n+1})^2 = M_n + n(\mu_n - \mu_{n+1})^2$$

将 $\mu_n - \mu_{n+1} = -\frac{x_{n+1} - \mu_n}{n+1}$ 代入：

$$\sum_{i=1}^{n}(x_i - \mu_{n+1})^2 = M_n + n \cdot \frac{(x_{n+1} - \mu_n)^2}{(n+1)^2}$$

对于最后一项：
$$(x_{n+1} - \mu_{n+1})^2 = \left(x_{n+1} - \mu_n - \frac{x_{n+1} - \mu_n}{n+1}\right)^2 = \frac{n^2(x_{n+1} - \mu_n)^2}{(n+1)^2}$$

因此：
$$M_{n+1} = M_n + \frac{n(x_{n+1} - \mu_n)^2}{(n+1)^2} + \frac{n^2(x_{n+1} - \mu_n)^2}{(n+1)^2}$$

$$M_{n+1} = M_n + \frac{n(n+1)(x_{n+1} - \mu_n)^2}{(n+1)^2} = M_n + \frac{n(x_{n+1} - \mu_n)^2}{n+1}$$

更简洁的形式是：
$$M_{n+1} = M_n + (x_{n+1} - \mu_n)(x_{n+1} - \mu_{n+1})$$

**方差的计算**：

样本方差为：$s^2 = \frac{M_n}{n-1}$

总体方差为：$\sigma^2 = \frac{M_n}{n}$

## 具体实现

### Python实现

```python
from __future__ import annotations
import math


class WelfordCalculator:
    """Welford算法实现类，用于在线计算均值和方差"""

    def __init__(self):
        self.count = 0
        self.mean = 0.0
        self.m2 = 0.0  # 平方和偏差

    def update(self, value: float) -> None:
        """更新统计量"""
        self.count += 1
        delta = value - self.mean
        self.mean += delta / self.count
        delta2 = value - self.mean
        self.m2 += delta * delta2

    def get_mean(self) -> float | None:
        """获取当前均值"""
        return self.mean if self.count > 0 else None

    def get_variance(self, sample: bool = True) -> float:
        """获取方差

        Args:
            sample: True为样本方差(除以n-1)，False为总体方差(除以n)
        """
        if self.count < 2:
            return 0.0

        denominator = self.count - 1 if sample else self.count
        return self.m2 / denominator

    def get_std(self, sample: bool = True) -> float:
        """获取标准差"""
        variance = self.get_variance(sample)
        return math.sqrt(variance)

    def get_stats(self, sample: bool = True) -> tuple[float, float, float]:
        """获取完整统计信息：(均值, 方差, 标准差)"""
        mean = self.get_mean()
        if mean is None:
            raise ValueError("Mean is None")
        variance = self.get_variance(sample)
        std = self.get_std(sample)
        return mean, variance, std


# 使用示例
def example_usage():
    """使用示例"""
    calculator = WelfordCalculator()

    # 模拟流式数据
    data_stream = [1.0, 2.0, 3.0, 4.0, 5.0, 100.0, 2.0, 3.0]

    print("实时统计结果：")
    print("数据点\t均值\t\t方差\t\t标准差")
    print("-" * 50)

    for i, value in enumerate(data_stream, 1):
        calculator.update(value)
        mean, variance, std = calculator.get_stats()

        print(f"{value}\t{mean:.4f}\t\t{variance:.4f}\t\t{std:.4f}")

    # 验证结果
    import numpy as np

    mean_np = np.mean(data_stream)
    var_np = np.var(data_stream, ddof=1)  # 样本方差
    std_np = np.std(data_stream, ddof=1)  # 样本标准差

    print("\nNumPy验证结果：")
    print(f"均值: {mean_np:.6f} vs Welford: {calculator.get_mean():.6f}")
    print(f"方差: {var_np:.6f} vs Welford: {calculator.get_variance():.6f}")
    print(f"标准差: {std_np:.6f} vs Welford: {calculator.get_std():.6f}")


if __name__ == "__main__":
    example_usage()
```

### 并行化实现

Welford算法还支持并行计算，可以合并多个部分结果：

```python
def combine_welford_stats(stats1: tuple[int, float, float],
                         stats2: tuple[int, float, float]) -> tuple[int, float, float]:
    """合并两个Welford统计结果

    Args:
        stats1, stats2: (count, mean, m2) 元组

    Returns:
        合并后的 (count, mean, m2) 元组
    """
    count1, mean1, m2_1 = stats1
    count2, mean2, m2_2 = stats2

    if count1 == 0:
        return stats2
    if count2 == 0:
        return stats1

    # 合并计算
    count = count1 + count2
    delta = mean2 - mean1
    mean = (count1 * mean1 + count2 * mean2) / count
    m2 = m2_1 + m2_2 + delta * delta * count1 * count2 / count

    return count, mean, m2

# 并行计算示例
def parallel_welford_example():
    """并行Welford算法示例"""
    import concurrent.futures
    import numpy as np

    # 生成大量数据
    data = np.random.normal(50, 10, 10000)

    # 分割数据
    chunk_size = len(data) // 4
    chunks = [data[i:i+chunk_size] for i in range(0, len(data), chunk_size)]

    def process_chunk(chunk):
        """处理数据块"""
        calc = WelfordCalculator()
        for value in chunk:
            calc.update(value)
        return calc.count, calc.mean, calc.m2

    # 并行处理
    with concurrent.futures.ThreadPoolExecutor() as executor:
        results = list(executor.map(process_chunk, chunks))

    # 合并结果
    final_stats = results[0]
    for stats in results[1:]:
        final_stats = combine_welford_stats(final_stats, stats)

    count, mean, m2 = final_stats
    variance = m2 / (count - 1)

    print(f"并行Welford结果：均值={mean:.6f}, 方差={variance:.6f}")
    print(f"NumPy验证：均值={np.mean(data):.6f}, 方差={np.var(data, ddof=1):.6f}")
```

## 应用场景

Welford算法在以下场景中特别有用：

1. **流式数据处理**：实时监控系统、传感器数据分析
2. **大数据统计**：内存受限环境下的统计计算
3. **机器学习**：特征标准化、批标准化层
4. **金融分析**：实时风险计算、波动率估计
5. **科学计算**：数值模拟中的统计分析

## 总结

Welford算法是一个看似简单但极其实用的算法，它巧妙地解决了在线统计计算中的数值稳定性和内存效率问题。通过递推的方式，它将原本需要两遍扫描的问题转化为单遍扫描，同时保持了良好的数值精度。

这个算法的美妙之处在于其数学推导的优雅性和实现的简洁性。无论是在学术研究还是工程实践中，Welford算法都是处理流式统计计算的首选方案。

对于需要实时统计分析的应用，掌握Welford算法无疑会让你的工具箱更加完备。
