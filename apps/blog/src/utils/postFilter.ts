import type { CollectionEntry } from "astro:content";
import { isListed } from "@zrr-website/blog-posts";

const postFilter = ({ data }: CollectionEntry<"blog">) =>
  isListed(data, { dev: import.meta.env.DEV });

export default postFilter;
