import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../kit/iso-kit.mjs";
import * as G from "../kit/lathe.mjs";
import * as A from "../kit/audit.mjs";
import { turning } from "../kit/turn-build.mjs";
import * as TA from "../kit/turn-audit.mjs";
import * as M from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const KIT = join(HERE, "..", "kit");
const argv = process.argv.slice(2);

const WIDTH = 760;
const HEIGHT = 760;
const AZIMUTH = 38;
const ELEVATION = 30;
const LAWN_R = 100;
const PODIUM_R = 104;
const PODIUM_Z = -12;
const TOP = M.UPPER.z1 + (M.UPPER.y1 + M.ROOF.overhang) * M.TAN + 4 + 4 * M.EXPLODE;

const reach = Array.from({ length: 48 }, (_, i) => [Math.cos((i / 48) * Math.PI * 2), Math.sin((i / 48) * Math.PI * 2)]);
export const P = k.fitProjection([...reach.map(([c, s]) => [c * PODIUM_R, s * PODIUM_R, PODIUM_Z]), ...reach.map(([c, s]) => [c * 76, s * 76, TOP])], WIDTH, HEIGHT, { pad: 18, azimuth: AZIMUTH, elevation: ELEVATION });
export const R = A.recorder(P);
const put = (item) => R.put({ ...item, shapes: item.shapes.map((shape, index) => R.solid(Object.assign(shape, { name: shape.name ?? (index ? `${item.name}#${index + 1}` : item.name) }))) });

function podium() {
  const side = k.cylinder(0, 0, PODIUM_R, PODIUM_Z, -2 - PODIUM_Z, P, 120);
  const lawn = k.cylinder(0, 0, LAWN_R, -2, 2, P, 120);
  const ticks = k.radialTicks(0, 0, PODIUM_R - 1.4, 72, 6, -2, [1.2, 2.6], P);
  const svg = `<path class="iso-halo" d="${k.haloOf({ x: -PODIUM_R, y: -PODIUM_R, w: 2 * PODIUM_R, d: 2 * PODIUM_R, r: PODIUM_R }, PODIUM_Z, 10, P)}" style="filter:blur(8px)"/>${k.solidSvg(side, { tone: "mid" })}${k.lineSvg(ticks, { tone: "lo" })}<g class="hx-lawn">${k.solidSvg(lawn, { tone: "hi", crease: "none" })}</g>`;
  put({ name: "podium", layer: "back", at: [0, 0, PODIUM_Z], svg, shapes: [A.cylinder(0, 0, PODIUM_R, PODIUM_Z, -2 - PODIUM_Z, { ground: true }), A.cylinder(0, 0, LAWN_R, -2, 2)] });
}

export const T = turning(P, { recorder: R });
const site = T.group("site", { turn: { pivot: [0, 0] } });
const lift = { direction: [0, 0, 1], travel: M.EXPLODE };
const g1 = T.group("g1", { parent: site, slide: lift });
const g2 = T.group("g2", { parent: g1, slide: lift });
const g3 = T.group("g3", { parent: g2, slide: lift });
const g4 = T.group("g4", { parent: g3, slide: lift });
const house = T.layer("house");
T.stack(["back", "house"]);
export const follow = M.follow;
export const poses = () => {
  const out = [];
  for (let yaw = 0; yaw < 360; yaw += 3) for (let e = 0; e <= 1.0001; e += 0.125) out.push(follow({ yaw, explode: e }));
  return out;
};

const UP = { o: [0, 0, 0], a: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] };
const box = (name, group, [x0, x1], [y0, y1], [z0, z1], extra = {}) =>
  T.prism({ name, group, layer: house, F: UP, polygon: [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], s0: z0, s1: z1, tone: "hi", crease: "lo", ...extra });

const fine = (v) => (Math.round(v * 1000) / 1000).toString();
const glazing = (rects, mull = 8) =>
  rects
    .map(([a0, a1, z0, z1]) => {
      const glass = `M${fine(a0)} ${fine(z0)}H${fine(a1)}V${fine(z1)}H${fine(a0)}Z`;
      const n = Math.max(1, Math.round((a1 - a0) / mull));
      const bars = Array.from({ length: n - 1 }, (_, i) => `M${fine(a0 + ((i + 1) * (a1 - a0)) / n)} ${fine(z0)}V${fine(z1)}`).join("");
      return `<path class="hx-glass" d="${glass}"/><path class="hx-glint" d="M${fine(a0 + 1)} ${fine(z1 - 1)}L${fine(a0 + Math.min(6, (a1 - a0) / 2))} ${fine(z1 - 1)}"/><path class="iso-line" data-tone="mid" d="${glass}${bars}"/>`;
    })
    .join("");
