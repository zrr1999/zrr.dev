import { describe, expect, test } from "vite-plus/test";
import { serifFontHref, stripTrailingPeriod, uniqueChars } from "./serifFont";

describe("uniqueChars", () => {
  test("de-duplicates and drops whitespace", () => {
    expect(uniqueChars("关于关 于", "于。")).toBe("关于。");
  });
});

describe("stripTrailingPeriod", () => {
  test("drops only a final full stop", () => {
    expect(stripTrailingPeriod("改进。")).toBe("改进");
    expect(stripTrailingPeriod("a。b")).toBe("a。b");
    expect(stripTrailingPeriod("done.")).toBe("done");
  });
});

describe("serifFontHref", () => {
  test("requests one weight with an encoded text subset", () => {
    const url = new URL(serifFontHref("友链友", "，。"));
    expect(url.origin).toBe("https://fonts.googleapis.com");
    expect(url.searchParams.get("family")).toBe("Noto Serif SC:wght@500");
    expect(url.searchParams.get("text")).toBe("友链，。");
    expect(url.searchParams.getAll("text")).toHaveLength(1);
    expect(url.searchParams.get("display")).toBe("swap");
  });
});
