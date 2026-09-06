---
title: "NumPy 随机数生成机制调研"
description: "梳理 NumPy 1.17 以来的随机数架构：BitGenerator + Generator、各 BitGenerator 算法简介、SeedSequence 与并行流、Legacy RandomState，以及性能与选型建议。"
pubDatetime: 2026-02-02
modDatetime: 2026-02-02
tags: ["Python", "NumPy", "随机数", "PRNG"]
---

NumPy 的 `numpy.random` 模块提供伪随机数生成（PRNG）及多种概率分布采样。自 1.17.0 起引入「BitGenerator + Generator」分层设计，默认使用 PCG64，并保留基于 Mersenne Twister 的 Legacy 接口。本文梳理整体架构、各 BitGenerator 算法要点、种子与并行流、新旧 API 及选型建议。

注意：本模块面向统计与模拟，**不适用于安全或密码学**；该类需求应使用标准库 `secrets`。

## 整体架构：BitGenerator 与 Generator

用户主要与 `Generator` 实例交互。每个 `Generator` 持有一个 `BitGenerator`，负责核心算法：维护状态并输出随机比特（double、uint32、uint64）。`Generator` 则把这些比特转换成各种分布的样本（正态、指数、伽马等）。这种拆分便于更换底层算法而少改上层代码。

推荐创建方式：`rng = np.random.default_rng()`。无参时从操作系统获取不可预测熵；传整数或整数序列可复现。同一种子保证同一整数流。

```python
import numpy as np
rng = np.random.default_rng(42)
rng.random()              # [0, 1) 均匀
rng.standard_normal(5)   # 标准正态
rng.integers(0, 10, size=5)  # [0, 10) 整数
```

## 随机数算法简介

NumPy 内置多种 BitGenerator，底层算法不同：有的为顺序型（状态递推），有的为计数器型（counter + key 直接算第 n 个数，适合并行）。下面简要介绍各算法。

### PCG64（默认）

**PCG64** 是 O'Neill 提出的置换同余生成器（Permuted Congruential Generator）的 128 位实现，NumPy 使用的具体变体为 **PCG XSL RR 128/64**。

- **状态**：两个 128 位无符号整数。一个为当前状态，由线性同余递推（LCG）推进：`state = (state * mult + inc) mod 2^128`；另一个为固定奇数增量 `inc`，由种子经 SeedSequence 派生。
- **输出**：对 128 位状态做「XSL-RR」输出变换得到 64 位输出，既掩盖 LCG 低位的弱相关性，又保持速度。
- **周期**：$2^{128}$。支持任意步进（`advance`）和约 $2^{127}$ 个独立流（不同 `inc` 对应不同轨道）。
- **特点**：统计质量与速度兼顾，单流或中等规模并行（spawn/jumped）推荐使用。递推式里的乘数 `mult` 为算法固定常数，用户不可设，只有 `inc` 由种子决定。**XSL-RR** 即对状态做 xorshift 式混合再按导出移位量做循环右移，把 128 位混成 64 位输出；LCG 模 $2^{128}$ 时低位周期短、规律性强，XSL-RR 避免直接暴露低位。

### PCG64DXSM

**PCG64DXSM** 与 PCG64 使用同一套 LCG 递推，但输出函数改为更强的 **DXSM**（类似强哈希的 xorshift-multiply 结构），雪崩性质更好。

- **用途**：在极大规模并行（百万级流、每流大量采样）时，PCG64 的 XSL-RR 在某些「低比特碰撞」下可能被 PractRand 等检出相关性；PCG64DXSM 可消除该问题且性能相当，拟作未来默认。
- **周期与能力**：与 PCG64 相同，支持 `advance`、`jumped`。单流或仅用 jumped 做并行时与 PCG64 无差别。

### MT19937（Mersenne Twister）

**MT19937** 是松本真与西村拓士提出的梅森旋转算法，广泛用于 C++、Python 标准库等。

- **状态**：624 个 32 位整数构成的内部状态数组；递推基于扭曲广义反馈移位寄存器（TGFSR），再经 tempering 变换输出。
- **周期**：$2^{19937}-1$（梅森素数相关），极长。
- **特点**：32 位输出，速度快，通过 TestU01 等部分检验时存在已知弱点（高维均匀性等）。NumPy 中主要用于 Legacy RandomState 兼容；若单独使用 BitGenerator，可通过 `SeedSequence` 播种，并支持 `jumped()` 得到跳过约 $2^{128}$ 步的新实例。

### Philox

**Philox** 是 Salmon 等人提出的计数器型 RNG，来自 Random123 库，设计目标即为并行计算。

