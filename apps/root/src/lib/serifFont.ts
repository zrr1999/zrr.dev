const SERIF_FONT_ENDPOINT =
  "https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@500";

/** Headings drop the closing full stop; it hangs low-left in serif faces. */
export function stripTrailingPeriod(text: string): string {
  return text.replace(/[。.]$/, "");
}

export function uniqueChars(...texts: string[]): string {
  return [...new Set(texts.join("").replace(/\s/g, ""))].join("");
}

/** Google Fonts css2 URL for a Noto Serif SC 500 subset covering only `texts`. */
export function serifFontHref(...texts: string[]): string {
  const text = encodeURIComponent(uniqueChars(...texts));
  return `${SERIF_FONT_ENDPOINT}&text=${text}&display=swap`;
}
