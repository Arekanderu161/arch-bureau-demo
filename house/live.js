const DATA = __DATA__;
const follow = null;
const params = new URLSearchParams(location.search);
const root = document.body;
const stage = document.querySelector(".hx-stage");
const slider = document.querySelector("[data-explode]");
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");
const embedded = window.parent !== window;
const SPEED = 7;
let yaw = Number(params.get("yaw") ?? -18);
let target = yaw;
let explode = Number(params.get("explode") ?? 0);
let explodeTarget = explode;
let spin = 0;
let touring = !still.matches && params.get("tour") !== "0";
let idle = 0;
let frame = 0;
let last = 0;
let visible = true;
let drawn = null;
let sent = "";

const setTheme = (theme) => root.setAttribute("data-theme", theme === "light" ? "light" : "dark");
setTheme(params.get("theme") ?? (embedded ? "dark" : matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark"));
if (params.get("ui") === "0") root.setAttribute("data-ui", "0");
if (!embedded) root.setAttribute("data-standalone", "");

const layerOf = (e) => (e < 0.04 ? null : DATA.layers[Math.min(DATA.layers.length - 1, Math.round(e * (DATA.layers.length - 1)))]);
const norm = (deg) => ((Math.round(deg) % 360) + 360) % 360;
const describe = () => {
  const deg = norm(target);
  stage.setAttribute("aria-valuenow", String(deg));
  stage.setAttribute("aria-valuetext", `поворот ${deg}°, разрез ${Math.round(explodeTarget * 100)}%`);
};
const show = () => {
  const pct = Math.round(explode * 100);
  const text = `${String(norm(yaw)).padStart(3, "\u2007")}° · ${pct < 2 ? "слои собраны" : `разрез ${pct}% · ${(DATA.explode * explode * 0.1).toFixed(1)} м`}`;
  if (readout.textContent !== text) readout.textContent = text;
  if (slider && document.activeElement !== slider) slider.value = String(Math.round(explodeTarget * 100));
  const state = JSON.stringify({ yaw: norm(yaw), explode: Math.round(explode * 1000) / 1000 });
  if (embedded && state !== sent) {
    sent = state;
    window.parent.postMessage({ type: "hx:state", yaw: norm(yaw), explode, layer: layerOf(explode)?.id ?? null }, "*");
  }
};
const hold = () => {
  touring = false;
  clearTimeout(idle);
  idle = setTimeout(() => {
    touring = !still.matches && params.get("tour") !== "0";
    run();
  }, 4200);
};

const controller = TURN.mount(stage, DATA.turn, { follow, onHold: () => (touring = false) });
const draw = () => {
  controller.set({ yaw, explode });
  const rest = 1 - explode;
  stage.style.transform = `translateY(${(-13 * rest).toFixed(2)}%) scale(${(1 + 0.16 * rest).toFixed(4)})`;
  drawn = yaw + 1000 * explode;
  show();
};
function tick(now) {
  const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
  last = now;
  const calm = still.matches;
  if (touring && !calm) target += SPEED * dt;
  if (Math.abs(spin) > 0.5) {
    target += spin * dt;
    spin *= Math.exp(-dt / 0.45);
  } else spin = 0;
  yaw = calm ? target : yaw + (target - yaw) * (1 - Math.exp(-dt / 0.14));
  if (Math.abs(target - yaw) < 1e-3) yaw = target;
  explode = calm ? explodeTarget : explode + (explodeTarget - explode) * (1 - Math.exp(-dt / 0.2));
  if (Math.abs(explodeTarget - explode) < 1e-4) explode = explodeTarget;
  if (drawn === null || Math.abs(yaw + 1000 * explode - drawn) > 1e-4) draw();
  const settled = !touring && !spin && yaw === target && explode === explodeTarget;
  frame = visible && !settled ? requestAnimationFrame(tick) : 0;
}
const run = () => {
  if (!frame && visible) {
    last = 0;
    frame = requestAnimationFrame(tick);
  }
};
new IntersectionObserver((entries) => {
  visible = entries[entries.length - 1].isIntersecting;
  if (visible) run();
  else if (frame) {
    cancelAnimationFrame(frame);
    frame = 0;
  }
}).observe(stage);
document.addEventListener("visibilitychange", () => {
  visible = !document.hidden;
  if (visible) run();
});

let drag = null;
stage.addEventListener("pointerdown", (event) => {
  hold();
  spin = 0;
  drag = { x: event.clientX, base: target, id: event.pointerId, captured: false, t: performance.now(), v: 0, lx: event.clientX };
});
stage.addEventListener("pointermove", (event) => {
  if (!drag || event.pointerId !== drag.id) return;
  const dx = event.clientX - drag.x;
  if (!drag.captured && Math.abs(dx) > 3) {
    drag.captured = true;
    stage.setPointerCapture(event.pointerId);
    stage.setAttribute("data-drag", "");
  }
  if (!drag.captured) return;
  hold();
  const k = 360 / Math.max(320, stage.clientWidth);
  const now = performance.now();
  const dt = Math.max(1, now - drag.t) / 1000;
  drag.v = 0.7 * drag.v + 0.3 * ((-(event.clientX - drag.lx) * k) / dt);
  drag.t = now;
  drag.lx = event.clientX;
  target = drag.base - dx * k;
  describe();
  run();
});
const release = (event) => {
  if (!drag || event.pointerId !== drag.id) return;
  if (drag.captured && performance.now() - drag.t < 80 && !still.matches) spin = Math.max(-540, Math.min(540, drag.v));
  drag = null;
  stage.removeAttribute("data-drag");
  try {
    stage.releasePointerCapture(event.pointerId);
  } catch {}
  run();
};
stage.addEventListener("pointerup", release);
stage.addEventListener("pointercancel", release);
const setExplode = (value) => {
  explodeTarget = Math.min(1, Math.max(0, Number(value) || 0));
  describe();
  run();
};
stage.addEventListener("keydown", (event) => {
  const step = event.shiftKey ? 45 : 15;
  if (event.key === "ArrowLeft") target += step;
  else if (event.key === "ArrowRight") target -= step;
  else if (event.key === "ArrowUp" || event.key === "PageUp") setExplode(explodeTarget + 0.25);
  else if (event.key === "ArrowDown" || event.key === "PageDown") setExplode(explodeTarget - 0.25);
  else if (event.key === "Home") {
    target = -18 + 360 * Math.round((target + 18) / 360);
    setExplode(0);
  } else return;
  event.preventDefault();
  hold();
  describe();
  run();
});
slider?.addEventListener("input", () => {
  hold();
  setExplode(Number(slider.value) / 100);
});
window.addEventListener("message", (event) => {
  const d = event.data;
  if (!d || d.type !== "hx:set") return;
  if ("theme" in d) setTheme(d.theme);
  if ("explode" in d) setExplode(d.explode);
  if ("yaw" in d) {
    target = Number(d.yaw);
    hold();
  }
  if ("tour" in d) touring = Boolean(d.tour) && !still.matches;
  if (d.jump || !visible) {
    yaw = target;
    explode = explodeTarget;
    draw();
  }
  run();
});
window.__hx = {
  controller,
  get: () => ({ yaw, explode, target, explodeTarget, theme: root.getAttribute("data-theme") }),
  set: (values) => window.postMessage({ type: "hx:set", ...values, jump: true }, "*"),
};
draw();
describe();
run();
if (embedded) window.parent.postMessage({ type: "hx:ready" }, "*");
