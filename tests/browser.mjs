// Браузерные проверки (нужны Chrome и запущенный server.mjs): node tests/browser.mjs [base-url]
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = (process.argv[2] ?? "http://127.0.0.1:4190").replace(/\/$/, "");
const assert = "const assert = (ok, text) => { if (!ok) throw new Error(text); };";
const wait = "const sleep = (ms) => new Promise((r) => setTimeout(r, ms));";
const noOverflow = `["eval", "(() => { ${assert} assert(document.documentElement.scrollWidth <= innerWidth + 1, 'horizontal overflow ' + document.documentElement.scrollWidth); return 'no overflow'; })()"]`;
const houseReady = (frame) => `["until", "${frame}?.contentWindow?.__hx && ${frame}.contentWindow.__hx.get()", 20000]`;
const themeCheck = (frame) =>
  `["eval", "(async () => { ${assert} ${wait} const before = document.documentElement.dataset.theme; document.querySelector('[data-theme-toggle]').click(); await sleep(400); const after = document.documentElement.dataset.theme; assert(after !== before, 'theme did not toggle'); assert(${frame}.contentWindow.__hx.get().theme === after, 'iframe theme not synced'); document.querySelector('[data-theme-toggle]').click(); await sleep(200); return before + ' -> ' + after; })()"]`;

const SUITES = {
  house: {
    url: "/house/house.html?tour=0",
    actions: `[
      ["until", "window.__hx", 15000],
      ["eval", "(async () => { ${assert} ${wait} const y0 = __hx.get().target; const s = document.querySelector('.hx-stage'); const r = s.getBoundingClientRect(); const ev = (type, x) => s.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 1, clientX: x, clientY: r.top + r.height / 2 })); ev('pointerdown', r.left + 100); for (let i = 1; i <= 10; i++) { ev('pointermove', r.left + 100 + i * 20); await sleep(16); } ev('pointerup', r.left + 300); await sleep(100); assert(Math.abs(__hx.get().target - y0) > 30, 'drag did not turn the house'); s.focus(); s.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })); await sleep(900); assert(__hx.get().explode > 0.2, 'ArrowUp did not explode'); const slider = document.querySelector('[data-explode]'); slider.value = '100'; slider.dispatchEvent(new Event('input')); await sleep(1500); assert(__hx.get().explode > 0.95, 'slider did not explode'); assert(/разрез/.test(document.querySelector('[data-readout]').textContent), 'readout'); return 'drag, keys, slider ok'; })()"],
      ${noOverflow}
    ]`,
  },
  "variant-a": {
    url: "/variant-a.html",
    actions: `[
      ${houseReady("document.querySelector('[data-house]')")},
      ${themeCheck("document.querySelector('[data-house]')")},
      ["eval", "(async () => { ${assert} ${wait} const a = document.querySelector('[data-anatomy]'); scrollTo({ top: a.offsetTop + (a.offsetHeight - innerHeight) * 0.95, behavior: 'instant' }); await sleep(2200); const st = document.querySelector('[data-house]').contentWindow.__hx.get(); assert(st.explodeTarget > 0.95, 'scroll did not explode: ' + st.explodeTarget); assert(document.querySelector('.layers li.is-active'), 'no active layer'); scrollTo({ top: a.offsetTop, behavior: 'instant' }); await sleep(800); assert(document.querySelector('[data-house]').contentWindow.__hx.get().explodeTarget < 0.05, 'scroll back did not assemble'); return 'anatomy scroll ok'; })()"],
      ["eval", "(async () => { ${assert} ${wait} const f = document.querySelector('[data-form]'); f.querySelector('[name=name]').value = 'Тест'; f.querySelector('[name=contact]').value = 'a@b.c'; f.requestSubmit(); await sleep(50); assert(/демо/.test(f.querySelector('[data-form-note]').textContent), 'form note'); return 'form ok'; })()"],
      ${noOverflow}
    ]`,
  },
  "variant-b": {
    url: "/variant-b.html",
    actions: `[
      ["scroll", ".anatomy-board"],
      ${houseReady("document.querySelector('[data-house]')")},
      ${themeCheck("document.querySelector('[data-house]')")},
      ["eval", "(async () => { ${assert} ${wait} const li = document.querySelectorAll('[data-layer]')[4]; li.click(); await sleep(1800); const st = document.querySelector('[data-house]').contentWindow.__hx.get(); assert(st.explodeTarget === 1, 'callout did not set explode'); assert(li.classList.contains('is-active'), 'callout not highlighted'); return 'callouts ok'; })()"],
      ["eval", "(async () => { ${assert} ${wait} const c = document.querySelector('.slide.is-current'); document.querySelector('[data-next]').click(); await sleep(100); assert(document.querySelector('.slide.is-current') !== c, 'carousel did not move'); return 'carousel ok'; })()"],
      ["eval", "(async () => { ${assert} ${wait} const g = document.querySelector('[data-gallery]'); scrollTo({ top: g.offsetTop + (g.offsetHeight - innerHeight) * 0.8, behavior: 'instant' }); await sleep(300); const t = getComputedStyle(document.querySelector('[data-track]')).transform; assert(t !== 'none' && new DOMMatrix(t).m41 < -50, 'gallery did not slide: ' + t); return 'gallery ok'; })()"],
      ${noOverflow}
    ]`,
  },
};
const FALLBACK = `[["until", "document.querySelector('.hero').hasAttribute('data-gl-off') && !document.querySelector('.hero').hasAttribute('data-gl')", 15000], ["eval", "'fallback ok'"]]`;

let failed = 0;
const run = (name, url, actions, extra = []) => {
  const file = join(tmpdir(), `adb-${name}-${process.pid}.json`);
  writeFileSync(file, actions);
  const out = spawnSync(process.execPath, ["tools/drive.mjs", BASE + url, "--actions", file, ...extra], { encoding: "utf8" });
  const text = `${out.stdout}${out.stderr}`;
  const ok = out.status === 0 && /console: clean/.test(text);
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name} ${extra.join(" ")}\n${text.trim().replace(/^/gm, "     ")}`);
};
for (const [width, height] of [[1440, 900], [390, 844]])
  for (const [name, suite] of Object.entries(SUITES)) run(name, suite.url, suite.actions, ["--width", String(width), "--height", String(height)]);
for (const page of ["variant-a.html", "variant-b.html"]) run(`${page} без WebGL`, `/${page}`, FALLBACK, ["--no-webgl"]);
run("variant-a reduced motion", "/variant-a.html", `[${noOverflow}]`, ["--reduced"]);
console.log(failed ? `\n${failed} проверок не прошли` : "\nвсе браузерные проверки прошли");
process.exit(failed ? 1 : 0);
