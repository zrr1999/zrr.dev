import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import type { Font } from "satori";
import subsetFont from "subset-font";

const require = createRequire(import.meta.url);
const fontPaths = [
  require.resolve("@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff"),
  require.resolve("@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-700-normal.woff"),
  require.resolve("@fontpkg/source-han-sans-sc/SourceHanSansSC-Regular.otf"),
  require.resolve("@fontpkg/source-han-sans-sc/SourceHanSansSC-Bold.otf"),
];

let fontSources: Promise<Buffer[]> | undefined;

export default async function loadOgFonts(text: string): Promise<Font[]> {
  const [regular, bold, chineseRegular, chineseBold] = await (fontSources ??=
    Promise.all(fontPaths.map(path => readFile(path))));
  const [regularSubset, boldSubset] = await Promise.all(
    [chineseRegular, chineseBold].map(source =>
      subsetFont(source, text, { targetFormat: "woff" })
    )
  );

  return [
    { name: "IBM Plex Mono", data: regular, weight: 400, style: "normal" },
    { name: "IBM Plex Mono", data: bold, weight: 700, style: "normal" },
    {
      name: "Source Han Sans SC",
      data: regularSubset,
      weight: 400,
      style: "normal",
    },
    {
      name: "Source Han Sans SC",
      data: boldSubset,
      weight: 700,
      style: "normal",
    },
  ];
}
