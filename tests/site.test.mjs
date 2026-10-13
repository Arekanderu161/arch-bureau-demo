import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { LAYERS, AREA, follow, EXPLODE } from "../house/model.mjs";
import { resolvePath } from "../server.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(join(ROOT, file), "utf8");
const PAGES = ["index.html", "variant-a.html", "variant-b.html"];

test("все страницы на месте и названы бюро", () => {
  for (const page of PAGES) {
    const html = read(page);
    assert.match(html, /<html lang="ru"/);
    assert.match(html, /АДБ Проект-5/);
    assert.match(html, /name="viewport"/);
  }
});

test("локальные ссылки и ресурсы относительные и существуют", () => {
  for (const page of PAGES) {
    const html = read(page);
    for (const [, url] of html.matchAll(/(?:href|src|data-src)="([^"#]+)"/g)) {
      if (/^(https?:|mailto:|tel:)/.test(url)) continue;
      assert.ok(!url.startsWith("/"), `${page}: абсолютный путь ${url} сломает GitHub Pages`);
      const file = url.split("?")[0];
      assert.ok(existsSync(join(ROOT, file === "./" ? "index.html" : file)), `${page}: нет файла ${url}`);
    }
  }
});

test("варианты подключают свои скрипты, макет и переключатель темы", () => {
  for (const [page, script, theme] of [["variant-a.html", "scripts/a.js", "dark"], ["variant-b.html", "scripts/b.js", "light"]]) {
    const html = read(page);
    assert.match(html, new RegExp(`src="${script}"`));
    assert.match(html, /data-src="house\/house\.html\?ui=[01]"/);
    assert.match(html, /data-theme-toggle/);
    assert.match(html, new RegExp(`data-theme="${theme}"`));
  }
});

test("собранный макет дома самодостаточен и в бюджете", () => {
  const html = read("house/house.html");
  assert.ok(!/<script[^>]+src=/.test(html), "макет не должен грузить внешние скрипты");
  const data = html.match(/const DATA = (\{.*?\});\n/s);
  assert.ok(data, "нет данных фигуры");
  assert.ok(data[1].length < 250 * 1024, `данные фигуры ${data[1].length} байт`);
  for (const layer of LAYERS) assert.ok(html.includes(layer.title), `нет слоя ${layer.title}`);
  assert.match(html, /\.hx\[data-theme="light"\]/);
  assert.match(html, /data-theme="dark"/);
});

test("модель дома: слои, площадь и разбор", () => {
  assert.equal(LAYERS.length, 5);
  assert.equal(Math.round(AREA.total), 114);
  assert.deepEqual(follow({ yaw: 30, explode: 0 }), { yaw: 30, explode: 0, site: 30, g1: 0, g2: 0, g3: 0, g4: 0 });
  assert.equal(follow({ explode: 2 }).g4, EXPLODE);
  assert.equal(follow({ explode: -1 }).g1, 0);
});

test("сервер не выпускает за пределы проекта", () => {
  assert.ok(resolvePath("/variant-a.html").endsWith("variant-a.html"));
  assert.ok(resolvePath("/").endsWith("index.html"));
  for (const url of ["/../../secret.txt", "/%2e%2e/%2e%2e/secret.txt", "/..%5c..%5csecret.txt"]) {
    const file = resolvePath(url);
    assert.ok(file === null || file.startsWith(ROOT), `${url} -> ${file}`);
  }
});
