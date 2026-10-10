import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, test } from "vite-plus/test";
import {
  isListed,
  listingDate,
  postPath,
  selectRecentPosts,
  type ListingPost,
} from "@zrr-website/blog-posts";
import { loadRecentPosts, parsePostSource } from "@zrr-website/blog-posts/load";

function post(partial: {
  id: string;
  title: string;
  pubDatetime: string;
  modDatetime?: string;
  draft?: boolean;
}): ListingPost {
  return {
    id: partial.id,
    filePath: `data/blog/_topic/${partial.id}.md`,
    data: {
      title: partial.title,
      pubDatetime: new Date(partial.pubDatetime),
      modDatetime: partial.modDatetime
        ? new Date(partial.modDatetime)
        : undefined,
      draft: partial.draft,
    },
  };
}

describe("postPath", () => {
  test("drops the underscore topic directory", () => {
    expect(
      postPath(
        "_math/rational-decomposition",
        "data/blog/_math/rational-decomposition.md"
      )
    ).toBe("/posts/rational-decomposition");
  });

  test("keeps a non-topic directory and can omit the /posts base", () => {
    expect(postPath("guides/intro", "data/blog/guides/intro.md", false)).toBe(
      "/guides/intro"
    );
  });
});

describe("selectRecentPosts", () => {
  const posts = [
    post({
      id: "old",
      title: "旧文",
      pubDatetime: "2020-01-01",
    }),
    post({
      id: "draft",
      title: "草稿",
      pubDatetime: "2026-09-01",
      draft: true,
    }),
    post({
      id: "updated",
      title: "更新过的",
      pubDatetime: "2021-12-30",
      modDatetime: "2026-09-07",
    }),
    post({
      id: "future",
      title: "未发布",
      pubDatetime: "2099-01-01",
    }),
  ];

  test("drops drafts and future posts, and sorts by modified time", () => {
    const recent = selectRecentPosts(posts, 4, {
      now: Date.parse("2026-10-08T00:00:00Z"),
    });

    expect(recent.map(item => item.title)).toEqual(["更新过的", "旧文"]);
    expect(recent[0]).toEqual({
      title: "更新过的",
      href: "https://blog.zrr.dev/posts/updated",
      date: "2026-09-07",
    });
  });

  test("honors the limit", () => {
    const recent = selectRecentPosts(posts, 1, {
      now: Date.parse("2026-10-08T00:00:00Z"),
    });
    expect(recent).toHaveLength(1);
  });

  test("includes future posts in dev", () => {
    const recent = selectRecentPosts(posts, 4, {
      now: Date.parse("2026-10-08T00:00:00Z"),
      dev: true,
    });
    expect(recent.map(item => item.title)).toContain("未发布");
    expect(recent.map(item => item.title)).not.toContain("草稿");
  });
});

describe("listingDate", () => {
  test("uses the published date when it is later than the modified date", () => {
    expect(
      listingDate({
        title: "a",
        pubDatetime: new Date("2026-02-17"),
        modDatetime: new Date("2026-02-01"),
      })
    ).toBe("2026-02-17");
  });
});

describe("isListed", () => {
  test("treats a post inside the schedule margin as published", () => {
    const pubDatetime = new Date("2026-10-08T00:10:00Z");
    expect(
      isListed(
        { pubDatetime },
        { now: Date.parse("2026-10-08T00:00:00Z"), marginMs: 15 * 60 * 1000 }
      )
    ).toBe(true);
  });
});

describe("parsePostSource", () => {
  test("reads quoted Markdown frontmatter", () => {
    const parsed = parsePostSource(
      "_language/egglog.md",
      `---
title: "Egglog 快速入门"
pubDatetime: 2026-02-17
modDatetime: 2026-02-17
draft: false
---

正文
`
    );

    expect(parsed.data.title).toBe("Egglog 快速入门");
    expect(parsed.id).toBe("_language/egglog");
    expect(parsed.data.draft).toBe(false);
  });

  test("reads a Typst metadata block", () => {
    const parsed = parsePostSource(
      "_engineering/simple-cache.typ",
      `#metadata((
  title: "一种缓存",
  pubDatetime: "2025-06-04",
  draft: true,
))<frontmatter>
`
    );

    expect(parsed.data).toMatchObject({
      title: "一种缓存",
      draft: true,
    });
  });
});

describe("loadRecentPosts", () => {
  test("reads a directory and skips drafts", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "blog-posts-"));
    await mkdir(path.join(dir, "_math"));
    await writeFile(
      path.join(dir, "_math", "live.md"),
      `---
title: "已发布"
pubDatetime: 2026-01-02
---
`
    );
    await writeFile(
      path.join(dir, "_math", "draft.md"),
      `---
title: "草稿"
pubDatetime: 2026-08-01
draft: true
---
`
    );

    const posts = await loadRecentPosts({
      dir,
      now: Date.parse("2026-10-08T00:00:00Z"),
    });

    expect(posts).toEqual([
      {
        title: "已发布",
        href: "https://blog.zrr.dev/posts/live",
        date: "2026-01-02",
      },
    ]);
  });

  test("lists the repository's published posts without the draft", async () => {
    const posts = await loadRecentPosts({
      limit: 100,
      now: Date.parse("2026-10-08T00:00:00Z"),
    });

    expect(posts.length).toBeGreaterThan(0);
    for (const item of posts) {
      expect(item.href).toMatch(
        /^https:\/\/blog\.zrr\.dev\/posts\/[a-z0-9-]+$/
      );
      expect(item.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    expect(posts.map(item => item.title)).not.toContain(
      "一种针对主干网络的缓存机制的简单实现"
    );
  });
});
