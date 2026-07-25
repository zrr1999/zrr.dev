/** Shared site identity for zrr.dev apps. */

export const SITE_AUTHOR = "Zhan Rongrui";

export const COPYRIGHT_FROM_YEAR = 2024;

/** Unified webfonts: mono (blog/slides) + sans/display (root / headings). */
export const SITE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,600;1,400&family=Noto+Sans+SC:wght@400;500;600&family=Space+Grotesk:wght@500;600;700&display=swap";

export function copyrightText(year: number = new Date().getFullYear()): string {
  return `© ${COPYRIGHT_FROM_YEAR}-${year} ${SITE_AUTHOR}`;
}