const windows = (part, o, u, normal, rects, mull) => T.plane({ part, o, u, v: [0, 0, 1], normal, svg: glazing(rects, mull), fade: [0.02, 0.22] });

function foundation() {
  const f = M.FOUNDATION;
  box("foundation", site, [f.x, f.x + f.w], [f.y, f.y + f.d], [f.z0, f.z1], { tone: "mid", crease: "lo", details: { seams: [1] } });
  const d = M.DECK;
  const deck = box("deck", site, [d.x0, d.x1], [d.y0, d.y1], [d.z0, d.z1], { material: "copper" });
  const boards = Array.from({ length: 13 }, (_, i) => `M${fine(1 + i * 2)} 0V${fine(d.y1 - d.y0)}`).join("");
  T.plane({ part: deck, o: [d.x0 + 1, d.y0, d.z1], u: [1, 0, 0], v: [0, 1, 0], normal: [0, 0, 1], svg: `<path class="iso-line" data-tone="lo" d="${boards}"/>` });
  for (const [x, y, h] of [[-66, 52, 40], [-38, 70, 30], [58, -58, 36]]) {
    T.round({ name: `tree.trunk.${x}`, group: site, layer: house, F: G.frameOf([x, y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]), s0: 0, s1: 8, r: 1.4, tone: "mid", material: "gunmetal" });
    T.round({ name: `tree.crown.${x}`, group: site, layer: house, F: G.frameOf([x, y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]), s0: 8, s1: 8 + h, r: [h * 0.32, 0.6], tone: "hi", crease: "lo", details: { seams: [8 + h * 0.35, 8 + h * 0.65] } });
  }
}

function shell(prefix, group, b, extra) {
  const t = M.WALL_T;
  const S = box(`${prefix}.wall.s`, group, [b.x0, b.x1], [b.y0, b.y0 + t], [b.z0, b.z1], extra);
  const N = box(`${prefix}.wall.n`, group, [b.x0, b.x1], [b.y1 - t, b.y1], [b.z0, b.z1], extra);
  const W = box(`${prefix}.wall.w`, group, [b.x0, b.x0 + t], [b.y0 + t, b.y1 - t], [b.z0, b.z1], extra);
  const E = box(`${prefix}.wall.e`, group, [b.x1 - t, b.x1], [b.y0 + t, b.y1 - t], [b.z0, b.z1], extra);
  box(`${prefix}.floor`, group, [b.x0 + t, b.x1 - t], [b.y0 + t, b.y1 - t], [b.z0, b.z0 + 1], { tone: "mid", material: "copper" });
  return { S, N, W, E };
}

function groundFloor() {
  const b = M.GROUND;
  const w = shell("g1", g1, b, { tone: "hi", crease: "lo", details: { seams: [b.z0 + 2] } });
  windows(w.S, [b.x0, b.y0, 0], [1, 0, 0], [0, -1, 0], [[10, 40, 8, 30], [48, 58, 6, 30], [70, 92, 14, 28]]);
  windows(w.N, [b.x1, b.y1, 0], [-1, 0, 0], [0, 1, 0], [[12, 26, 14, 28], [60, 70, 14, 28]]);
  windows(w.E, [b.x1, b.y0 + M.WALL_T, 0], [0, 1, 0], [1, 0, 0], [[10, 52, 6, 30]], 7);
  windows(w.W, [b.x0, b.y1 - M.WALL_T, 0], [0, -1, 0], [-1, 0, 0], [[22, 40, 14, 28]]);
  const f = b.z0 + 1;
  box("g1.partition", g1, [8, 10], [b.y0 + M.WALL_T, 8], [f, b.z1], { tone: "hi" });
  for (let i = 0; i < 10; i++) box(`g1.step.${i}`, g1, [-10 - 4 * i, -6 - 4 * i], [21, b.y1 - M.WALL_T], [f, f + (b.z1 - f) * ((i + 1) / 10)], { tone: "mid", material: "copper", details: { seams: [] } });
  box("g1.island", g1, [20, 34], [-6, 4], [f, f + 9], { tone: "hi", material: "steel" });
  box("g1.sofa.seat", g1, [-30, -12], [-24, -18], [f, f + 4.5], { tone: "mid", material: "gunmetal" });
  box("g1.sofa.back", g1, [-30, -12], [-27, -24], [f, f + 8], { tone: "mid", material: "gunmetal" });
}

