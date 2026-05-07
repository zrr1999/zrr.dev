import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Repo root: sixbones.dev/ (parent of apps/) */
function resolveHostingSlidesDir() {
  const appRoot = __dirname;
  return path.join(path.resolve(appRoot, "..", ".."), "hosting", "slides");
}

function isPathInsideDir(filePath, dir) {
  const d = path.resolve(dir) + path.sep;
  const f = path.resolve(filePath);
  return f === path.resolve(dir) || f.startsWith(d);
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".ttf": "font/ttf",
    ".otf": "font/otf",
    ".wasm": "application/wasm",
    ".txt": "text/plain; charset=utf-8",
  };
  return map[ext] ?? "application/octet-stream";
}

/**
 * After static output is written, copy ../../hosting/slides into the output dir
 * as ./slides. Listed before PWA so precache can see the files.
 */
export function hostingSlidesCopyIntegration() {
  const sourceDir = resolveHostingSlidesDir();
  return {
    name: "hosting-slides-copy",
    hooks: {
      "astro:build:done": ({ dir }) => {
        if (!fs.existsSync(sourceDir)) {
          throw new Error(
            `[hosting-slides-copy] Slides source not found: ${sourceDir}`
          );
        }
        const outDir = fileURLToPath(dir);
        const dest = path.join(outDir, "slides");
        fs.rmSync(dest, { recursive: true, force: true });
        fs.cpSync(sourceDir, dest, { recursive: true });
      },
    },
  };
}

/**
 * Dev: serve /slides/* from ../../hosting/slides (no public/slides symlink).
 */
export function hostingSlidesPublicPlugin() {
  const sourceDir = resolveHostingSlidesDir();

  return {
    name: "hosting-slides-public",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const method = req.method ?? "GET";
        if (method !== "GET" && method !== "HEAD") {
          next();
          return;
        }

        let url = req.url ?? "";
        const q = url.indexOf("?");
        if (q !== -1) url = url.slice(0, q);
        if (!url.startsWith("/slides/")) {
          next();
          return;
        }

        let rel = "";
        try {
          rel = decodeURIComponent(url.slice("/slides/".length));
        } catch {
          next();
          return;
        }
        if (rel.includes("\0")) {
          next();
          return;
        }

        rel = path.normalize(rel);
        const abs = path.join(sourceDir, rel);
        if (!isPathInsideDir(abs, sourceDir)) {
          next();
          return;
        }

        fs.stat(abs, (err, st) => {
          if (err || !st.isFile()) {
            next();
            return;
          }
          res.setHeader("Content-Type", contentType(abs));
          if (method === "HEAD") {
            res.end();
            return;
          }
          void pipeline(fs.createReadStream(abs), res).catch(() => {
            if (!res.headersSent) {
              res.statusCode = 500;
              res.end();
            } else if (!res.writableEnded) {
              res.destroy();
            }
          });
        });
      });
    },
  };
}