- **原理**：输入为 **计数器**（counter）和 **密钥**（key，由种子派生）。输出由「counter + key」经多轮可逆变换（乘法、异或、置换等）得到，同一 (counter, key) 总是得到同一输出；不同 counter 或不同 key 对应不同、统计独立的流。
- **变体**：NumPy 使用 64 位版（如 Philox-4x64），大周期（如 $2^{256}$ 量级）；部分 GPU 框架（如 PyTorch CUDA）采用 32 位 Philox 做并行生成。
- **特点**：无需顺序递推即可算「第 n 个」随机数，适合 GPU 或大量独立流；统计质量高，在 CPU 上速度略慢于 PCG64/SFC64。支持 `advance`、`jumped`；并行时也可直接为每个流分配不同 key（如 `key = seed + stream_id`）。

### SFC64

**SFC64**（Small Fast Chaotic）是 Chris Doty-Humphrey 提出的 64 位输出、基于可逆映射的快速 PRNG。

- **状态**：4 个 64 位无符号整数，其中一个是递增计数器；核心为对 (a, b, c, counter) 做加法、移位、旋转、异或等可逆运算，多轮混合后输出 64 位。
- **周期**：设计上期望周期约 $2^{255}$，实际保证至少 $2^{64}$ 不重复。
- **特点**：在 NumPy 各 BitGenerator 中通常最快，统计质量良好；**不支持** `jumped`，不适合依赖「跳块」的并行划分。需要大量独立流时宜用 spawn 或整数序列种子。

### 算法对比小结

| 算法      | 类型               | 周期              | 64 位输出   | jump/advance | 典型用途       |
| --------- | ------------------ | ----------------- | ----------- | ------------ | -------------- |
| PCG64     | 递推（LCG+输出）   | $2^{128}$         | 是          | 是           | 默认，通用     |
| PCG64DXSM | 递推（LCG+强输出） | $2^{128}$         | 是          | 是           | 大规模并行     |
| MT19937   | 递推（TGFSR）      | $2^{19937}-1$     | 否（32 位） | jumped       | Legacy 兼容    |
| Philox    | 计数器型           | 极大              | 是          | 是           | 并行、GPU 风格 |
| SFC64     | 可逆映射+计数      | $\approx 2^{255}$ | 是          | 否           | 追求速度       |

## 种子与 SeedSequence

所有内置 BitGenerator 的种子都经 **SeedSequence** 转为高质量初始状态。SeedSequence 用带雪崩效应的哈希，把（可能低质量的）用户种子混合成足够比特，再交给各算法所需的状态。因此：

- 支持任意非负整数或整数序列作为种子；
- 相邻种子会产生差异很大的流；
- 单次运行建议用 OS 熵或 `secrets.randbits(128)`，并打印/记录 `SeedSequence(seed).entropy` 以便复现。

复现时用记录的 entropy 重建 SeedSequence 再构造 BitGenerator。若只是单元测试或调试，固定小种子（如 0）即可。

## 并行与多线程

**spawn**：从一个种子派生多棵子树，每棵对应一个独立（极高概率不重叠）的 Generator。推荐用 `default_rng(seed).spawn(n)` 或 `SeedSequence(seed).spawn(n)` 得到 n 个子流；碰撞概率可粗估为 $n^2 \cdot 2^{-128}$，百万级流仍在可接受范围。

**整数序列种子**：每个 worker 用 `[worker_id, root_seed]` 作种子，保证不同 worker 不同流且可复现；不要把 `root_seed + worker_id` 当单一整数种子使用，多轮运行易造成流重叠。

**Philox 独立流**：Philox 为计数器型，种子即 key；不同 key 对应不同流，可直接用 `key=root_seed+stream_id` 生成多流（需保证 stream_id 不重复）。若需「可证明独立」或与 GPU 上的 Philox 流对齐，多线程里每线程一个 Philox 有理论优势，但在 CPU 上 Philox 比 PCG64 慢约一半，多数应用用 spawn 的 PCG64 即可。

**advance 与 jumped**：`advance(delta)` 把当前 BitGenerator 状态**原地**向前推进任意步；`jumped(n)` **不修改**当前实例，而是返回**新实例**，其状态等于按算法规定的大步长连续跳 n 次后的状态（如 PCG64 单次约 $2^{127}$ 步）。需要任意步长时用 `advance`，需要固定大步长分块、给不同进程/线程时用 `jumped`；从同一发生器依次 `jumped(0)`、`jumped(1)`… 得到不重叠的块。PCG64/PCG64DXSM/Philox/MT19937 支持两者；SFC64 不支持 jumped。

**多线程填充大数组**：`random`、`standard_normal`、`standard_exponential`、`standard_gamma` 支持 `out=`。可预分配数组，用 `SeedSequence.spawn(n_threads)` 为每线程建一个 Generator，各填一段 `out[first:last]`，线程数固定时同一主种子可复现。

## Legacy：RandomState 与 API 对应

**RandomState** 是旧接口，固定使用 MT19937，内部还用 Box-Muller 正态、逆 CDF 指数/伽马等，保证与 NumPy 1.16 及以前输出一致。它被视为冻结，仅做兼容性维护。

