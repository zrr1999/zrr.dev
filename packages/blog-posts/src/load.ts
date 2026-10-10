import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { selectRecentPosts, type HomePost, type ListingPost } from "./index";

export type { HomePost, ListingPost };

function blogDataDir(): string {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const candidate = path.join(dir, "apps/blog/data/blog");
    if (existsSync(candidate)) return candidate;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error(`Cannot find apps/blog/data/blog from ${process.cwd()}`);
}

function unquote(value: string): string {
  const trimmed = value.trim().replace(/,$/, "");
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"');
  }
  return trimmed;
}

function field(block: string, key: string): string | undefined {
  const match = block.match(new RegExp(`^\\s*${key}:\\s*(.*)$`, "m"));
  if (!match?.[1]) return undefined;
  const value = unquote(match[1]);
  return value === "" ? undefined : value;
}

function frontmatterBlock(relativePath: string, source: string): string {
  if (relativePath.endsWith(".typ")) {
    const match = source.match(/#metadata\(\(([\s\S]*?)\)\)/);
    if (!match?.[1]) {
      throw new Error(`${relativePath}: missing Typst metadata`);
    }
    return match[1];
  }

  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match?.[1]) {
    throw new Error(`${relativePath}: missing Markdown frontmatter`);
  }
  return match[1];
}

function parseDate(relativePath: string, key: string, value: string): Date {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${relativePath}: invalid ${key}: ${value}`);
  }
  return date;
}

/** Parse one blog source into the listing record both apps share. */
export function parsePostSource(
  relativePath: string,
  source: string
): ListingPost {
  const block = frontmatterBlock(relativePath, source);
  const title = field(block, "title");
  const published = field(block, "pubDatetime");
  if (!title || !published) {
    throw new Error(`${relativePath}: title and pubDatetime are required`);
  }

  const modified = field(block, "modDatetime");
  const id = relativePath.replace(/\.(md|typ)$/, "");
  return {
    id,
    filePath: `data/blog/${relativePath}`,
    data: {
      title,
      pubDatetime: parseDate(relativePath, "pubDatetime", published),
      modDatetime: modified
        ? parseDate(relativePath, "modDatetime", modified)
        : undefined,
      draft: field(block, "draft") === "true",
      timezone: field(block, "timezone"),
    },
  };
}

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async entry => {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) return walk(fullPath);
      if (!entry.isFile()) return [];
      if (entry.name.startsWith("_")) return [];
      if (!entry.name.endsWith(".md") && !entry.name.endsWith(".typ")) {
        return [];
      }
      return [fullPath];
    })
  );
  return files.flat();
}

export async function loadBlogPosts(
  dir = blogDataDir()
): Promise<ListingPost[]> {
  let files: string[];
  try {
    files = await walk(dir);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Cannot read blog posts from ${dir}: ${message}`);
  }

  return Promise.all(
    files.map(async file => {
      const relativePath = path.relative(dir, file).split(path.sep).join("/");
      return parsePostSource(relativePath, await readFile(file, "utf8"));
    })
  );
}

/** Recent published posts for the homepage, read from the blog sources. */
export async function loadRecentPosts(options?: {
  dir?: string;
  limit?: number;
  now?: number;
  dev?: boolean;
  origin?: string;
}): Promise<HomePost[]> {
  const posts = await loadBlogPosts(options?.dir);
  return selectRecentPosts(posts, options?.limit ?? 4, options);
}
