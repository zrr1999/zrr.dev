import { describe, expect, test } from "vite-plus/test";
import { parseRss } from "./recentPosts";

function item(fields: {
  title?: string;
  link?: string;
  pubDate?: string;
}): string {
  const title =
    fields.title === undefined
      ? "<title>A post</title>"
      : `<title>${fields.title}</title>`;
  const link =
    fields.link === undefined
      ? "<link>https://blog.zrr.dev/posts/a</link>"
      : `<link>${fields.link}</link>`;
  const pubDate =
    fields.pubDate === undefined
      ? "<pubDate>Mon, 07 Sep 2026 00:00:00 GMT</pubDate>"
      : `<pubDate>${fields.pubDate}</pubDate>`;
  return `<item>${title}${link}${pubDate}</item>`;
}

function feed(...items: string[]): string {
  return `<?xml version="1.0"?><rss><channel>${items.join("")}</channel></rss>`;
}

describe("parseRss", () => {
  test("reads title, link, and date from items", () => {
    const posts = parseRss(
      feed(
        item({
          title: "有理分式分解的一种快捷方法",
          link: "https://blog.zrr.dev/posts/partial-fractions",
          pubDate: "Mon, 07 Sep 2026 12:00:00 GMT",
        })
      )
    );

    expect(posts).toEqual([
      {
        title: "有理分式分解的一种快捷方法",
        href: "https://blog.zrr.dev/posts/partial-fractions",
        date: "2026-09-07",
      },
    ]);
  });

  test("unwraps CDATA in title and link", () => {
    const posts = parseRss(
      feed(
        item({
          title: "<![CDATA[Egglog 快速入门]]>",
          link: "<![CDATA[https://blog.zrr.dev/posts/egglog]]>",
        })
      )
    );

    expect(posts[0]?.title).toBe("Egglog 快速入门");
    expect(posts[0]?.href).toBe("https://blog.zrr.dev/posts/egglog");
  });

  test("honors the item limit", () => {
    const posts = parseRss(
      feed(
        item({ title: "one", link: "https://blog.zrr.dev/1" }),
        item({ title: "two", link: "https://blog.zrr.dev/2" }),
        item({ title: "three", link: "https://blog.zrr.dev/3" })
      ),
      2
    );

    expect(posts.map(post => post.title)).toEqual(["one", "two"]);
  });

  test("drops items missing title or link", () => {
    const posts = parseRss(
      feed(
        item({ title: "", link: "https://blog.zrr.dev/empty-title" }),
        item({ title: "no link", link: "" }),
        item({ title: "ok", link: "https://blog.zrr.dev/ok" })
      )
    );

    expect(posts).toEqual([
      {
        title: "ok",
        href: "https://blog.zrr.dev/ok",
        date: "2026-09-07",
      },
    ]);
  });

  test("keeps items with invalid dates and leaves date empty", () => {
    const posts = parseRss(
      feed(
        item({
          title: "undated",
          link: "https://blog.zrr.dev/undated",
          pubDate: "not-a-date",
        })
      )
    );

    expect(posts).toEqual([
      {
        title: "undated",
        href: "https://blog.zrr.dev/undated",
        date: "",
      },
    ]);
  });

  test("returns an empty list for a feed with no items", () => {
    expect(parseRss(feed())).toEqual([]);
  });
});
