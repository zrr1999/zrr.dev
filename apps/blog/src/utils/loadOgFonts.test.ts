import { Resvg } from "@resvg/resvg-js";
import satori from "satori";
import { afterEach, expect, test, vi } from "vite-plus/test";
import loadOgFonts from "./loadOgFonts";

afterEach(() => vi.unstubAllGlobals());

test("renders Latin and Chinese OG text without network access", async () => {
  const fetch = vi.fn(() => {
    throw new Error("Network access is unavailable");
  });
  vi.stubGlobal("fetch", fetch);
  const text = "六个骨头 — IBM Plex Mono 2026";
  const fonts = await loadOgFonts(text);

  for (const fontWeight of [400, 700]) {
    const svg = await satori(
      {
        type: "div",
        key: null,
        props: {
          style: {
            display: "flex",
            fontFamily: "IBM Plex Mono, Source Han Sans SC",
            fontSize: 32,
            fontWeight,
          },
          children: text,
        },
      },
      { width: 600, height: 120, fonts }
    );
    expect(svg).toContain("<path");
    const image = new Resvg(svg).render();
    expect([image.width, image.height]).toEqual([600, 120]);
    expect(image.asPng().subarray(1, 4).toString()).toBe("PNG");
  }

  expect(fetch).not.toHaveBeenCalled();
}, 30_000);
