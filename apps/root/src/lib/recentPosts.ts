export interface Post {
  title: string;
  href: string;
  date: string;
}

const RSS_URL = "https://blog.zrr.dev/rss.xml";
const RSS_TIMEOUT_MS = 5000;

function unwrapCdata(value: string): string {
  return value
    .replace(/^<!\[CDATA\[/, "")
    .replace(/\]\]>$/, "")
    .trim();
}

function pickTag(item: string, tag: string): string {
  const raw =
    item.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1]?.trim() ?? "";
  return unwrapCdata(raw);
}

export function parseRss(xml: string, limit = 4): Post[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)]
    .slice(0, limit)
    .map(match => {
      const item = match[1] ?? "";
      const published = new Date(pickTag(item, "pubDate"));
      return {
        title: pickTag(item, "title"),
        href: pickTag(item, "link"),
        date: Number.isNaN(published.getTime())
          ? ""
          : published.toISOString().slice(0, 10),
      };
    })
    .filter(post => post.title && post.href);
}

/** 构建期读取博客 RSS；限时失败降级，页面仍保留博客入口。 */
export async function fetchRecentPosts(limit = 4): Promise<Post[]> {
  try {
    const response = await fetch(RSS_URL, {
      signal: AbortSignal.timeout(RSS_TIMEOUT_MS),
    });
    if (!response.ok) return [];
    return parseRss(await response.text(), limit);
  } catch {
    return [];
  }
}
