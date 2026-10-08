export const vision =
  "让个人能够构造和演化自己的计算系统，并探索这些系统如何在可验证的反馈下持续改进。";

export const researchFocus = "可组合基础设施 · 编程模型 · 自我改进系统";

export const background =
  "已有工作涉及深度学习框架的程序捕获与数值正确性，以及长期运行的智能体基础设施；目前的尝试集中在可组合运行时和人机协作编程模型。";

export const currentRole = {
  org: "百度",
  group: "飞桨基础框架",
  detail: "大模型预训练部",
  community: "PaddlePaddle Committer",
};

export const school = "西安电子科技大学";

export const education = [
  { degree: "学士", major: "智能科学与技术", years: "2018-2022" },
  { degree: "硕士", major: "计算机科学与技术", years: "2022-2025" },
];

export const experiences = [
  {
    period: "2025-至今",
    title: "百度 · 大模型预训练部",
    detail: "飞桨基础框架研发，负责正确性与生态兼容方向。",
  },
  {
    period: "2023-2025",
    title: "百度 · 飞桨基础框架（实习）",
    detail: "参与 PIR 新一代 IR 体系与 SOT 动转静架构研发。",
  },
  {
    period: "2023",
    title: "PaddlePaddle 社区 Committer",
    detail: "通过多期黑客松的算子与编译器贡献，成为社区第五位 Committer。",
  },
];

export const researchDirections = [
  {
    id: "infrastructure",
    title: "可组合基础设施",
    question: "个人如何按照自己的目标构造和调整计算系统？",
    detail:
      "从组件边界与执行语义出发，探索工具、计算与状态如何组合。Spark / Cue 聚焦长期任务与持久执行，Volvox 探索深度学习框架的组合抽象。",
  },
  {
    id: "collaboration",
    title: "人机协作编程模型",
    question: "部分意图如何成为人和智能体共同理解的程序？",
    detail:
      "在 Spore 中探索类型、effect、可执行性质与 hole，让尚未完成的程序也能携带明确约束。接下来关心这些表达是否能减少修改歧义与协作成本。",
  },
  {
    id: "self-improvement",
    title: "自我改进系统",
    question: "系统能否改进自己的工具，并提高后续继续改进的能力？",
    detail:
      "长期目标是递归自我改进（RSI）。计划从数值差异诊断切入，让系统根据失败记录提出工具或工作流的修改，再用独立任务与固定预算检验收益，追踪多轮改进、迁移和回归。",
  },
] as const;

export type ResearchDirectionId = (typeof researchDirections)[number]["id"];

export function researchDirection(
  id: ResearchDirectionId
): (typeof researchDirections)[number] {
  switch (id) {
    case "infrastructure":
      return researchDirections[0];
    case "collaboration":
      return researchDirections[1];
    case "self-improvement":
      return researchDirections[2];
    default: {
      const _exhaustive: never = id;
      throw new Error(`unknown research direction: ${String(_exhaustive)}`);
    }
  }
}
