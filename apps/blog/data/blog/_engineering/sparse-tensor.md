---
title: "稀疏张量计算的简单实现"
author: "Zhan Rongrui"
description: "稀疏张量有 COO 和 CSR 两种常见的表示格式，这里用 Python 实现了稀疏张量的转置和求和算子"
pubDatetime: 2024-08-31
tags: ["稀疏张量"]
---

稀疏张量有 COO 和 CSR 两种常见的表示格式，这里用 Python 实现了稀疏张量的转置和求和算子。

## 稀疏张量的定义

稀疏张量是指大部分元素为零的张量。为了节省存储空间和提高计算效率，稀疏张量通常使用特殊的数据结构来存储。

### COO 格式 (Coordinate Format)

COO 格式使用三个数组来存储稀疏张量：

- `indices`: 存储非零元素的坐标
- `values`: 存储非零元素的值
- `shape`: 存储张量的形状

### CSR 格式 (Compressed Sparse Row)

CSR 格式主要用于二维稀疏矩阵，使用三个数组：

- `row_ptr`: 每行第一个非零元素在 `col_indices` 中的位置
- `col_indices`: 非零元素的列索引
- `values`: 非零元素的值

## 实现示例

本文档将在后续更新中补充具体的 Python 实现代码和示例。