`numpy.random` 下的顶层函数（如 `np.random.rand()`、`np.random.randn()`、`np.random.randint()`）都基于**单一全局 RandomState**，依赖全局状态，不推荐新代码使用。新代码应使用 `Generator` + `default_rng()`。

| Generator（新）                 | RandomState / 顶层（旧）         |
| ------------------------------- | -------------------------------- |
| `rng.random()`                  | `random_sample()`, `rand()`      |
| `rng.integers(low, high, size)` | `randint()`, `random_integers()` |
| 无 `rand`/`randn`               | `rand()`, `randn()`              |

Generator 的正态、指数、伽马使用 256 步 Ziggurat，比 RandomState 的 Box-Muller/逆 CDF 快约 2–10 倍；算法不同，**数值不会与 RandomState 一致**。Generator 还支持 `random(..., dtype='f'|'d', out=...)`、`integers(..., dtype=...)`、部分分布的 `out=`、`choice`/`permutation`/`shuffle` 的 `axis=`，以及 `complex_normal` 等。

## 性能与选型

在 64 位 Linux（文档示例：AMD Ryzen 9）上，相对 Legacy RandomState：PCG64/PCG64DXSM 在整数、均匀、正态、指数、伽马等上约 1.5–2 倍以上加速；SFC64 通常最快；Philox 统计质量高但较慢，在 32 位或部分 Windows 上更慢。32 位平台下 64 位 BitGenerator 会慢不少，MT19937 为 32 位相对受影响小。

**选型建议**：默认用 PCG64（`default_rng()`）；单流或仅用 jumped、中等规模 spawn 继续用 PCG64 即可；百万级并行流 + 每流大量采样时显式用 PCG64DXSM 或 Philox/SFC64；要最高速度且不需要 jump 时选 SFC64；必须复现 1.16 及以前数值时才用 RandomState。

**为何 CPU 默认不用 Philox？** Philox 的优势是并行：每线程用不同 (counter, key) 独立生成，非常适合 GPU。在 CPU 单线程下只是顺序递增 counter，享受不到并行收益，却要承担每输出一次多轮乘法和异或的开销；NumPy 基准里 Philox 在 CPU 上比 PCG64 慢约一半。此外还有兼容性：若把默认改成 Philox，旧种子、旧代码的复现会全部改变。**不考虑兼容性时 Philox 是否「最好」？** 取决于场景：GPU 或极大规模并行（每线程独立 key）时 Philox 最自然；单线程 CPU 时 PCG64 或 SFC64 更合适；多线程 CPU 用 spawn 的 PCG64 通常足够且更快，仅当需要「可证明独立」或与 GPU Philox 流对齐时再在 CPU 上显式选 Philox。

其他框架（如 PyTorch）采用类似 Generator 概念，CPU 用 MT19937、CUDA/MPS 用 Philox 做并行生成，跨设备复现不保证；详见各框架文档。

## 小结

- **默认用法**：`rng = np.random.default_rng(seed)`，用 `rng.random()`、`rng.integers()`、`rng.standard_normal()` 等；需要复现时记录 `SeedSequence(seed).entropy` 或固定种子。
- **并行**：优先用 `SeedSequence.spawn(n)` 或 `default_rng(seed).spawn(n)`；或用 `[worker_id, root_seed]` 作种子；大规模并行可改用 PCG64DXSM 或 Philox。
- **兼容旧结果**：仅需与 NumPy 1.16 及以前逐值一致时使用 RandomState。
- **安全相关**：不用 `numpy.random`，改用 `secrets`。

## 参考文献

- [NumPy Random sampling (numpy.random)](https://numpy.org/doc/stable/reference/random/index.html)
- [Bit generators](https://numpy.org/doc/stable/reference/random/bit_generators/index.html)
- [Parallel random number generation](https://numpy.org/doc/stable/reference/random/parallel.html)
- [Legacy random generation (RandomState)](https://numpy.org/doc/stable/reference/random/legacy.html)
- [What's new or different (Generator vs RandomState)](https://numpy.org/doc/stable/reference/random/new-or-different.html)
- [Upgrading PCG64 with PCG64DXSM](https://numpy.org/doc/stable/reference/random/upgrading-pcg64.html)
- [NEP 19 — RNG policy](https://numpy.org/neps/nep-0019-rng-policy.html)
- [PCG, A Family of Simple Fast Space-Efficient Statistically Good Algorithms for Random Number Generation](https://www.pcg-random.org/)
- [Mersenne Twister (Wikipedia)](https://en.wikipedia.org/wiki/Mersenne_Twister)
- [Random123 (Philox)](https://www.thesalmons.org/john/random123/releases/latest/docs/index.html)
- [PyTorch Reproducibility (randomness)](https://pytorch.org/docs/stable/notes/randomness.html)
