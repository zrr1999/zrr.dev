---
title: "多 Agent 系统设计范式：从理论到实践的完整指南"
author: "zrr1999"
description: "从设计方案与设计范式的宏观角度，系统梳理主流多 Agent 系统构建思路"
pubDatetime: 2026-01-25
modDatetime: 2026-01-25
tags: ["多智能体", "Agent", "系统设计", "架构", "设计范式"]
---

本文从设计方案与设计范式的宏观角度，系统性地梳理当前主流的多 Agent 系统构建思路，涵盖：Agentic 与 非 Agentic 的本质、规划范式、工作流设计，以及核心设计原则。

## 引言

在设计多 Agent 系统时，最重要的就是理解**设计范式层面**的根本差异，本文主要回答以下核心问题：

1. **Agentic 与非 Agentic 的本质区别是什么？** 以及如何选择与混合？
2. **在规划、反思与记忆层面有哪些主流设计思路？**（主要针对 Agentic）
3. **系统级工作流有哪些典型组织方式？**
4. **有哪些普适的设计原则指导系统构建？**

## 本质区别：Agentic 与 非 Agentic

### 非 Agentic（流水线）

**核心定位**：大模型作为**被编排的模块**，不负责自主决策。

**关键特征**：

- 规划、工具调用、记忆管理、控制流由**外部逻辑或流程引擎**决定
- 大模型主要在单轮或固定流程中完成推理与生成
- 系统行为完全由开发者预先定义的工作流决定

**典型形态**：

- RAG（检索增强生成）系统
- 固定工作流的文档处理流水线
- 规则引擎加大模型的混合系统

**适用场景**：

- 任务边界清晰、流程固定
- 强合规要求，需要完全可控的执行路径
- 不需要动态调整策略的场景

### Agentic（自主式）

**核心定位**：大模型作为**有目标、能决策、能持续行动**的自主主体。

