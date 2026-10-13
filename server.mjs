import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.env.PORT ?? 4190);
const HOST = process.env.HOST ?? "127.0.0.1";
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

export function resolvePath(url) {
  const path = decodeURIComponent(new URL(url, "http://x").pathname);
  const file = normalize(join(ROOT, path.endsWith("/") ? `${path}index.html` : path));
  return file === ROOT.replace(/[\\/]$/, "") || file.startsWith(ROOT.endsWith(sep) ? ROOT : ROOT + sep) ? file : null;
}

const server = createServer(async (req, res) => {
  const file = resolvePath(req.url ?? "/");
  try {
    if (!file || /[\\/](\.git|node_modules|shots)([\\/]|$)/.test(file)) throw new Error("forbidden");
    if (!(await stat(file)).isFile()) throw new Error("not a file");
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream", "cache-control": "no-cache" });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    res.end("Не найдено");
  }
});

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) server.listen(PORT, HOST, () => console.log(`http://${HOST}:${PORT}`));
