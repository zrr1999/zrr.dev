import type { ResearchDirectionId } from "@/profile";

export interface FeaturedProject {
  name: string;
  href: string;
  direction: ResearchDirectionId;
  description: string;
  tags: string[];
  sample?: string;
}

export const spore: FeaturedProject = {
  name: "Spore",
  href: "https://spore-lang.dev/",
  direction: "collaboration",
  description:
    "意图编程语言（实验阶段）：用函数签名表达类型、可失败结果与 effect，以 hole 承载尚未完成的实现，让人和智能体在同一份约束上协作。",
  tags: ["Rust", "Language"],
  sample: `fn main() -> () uses [Console] {
    println("Hello from hello-app!")
    return
}`,
};

export const spark: FeaturedProject = {
  name: "Spark",
  href: "https://github.com/zendev-lab/spark",
  direction: "infrastructure",
  description:
    "让智能体工作跨越一次终端会话：本地 daemon 托管会话、执行与恢复，支撑长期任务与跨工作区委托。",
  tags: ["TypeScript", "Agent"],
};

export const volvox: FeaturedProject = {
  name: "Volvox",
  href: "https://github.com/volvox-ai/volvox",
  direction: "infrastructure",
  description:
    "可组合深度学习元框架（探索阶段）：在早期框架实验基础上，研究组件边界、依赖与执行语义，以及替换组件后需要保持和验证的性质。",
  tags: ["Python", "DL Framework"],
};

export const featuredProjects: FeaturedProject[] = [spore, spark, volvox];