**关键特征**[[1]](https://zhuanlan.zhihu.com/p/1928636720796136414)[[2]](https://agentic-design.ai/patterns/multi-agent)：

- **自主规划**：智能体自己决定执行路径和子目标分解
- **多步执行**：不是单次调用，而是持续的感知-决策-行动循环
- **环境交互**：通过工具调用与外部环境产生双向交互
- **目标持续**：维护长期目标，根据反馈动态调整策略

**演进方向**：
从「外部编排的流水线」走向「**模型原生**」——规划、工具选择、记忆管理逐步学习到模型内部，减少对外部系统的依赖[[6]](https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system)。

### 设计哲学的差异

| 维度         | 非 Agentic     | Agentic        |
| ------------ | -------------- | -------------- |
| **控制权**   | 人/流程在控盘  | 智能体在控盘   |
| **适应性**   | 预定义路径     | 动态调整策略   |
| **可控性**   | 高（完全确定） | 中（需要护栏） |
| **创新能力** | 低             | 高             |

**选择原则**：

- 如果任务可以完全标准化、流程化 → 非 Agentic 更稳定高效
- 如果任务需要灵活应对、创造性解决 → Agentic 更合适
- 实际系统常采用**混合模式**：核心流程用流水线，灵活部分用 Agentic

**与能力实现的对应**：非 Agentic 的编排、控制流、决策通常由**规则与逻辑**（流程引擎、规则、形式化规划）实现；Agentic 的自主规划与多步决策通常由**数据驱动**（大模型等）实现。二者在能力实现层面上对应，下一节展开。

## 规则与逻辑 vs 数据驱动：对应关系与混合

规则与逻辑**对应**非 Agentic 的典型实现方式，数据驱动**对应** Agentic 的典型实现方式；实际系统常在**同一系统内混用**——部分环节偏规则与逻辑（如合规、精确规划），部分偏数据驱动（如理解、生成）。

- **规则与逻辑**：专家系统、知识图谱、形式化规划（如 PDDL）等。知识被**显式写出来**，推理可追溯，**可解释、可验证**，适合合规与审计；缺点是要人工编写和维护规则，**难以从数据里自动学**，泛化弱。
- **数据驱动**：大模型、图像或语音识别模型等。从**数据中学习**，泛化强，能处理自然语言、模糊输入；缺点是推理过程藏在参数里，**难逐条解释和验证**，也不保证每步都符合既定规则。

### 两种方式的对比

| 维度         | 规则与逻辑                 | 数据驱动               |
| ------------ | -------------------------- | ---------------------- |
| **推理方式** | 逻辑推理、显式规则         | 模式识别、统计学习     |
| **知识表示** | 显式、结构化（如知识图谱） | 隐式、分布在模型参数里 |
| **可解释性** | 强，可追溯每一步           | 弱，多为黑盒           |
| **泛化能力** | 弱，依赖人工规则           | 强，从数据中学习       |
| **数据需求** | 低                         | 高                     |
| **确定性**   | 高                         | 低（概率输出）         |
| **更擅长**   | 精确推理、规划、约束检查   | 感知、自然语言、生成   |

### 混合时的设计原则

#### 按职责分工[[8]](https://digitalthoughtdisruption.com/2025/07/31/agentic-ai-architecture-modular-design-patterns/)

**策略**：

- **交给规则与逻辑**：确定性、可解释、必须可审计的部分
  - 逻辑推理（因果、常识）
  - 知识图谱查询
  - 规则与约束（如合规检查）
  - 精确规划（PDDL、HTN）

- **交给数据驱动（大模型等）**：不确定、开放、需要泛化的部分
  - 自然语言理解与生成
  - 视觉与语音
  - 大规模模式识别
  - 创造性生成

#### 分层混合记忆[[9]](https://github.com/FareedKhan-dev/all-agentic-architectures)

**结构**：

- **情景记忆**：由数据驱动模型编码的经验（如从对话、交互中学习）
- **语义记忆**：知识图谱、本体等结构化知识
- **程序性记忆**：技能、规则库

**协同**：数据驱动提供泛化与适应，规则与逻辑提供精确检索与可验证推理。

#### 接口设计

**关键考虑**：

- **状态表示**：在自然语言和形式化表示（规则、图谱可用的格式）之间怎么转换
- **工具形态**：规则与逻辑可封装成「工具」供大模型调用
- **校验**：用规则与逻辑校验大模型输出是否满足约束，不满足则让其重试或修正

#### 反馈驱动的自我修正[[2]](https://agentic-design.ai/patterns/multi-agent)

**流程**：

1. 数据驱动模块（如大模型）生成候选方案
2. 规则与逻辑模块做检测：是否违反约束、是否越权等
3. 把违规信息反馈给数据驱动模块，令其重新生成或修正
4. 重复直至通过校验或达到上限

## 规划、反思与记忆的设计范式

以下范式主要在 **Agentic** 架构中体现——非 Agentic 的规划多由外部规则与逻辑完成。在**规划、反思与记忆**这一层，业界有多种设计取向，可单独或组合使用[[3]](https://www.woshipm.com/ai/6157489.html)[[7]](https://techcommunity.microsoft.com/blog/educatordeveloperblog/ai-agents-the-multi-agent-design-pattern---part-8/4402246)[[4]](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns)[[8]](https://digitalthoughtdisruption.com/2025/07/31/agentic-ai-architecture-modular-design-patterns/)[[2]](https://agentic-design.ai/patterns/multi-agent)[[9]](https://github.com/FareedKhan-dev/all-agentic-architectures)：

- **任务分解**：将复杂目标拆成子任务树，逐层执行；关注分解策略（广度/深度）、粒度、依赖与动态插入；典型如 ReAct、思维树。
- **多方案择优**：生成多候选、搜索与评估选优；关注方案多样性、评估标准、搜索策略（MCTS、束搜索）与资源上限；适合决策空间大、多目标权衡。
- **外部规划器**：用 PDDL 等做精确规划，大模型做自然语言理解与规范化；可验证性强，适合高风险；需厘清规划器与大模型的边界、状态表示与验证。
- **反思与修正**：失败后触发反思、调策略；关注触发条件、反思深度（当前步 vs 全方案）、修正方式与循环上限；如自我精炼、Reflexion。
- **记忆增强**：用常识、经验、领域知识参与规划；关注短期/长期/语义记忆结构、检索方式、更新时机及与规划的耦合；如 RAG 规划、MemGPT、情景记忆。

## 系统级工作流设计范式

### 控制结构[[1]](https://zhuanlan.zhihu.com/p/1928636720796136414)[[4]](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns)[[5]](https://microsoft.github.io/multi-agent-reference-architecture/docs/reference-architecture/Patterns.html)[[6]](https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system)

| 类型          | 核心                                             | 优势                                 | 劣势                           | 适用                                            |
| ------------- | ------------------------------------------------ | ------------------------------------ | ------------------------------ | ----------------------------------------------- |
| **集中式**    | 全局协调者分解、分配、汇总；控制权在中央         | 全局视野、一致性强、易调试           | 单点故障、扩展受限             | 任务依赖强、强一致性（如风控）；监督者/路由模式 |
| **分布式**    | 无中央节点，智能体自治、协议协作（合约网、共识） | 高可用、线性扩展、局部失败不波及全局 | 一致性难、通信与调试成本高     | 大规模、地理分布、高可用、高度动态              |
| **混合/分层** | 战略→战术→执行，层内可再分层                     | 可控与灵活平衡、复杂度可管           | 需厘清层间接口、权责与状态归属 | 大型企业系统                                    |

### 协作模式[[2]](https://agentic-design.ai/patterns/multi-agent)[[3]](https://www.woshipm.com/ai/6157489.html)[[7]](https://techcommunity.microsoft.com/blog/educatordeveloperblog/ai-agents-the-multi-agent-design-pattern---part-8/4402246)[[8]](https://digitalthoughtdisruption.com/2025/07/31/agentic-ai-architecture-modular-design-patterns/)

| 模式             | 关系               | 优势                         | 劣势                       | 代表                                |
| ---------------- | ------------------ | ---------------------------- | -------------------------- | ----------------------------------- |
| **流水线**       | 串行、单向         | 逻辑清晰、质量可控、易优化   | 灵活性差、并行低、不善迭代 | 策划→撰写→润色；需求→设计→编码→测试 |
| **市场（竞价）** | 竞价、拍卖分配任务 | 资源优化、负载均衡、激励清晰 | 协调开销大、收敛不确定     | 资源异构、负载动态、公平与效率兼顾  |
| **团队**         | 多对多、共同决策   | 创新与容错强                 | 无序、收敛难、通信 O(n²)   | AutoGen 群聊、辩论式生成            |
| **生态（群体）** | 局部规则、涌现     | 高鲁棒、自组织、线性扩展     | 全局难控、难预测、调参难   | 蚁群/蜂群式；路径规划、资源调度     |

### 信息流向

**单向**：流水线、链式，适合确定、可预测。**反馈迭代**：生成-评审、PDCA，适合质量提升与自改进。**网状**：群聊、多对多，适合信息充分流动与涌现。**广播/订阅**：事件驱动、黑板，松耦合、易扩展。

## 核心设计原则与最佳实践

- **模块化与可组合性**[[5]](https://microsoft.github.io/multi-agent-reference-architecture/docs/reference-architecture/Patterns.html)[[6]](https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system)：单一职责、标准化接口、技能化封装；清晰契约、版本化元数据、动态注册发现。
- **自然语言转结构化行为**：用自然语言驱动结构化动作/工具调用，提高可控、可测、可审计并降幻觉；函数调用、工具 I/O 定义、JSON 等结构化输出。
- **提示即设计**[[8]](https://digitalthoughtdisruption.com/2025/07/31/agentic-ai-architecture-modular-design-patterns/)：提示词作可版本、可复用的行为规范；Git 管理、模板化、A/B 测试、纳入代码。
- **上下文即状态**：大模型无状态，把状态显式放进上下文/记忆；状态机、序列化与持久化、窗口管理（压缩、总结、检索）。
- **工具即受控能力边界**[[4]](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns)：工具界定能/不能做什么以控风险；最小权限、沙箱、敏感操作人工确认。
- **多小智能体优于一大**[[7]](https://techcommunity.microsoft.com/blog/educatordeveloperblog/ai-agents-the-multi-agent-design-pattern---part-8/4402246)：按职责拆、短链路，降认知与出错面；按领域/功能划分、控制单智能体上下文、避免万能智能体。
- **人机协同为一等公民**[[2]](https://agentic-design.ai/patterns/multi-agent)：显式设计何时、如何请求人工介入；关键点确认、低置信度审核、人类反馈入环。
- **可观测性、可解释性与评测反馈**[[5]](https://microsoft.github.io/multi-agent-reference-architecture/docs/reference-architecture/Patterns.html)[[4]](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns)：结构化日志、分布式追踪、可视化工作流、决策解释；评测数据集与指标、回归测试、RLHF、生产监控，持续优化。

## 未来趋势与演进方向

规划、工具选择、记忆管理将更多学习到模型内部（模型原生），减少对外部编排的依赖；智能体会向多模态（视觉、语音、文本融合）和自主学习（从人类反馈、经验中持续改进）演进；协议标准化（如 A2A、ACP）将促进跨框架互操作与生态形成[[5]](https://microsoft.github.io/multi-agent-reference-architecture/docs/reference-architecture/Patterns.html)[[6]](https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system)。

## 总结

多 Agent 系统设计是一个多维度的决策空间，需要在以下层面做出权衡：

1. **性质与实现层**：Agentic 与 非 Agentic 决定根本性质；**规则与逻辑**多对应非 Agentic、**数据驱动**多对应 Agentic，二者可混合。
2. **架构层**：集中式、分布式、混合式，决定控制结构。
3. **规划、反思与记忆**：任务分解、多方案、规划器、反思、记忆（主要针对 Agentic），决定智能来源。
4. **协作层**：流水线、市场、团队、生态，决定组织方式。
5. **原则层**：模块化、结构化、人机协同等，指导具体实现。

**关键启示**：

- **没有银弹**：不同场景需要不同的设计选择
- **组合优于单一**：多种范式的混合往往优于单一方案
- **演进优于一步到位**：从简单开始，逐步增加复杂性
- **原则优于技术**：好的设计原则比选择特定框架更重要

关于「确定性边界」的深入案例——当 DSL 的执行器由大模型充当时会发生什么、可以提炼出哪些设计启示——可参见《[OpenProse 案例研究：当 DSL 的执行器是大模型](/posts/openprose-case-study)》。

## 参考文献

1. [Multi-Agent System，一篇就够了 - 知乎](https://zhuanlan.zhihu.com/p/1928636720796136414)
2. [Multi-Agent - Agentic Design | Agentic Design Patterns](https://agentic-design.ai/patterns/multi-agent)
3. [一文读懂Multi-Agent System的概念、场景和实现框架](https://www.woshipm.com/ai/6157489.html)
4. [AI Agent Orchestration Patterns - Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/ai-ml/guide/ai-agent-design-patterns)
5. [Patterns - Multi-agent Reference Architecture](https://microsoft.github.io/multi-agent-reference-architecture/docs/reference-architecture/Patterns.html)
6. [Choose a design pattern for your agentic AI system | Cloud Architecture Center](https://docs.cloud.google.com/architecture/choose-design-pattern-agentic-ai-system)
7. [AI Agents: The Multi-Agent Design Pattern - Part 8 | Microsoft Community](https://techcommunity.microsoft.com/blog/educatordeveloperblog/ai-agents-the-multi-agent-design-pattern---part-8/4402246)
8. [Agentic AI Architectures: Modular Design Patterns and Best Practices](https://digitalthoughtdisruption.com/2025/07/31/agentic-ai-architecture-modular-design-patterns/)
9. [FareedKhan-dev/all-agentic-architectures - GitHub](https://github.com/FareedKhan-dev/all-agentic-architectures)
10. [多智能体系统架构全解析：集中式、分布式、混合式、分层式4种模式选型指南](https://www.betteryeah.com/blog/multi-agent-system-architecture-types-selection-guide-2025)
11. [多 Agent 架构的深度演进与设计范式 | Practice](https://tobyqin.cn/posts/2025-11-26/agent-design/)
12. [多Agent系统：设计、协作与评估全攻略](https://blog.csdn.net/2401_84495872/article/details/148429741)
