// Снимает экран (viewport) в нескольких точках прокрутки: node tests/viewport-shots.mjs <url> <prefix> [width] [height]
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const [url, prefix, width = "1440", height = "900"] = process.argv.slice(2);
const targets = [
  ["hero", "0"],
  ["anatomy", "document.querySelector('#anatomy').offsetTop + Math.max(0, document.querySelector('#anatomy').offsetHeight - innerHeight) * 0.55"],
  ["projects", "document.querySelector('#projects').offsetTop + Math.max(0, document.querySelector('#projects').offsetHeight - innerHeight) * 0.5 + (document.querySelector('[data-stack]') ? innerHeight * 1.4 : 0)"],
  ["process", "(document.querySelector('#process') || document.querySelector('#services')).offsetTop + 200"],
  ["numbers", "(document.querySelector('.numbers') || document.querySelector('#process')).offsetTop + 200"],
  ["contact", "document.body.scrollHeight"],
];
const actions = [["eval", "(() => { const d = document.createElement('div'); d.id = 'vp'; d.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:-1'; document.body.append(d); return 'ok'; })()"]];
for (const [name, y] of targets) actions.push(["eval", `(() => { scrollTo({ top: ${y}, behavior: \"instant\" }); return scrollY; })()`], ["wait", 1600], ["shot", `shots/${prefix}-${name}.png`, "@viewport", 1]);
mkdirSync("shots", { recursive: true });
const file = join(tmpdir(), `vp-${process.pid}.json`);
writeFileSync(file, JSON.stringify(actions));
const run = spawnSync(process.execPath, ["tools/drive.mjs", url, "--actions", file, "--width", width, "--height", height], { stdio: "inherit" });
process.exit(run.status ?? 1);