function slab() {
  const s = M.SLAB;
  const part = box("g2.slab", g2, [s.x0, s.x1], [s.y0, s.y1], [s.z0, s.z1], { tone: "mid", crease: "lo", details: { seams: [s.z0 + 1.2] } });
  const loops = [];
  const x0 = M.UPPER.x0 + 7;
  const x1 = M.UPPER.x1 - 7;
  for (let i = 0, y = -28; y <= 28; i++, y += 4) loops.push(`${i ? "L" : "M"}${fine(i % 2 ? x1 : x0)} ${fine(y)}L${fine(i % 2 ? x0 : x1)} ${fine(y)}`);
  T.plane({ part, o: [0, 0, s.z1], u: [1, 0, 0], v: [0, 1, 0], normal: [0, 0, 1], svg: `<path class="hx-pipe" d="${loops.join("")}"/>`, fade: [0.02, 0.2] });
}

function upperFloor() {
  const b = M.UPPER;
  const w = shell("g3", g3, b, { tone: "hi", crease: "lo", material: "copper", details: { seams: [b.z0 + 9, b.z0 + 18] } });
  windows(w.S, [b.x0, b.y0, 0], [1, 0, 0], [0, -1, 0], [[8, 92, 41, 60]]);
  windows(w.N, [b.x1, b.y1, 0], [-1, 0, 0], [0, 1, 0], [[16, 40, 46, 58], [62, 74, 46, 58]]);
  windows(w.E, [b.x1, b.y0 + M.WALL_T, 0], [0, 1, 0], [1, 0, 0], [[6, 56, 40, 61]], 7);
  windows(w.W, [b.x0, b.y1 - M.WALL_T, 0], [0, -1, 0], [-1, 0, 0], [[8, 54, 38, 61]], 7);
  const f = b.z0 + 1;
  box("g3.partition", g3, [12, 14], [-8, b.y1 - M.WALL_T], [f, b.z1], { tone: "hi" });
  box("g3.bed", g3, [22, 42], [-22, -6], [f, f + 4], { tone: "hi", material: "steel" });
  box("g3.headboard", g3, [42, 44], [-22, -6], [f, f + 9], { tone: "mid", material: "gunmetal" });
  box("g3.wardrobe", g3, [-34, -20], [b.y1 - M.WALL_T - 6, b.y1 - M.WALL_T], [f, f + 21], { tone: "mid", material: "gunmetal" });
}

function roof() {
  const b = M.UPPER;
  const t = M.TAN;
  const half = b.y1;
  const ov = M.ROOF.overhang;
  const lift = M.ROOF.gap;
  const ridge = b.z1 + lift + half * t;
  const thick = M.ROOF.thick / Math.cos((M.ROOF.pitch * Math.PI) / 180);
  const ALONG_X = { o: [0, 0, 0], a: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1] };
  for (const [name, x0, x1] of [["w", b.x0, b.x0 + M.WALL_T], ["e", b.x1 - M.WALL_T, b.x1]]) T.prism({ name: `g4.gable.${name}`, group: g4, layer: house, F: ALONG_X, polygon: [[-half, b.z1], [half, b.z1], [half, b.z1 + lift - 0.25], [0, ridge - 0.25], [-half, b.z1 + lift - 0.25]], s0: x0, s1: x1, tone: "hi", crease: "lo", material: "copper" });
  const eave = b.z1 + lift - ov * t;
  const wt = M.WALL_T;
  for (const [name, y0, y1] of [["s", -half, -half + wt], ["n", half - wt, half]]) {
    const inner = y0 < 0 ? y1 : y0;
    const outer = y0 < 0 ? y0 : y1;
    const ring = [[outer, b.z1], [inner, b.z1], [inner, b.z1 + lift + wt * t], [outer, b.z1 + lift]];
    T.prism({ name: `g4.plate.${name}`, group: g4, layer: house, F: ALONG_X, polygon: y0 < 0 ? ring : ring.reverse(), s0: b.x0 + wt, s1: b.x1 - wt, tone: "mid", material: "copper" });
  }
  const south = T.prism({ name: "g4.roof.s", group: g4, layer: house, F: ALONG_X, polygon: [[-half - ov, eave], [0, ridge], [0, ridge + thick], [-half - ov, eave + thick]], s0: b.x0 - ov, s1: b.x1 + ov, tone: "hi", crease: "lo", material: "gunmetal" });
  T.prism({ name: "g4.roof.n", group: g4, layer: house, F: ALONG_X, polygon: [[0, ridge], [half + ov, eave], [half + ov, eave + thick], [0, ridge + thick]], s0: b.x0 - ov, s1: b.x1 + ov, tone: "hi", crease: "lo", material: "gunmetal" });
  const slope = (half + ov) / Math.cos((M.ROOF.pitch * Math.PI) / 180);
  const dir = [0, Math.cos((M.ROOF.pitch * Math.PI) / 180), Math.sin((M.ROOF.pitch * Math.PI) / 180)];
  const panels = [];
  const seams = [];
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 2; j++) {
      const a0 = 6 + i * 17;
      const s0 = 8 + j * 15;
      panels.push(`M${fine(a0)} ${fine(s0)}H${fine(a0 + 15)}V${fine(s0 + 13)}H${fine(a0)}Z`);
      for (let c = 1; c < 4; c++) seams.push(`M${fine(a0 + (c * 15) / 4)} ${fine(s0)}V${fine(s0 + 13)}`);
    }
  const n = [0, -Math.sin((M.ROOF.pitch * Math.PI) / 180), Math.cos((M.ROOF.pitch * Math.PI) / 180)];
  const standing = Array.from({ length: Math.floor((b.x1 - b.x0 + 2 * ov) / 4) - 1 }, (_, i) => `M${fine(4 + i * 4)} 0V${fine(slope)}`).join("");
  T.plane({ part: south, o: [b.x0 - ov, -half - ov, eave + thick], u: [1, 0, 0], v: dir, normal: n, svg: `<path class="iso-line" data-tone="lo" d="${standing}"/><path class="hx-solar" d="${panels.join("")}"/><path class="iso-line" data-tone="hi" d="${panels.join("")}${seams.join("")}"/>`, fade: [0.02, 0.22] });
}

