import type { CollectionEntry } from "astro:content";
import { listingSortKey } from "@zrr-website/blog-posts";
import postFilter from "./postFilter";

const getSortedPosts = (posts: CollectionEntry<"blog">[]) => {
  return posts
    .filter(postFilter)
    .sort((a, b) => listingSortKey(b.data) - listingSortKey(a.data));
};

export default getSortedPosts;
