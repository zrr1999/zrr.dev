/** Listing rules shared by the blog and the root homepage. */

export const BLOG_ORIGIN = "https://blog.zrr.dev";
export const SCHEDULED_POST_MARGIN_MS = 15 * 60 * 1000;
export const LISTING_TIMEZONE = "Asia/Shanghai";

export interface ListingData {
  title: string;
  pubDatetime: Date;
  modDatetime?: Date | null;
  draft?: boolean;
  timezone?: string;
}

export interface ListingPost {
  id: string;
  filePath?: string;
  data: ListingData;
}

export interface HomePost {
  title: string;
  href: string;
  date: string;
}

export function isListed(
  data: Pick<ListingData, "draft" | "pubDatetime">,
  options?: { now?: number; dev?: boolean; marginMs?: number }
): boolean {
  const now = options?.now ?? Date.now();
  const dev = options?.dev ?? false;
  const marginMs = options?.marginMs ?? SCHEDULED_POST_MARGIN_MS;
  const isPublishTimePassed = now > data.pubDatetime.getTime() - marginMs;
  return !data.draft && (dev || isPublishTimePassed);
}

/** Same ordering as the blog index: modified time when set, otherwise published. */
export function listingSortKey(data: ListingData): number {
  return Math.floor(
    new Date(data.modDatetime ?? data.pubDatetime).getTime() / 1000
  );
}

/** Date shown on a post: the later of published and modified, in the post timezone. */
export function listingDate(
  data: ListingData,
  timeZone = LISTING_TIMEZONE
): string {
  const modified = data.modDatetime ?? undefined;
  const latest =
    modified && modified > data.pubDatetime ? modified : data.pubDatetime;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: data.timezone || timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(latest);
}

function slugifySegment(segment: string): string {
  return segment
    .replace(/([a-z\d])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

/**
 * Blog post URL path. `_topic/` directories are author-side grouping and stay
 * out of the URL. `includeBase` false still keeps the leading slash, matching
 * the blog's existing `getPath`.
 */
export function postPath(
  id: string,
  filePath: string | undefined,
  includeBase = true
): string {
  const normalized = filePath?.replaceAll("\\", "/");
  const marker = "data/blog";
  const relative =
    normalized && normalized.includes(marker)
      ? normalized.slice(normalized.indexOf(marker) + marker.length)
      : (normalized ?? "");
  const pathSegments = relative
    .split("/")
    .filter(path => path !== "")
    .filter(path => !path.startsWith("_"))
    .slice(0, -1)
    .map(slugifySegment);

  const basePath = includeBase ? "/posts" : "";
  const blogId = id.split("/");
  const slug = blogId.length > 0 ? blogId.slice(-1) : blogId;

  if (pathSegments.length < 1) {
    return [basePath, slug].join("/");
  }

  return [basePath, ...pathSegments, slug].join("/");
}

export function selectRecentPosts(
  posts: ListingPost[],
  limit = 4,
  options?: { now?: number; dev?: boolean; origin?: string }
): HomePost[] {
  const origin = options?.origin ?? BLOG_ORIGIN;
  return posts
    .filter(post => isListed(post.data, options))
    .sort((a, b) => listingSortKey(b.data) - listingSortKey(a.data))
    .slice(0, limit)
    .map(post => ({
      title: post.data.title,
      href: `${origin}${postPath(post.id, post.filePath)}`,
      date: listingDate(post.data),
    }));
}