podium();
foundation();
groundFloor();
slab();
upperFloor();
roof();

const out = T.build({ statics: R.items, poses });
A.settle(R, P);
if (argv.includes("--audit")) {
  A.auditOrExit(R, P);
  TA.orbitOrExit(T, R, P, {
    sweep: { at: (x) => follow({ yaw: x }), from: 0, to: 360, frame: 0.5 },
    clips: [{ name: "explode", at: (t) => follow({ yaw: 30 + 10 * t, explode: t }), from: 0, to: 1, frame: 1 / 60 }],
    quick: argv.includes("--quick"),
    only: argv.find((a) => a.startsWith("--only="))?.slice(7).split(",") ?? null,
  });
}

const layerOf = (name) => R.items.filter((item) => item.layer === name).sort((a, b) => a.key - b.key).map((item) => item.svg);
const LABEL = "Изометрический макет частного дома на круглом подиуме: фундаментная плита, первый этаж с гостиной и лестницей, перекрытие с тёплым полом, второй этаж в деревянной облицовке и двускатная кровля с солнечными панелями.";
const backSvg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: layerOf("back") });
const stage = `<div class="iso-stage iso-turn hx-stage" tabindex="0" role="slider" aria-label="Макет дома: перетащите, чтобы повернуть; стрелки вверх и вниз раскладывают дом на слои" aria-valuemin="0" aria-valuemax="359" aria-valuenow="0" aria-valuetext="поворот 0°">${backSvg}${out.layerSvg("house", { width: WIDTH, height: HEIGHT })}</div>`;

const strip = (file) => readFileSync(join(KIT, file), "utf8").replace(/^export /gm, "");
const DATA = { turn: out.data, layers: M.LAYERS, explode: M.EXPLODE, area: M.AREA.total };
const LIVE = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA)).replace("const follow = null;", `const follow = ${follow.toString()};`);
const CSS = k.ISO_CSS + out.css + readFileSync(join(HERE, "house.css"), "utf8");
const page = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>АДБ Проект-5 — анатомия дома</title><style>${CSS}</style></head><body class="iso hx" data-theme="dark"><main class="hx-main">${stage}<div class="hx-ui" data-ui><label class="hx-cut"><span>Разрез</span><input type="range" min="0" max="100" value="0" data-explode aria-label="Разобрать дом на слои"></label><output class="hx-readout" data-readout>0° · слои собраны</output></div></main><script>${strip("turn.mjs").replace(/<\/(script)/gi, "<\\/$1")}\n${LIVE.replace(/<\/(script)/gi, "<\\/$1")}</script></body></html>`;

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  writeFileSync(join(HERE, "house.html"), page);
  console.log(`wrote house.html · ${(page.length / 1024).toFixed(0)} KB · data ${(JSON.stringify(out.data).length / 1024).toFixed(0)} KB · ${out.report.parts} parts · ${out.report.layers.map((l) => `${l.name}: ${l.planar} planar, ${l.framed} framed, ${l.dynamic} dynamic`).join(" · ")} · build ${out.report.seconds.toFixed(1)} s`);
}
