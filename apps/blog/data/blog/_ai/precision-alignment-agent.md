---
title: "Precision Alignment Agent 流程图"
description: "基于 precision-alignment.prose 的 Paddle 与 PyTorch 精度对齐智能分析系统流程图"
pubDatetime: 2026-01-25
modDatetime: 2026-01-25
tags: ["Paddle", "PyTorch", "精度对齐", "多智能体"]
---

# Precision Alignment Agent 流程图

根据 [precision-alignment.prose](https://github.com/zrr1999/precision-alignment-agent/blob/main/precision-alignment.prose) 整理的 Paddle 与 PyTorch 精度对齐多智能体系统流程图。

## 简化流程（关键分支）

只保留主要决策点，细节合并为阶段框。

```mermaid
flowchart TD
    Start([开始]) --> Input[输入配置]
    Input --> Scope["范围与知识<br/>C: API 关系与范围 · K: 历史知识指导"]
    Scope --> Baseline["V: 建立精度基线"]

    Baseline --> B1{"① 需要修复?"}

    B1 -->|否| NoFix["无修复: D 做 CI/CE，C 记录已对齐"]
    NoFix --> Review["R: 最终审查与输出报告"]

    B1 -->|是| Analysis["L: 分析 PyTorch / Paddle · C: 汇总"]
    Analysis --> Compare

    subgraph DFC["DFC 修复环 (对比→修改→验证)"]
        Compare["C 对比报告 · P 计划"]
        Fix["A 改核 → D 编译"]
        B2{"② 编译通过?"}
        Validate["V 精度验证 · D CI/CE"]
        B3{"③ 精度已对齐?"}
        Perf["A 性能分析"]

        Compare --> Fix
        Fix --> B2
        B2 -->|否| Fix
        B2 -->|是| Validate
        Validate --> B3
        B3 -->|否| Compare
        B3 -->|是| Perf
    end

    Perf --> Review

    Review --> B4{"④ 最终结果?"}
    B4 -->|完全成功| PR1["R: 成功 PR"]
    B4 -->|部分成功| PR2["R: 部分 PR"]
    B4 -->|完全失败| PR3["R: 失败报告"]

    PR1 & PR2 & PR3 --> Curate["K: 知识沉淀 → knowledge/"]
    Curate --> End([结束])
```

**四个关键分支：** ① 需要修复？ ② 编译通过？（FGE 内环） ③ 精度已对齐？（DFC 主环） ④ 最终结果？（完全 / 部分 / 失败）

---

## 参与智能体

| 代号  | 名称                 | 职责概要                                       |
| ----- | -------------------- | ---------------------------------------------- |
| **C** | Coordinator 协调者   | 分析 API 关系、确定范围、对比报告、策略决策    |
| **L** | Locator 定位者       | 代码路径分析、伪代码、精度关键点标注           |
| **V** | Validator 验证者     | PaddleAPITest 精度测试、基线建立、错误模式分析 |
| **D** | Diagnostician 诊断者 | 编译/安装、CI/CE 测试、故障排查                |
| **P** | Planner 规划者       | 修复路线图、优先级、依赖与回退                 |
| **A** | Aligner 对齐者       | CUDA 核修改、数值实现、性能与兼容              |
| **R** | Reviewer 审查者      | 独立验证、PR 生成、失败报告                    |
| **K** | Curator 策展者       | 任务前知识指导、任务后知识沉淀与持久化         |

## 主流程（完整）

```py
x = 1
```

```mermaid
flowchart TD
    Start([开始]) --> Input[/"输入: api_name, paddle_path, pytorch_path, paddletest_path, venv_path"/]
    Input --> Init["C: 启动对齐，分析 API 关系与范围"]

    subgraph Scope["确定范围与知识"]
        Init --> ApiScope["C: 分析相关 API（函数/方法变体、共享核）"]
        ApiScope --> TaskScope["C: 确定对齐任务范围与优先级"]
        TaskScope --> Knowledge["K: 基于历史知识提供指导"]
        Knowledge --> ScopeDone["C: 审阅知识指导，初始化环境"]
    end

    ScopeDone --> Baseline["V: 建立 PaddleAPITest 精度基线"]

    Baseline --> RepairDec{"C: 是否需要修复?"}

    RepairDec -->|否| NoRepair["precision_results = 基线"]
    NoRepair --> NoRepairD["D: 执行 CI/CE 测试"]
    NoRepairD --> NoRepairC["C: 记录「已对齐」状态"]
    NoRepairC --> NoRepairA["A: fix_implementation = null"]
    NoRepairA --> FinalReview

    RepairDec -->|是| Parallel

    subgraph Parallel["并行分析"]
        PytorchL["L: 分析 PyTorch 源码<br/>API→中间层→CUDA 核"]
        PaddleL["L: 分析 Paddle 源码<br/>API→中间层→CUDA 核"]
    end

    Parallel --> Summary["C: 汇总 PyTorch / Paddle 分析，准备修复规划"]

    subgraph DFC["DFC 主环: 对比-修复-验证 (最多 3 轮)"]
        Summary --> Compare["C: 生成 PyTorch vs Paddle 对比报告"]
        Compare --> Plan["P: 制定修复路线图"]

        subgraph FGE["FGE 内环: 计划-修改-编译 (最多 5 轮)"]
            Plan --> FGEResume["P: 确定当前实施步骤"]
            FGEResume --> Impl["A: 按计划实现核修改"]
            Impl --> Compile["D: 编译 Paddle 并安装到 venv"]
            Compile --> CompOk{"编译/安装<br/>是否成功?"}
            CompOk -->|是| Validate["V: PaddleAPITest 精度验证"]
            CompOk -->|否| ErrType{"错误类型?"}
            ErrType -->|简单| SimpleD["D: 修复简单错误，重试编译"]
            SimpleD --> Compile
            ErrType -->|复杂| ComplexA["A: 分析根因并修改实现"]
            ComplexA --> Compile
        end

        Validate --> Quality["D: CI/CE 质量报告"]
        Quality --> Aligned{"所有 API<br/>精度是否已对齐?"}
        Aligned -->|是| Perf["A: 性能对比分析"]
        Aligned -->|否| NextRound["C: 分析结果，为下一轮更新策略"]
        NextRound --> Compare
        Perf --> FinalReview
    end

    subgraph Final["最终审查与输出"]
        FinalReview["R: 独立验证<br/>编译 / 精度测试 / CI·CE / 性能 / 数值对齐"]
        FinalReview --> Out1["输出: alignment_report"]
        FinalReview --> Out2["输出: modified_kernel"]
        FinalReview --> Out3["输出: api_scope_report"]
    end

    Out1 & Out2 & Out3 --> PREval{"最终结果?"}

    PREval -->|完全成功| PRSuccess["R: 创建 PR (成功)"]
    PREval -->|部分成功| PRPartial["R: 创建 PR (标明未完成)"]
    PREval -->|完全失败| PRFail["R: 生成失败报告"]

    PRSuccess & PRPartial & PRFail --> Curate["K: 从全流程抽取知识并持久化到 knowledge/"]

    Curate --> End([结束])
```

## DFC 主环与 FGE 内环

- **DFC（Compare–Fix–Validate）**：在「需要修复」分支内，最多 3 轮；每轮包含：对比报告 → 修复计划 → FGE 内环（实现并编译通过）→ 精度验证 → 质量报告；若未对齐则由 C 更新策略进入下一轮。
- **FGE（Plan–Modify–Compile）**：在每轮 DFC 内，最多 5 轮；每轮：P 确定步骤 → A 修改实现 → D 编译安装；失败则按简单/复杂分别由 D 或 A 处理后再重试编译。

## PR 与知识沉淀

- **PR**：由 R 根据「完全成功 / 部分成功 / 完全失败」选择：成功/部分 PR，或失败报告；PR 标题形如 `[PAA][Precision Depth Alignment] {title}`，描述需覆盖涉及的 API/核/公共函数及 CI·CE、PaddleAPITest 结果。
- **知识沉淀**：由 K 在 PR 阶段之后执行，汇总 L、V、C、D、P、A、R 的上下文与报告，抽取可复用模式与最佳实践，持久化到 `knowledge/`，供后续任务检索。
