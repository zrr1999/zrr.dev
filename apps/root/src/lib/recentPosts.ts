import { loadRecentPosts, type HomePost } from "@zrr-website/blog-posts/load";

export type Post = HomePost;

/** 构建期读取仓库里的博客正文，与博客共用发布过滤、排序和路径。 */
export function fetchRecentPosts(limit = 4): Promise<Post[]> {
  return loadRecentPosts({ limit });
}
