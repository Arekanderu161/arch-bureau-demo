export const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const KEY = "adb-theme";
const root = document.documentElement;

export function initTheme(fallback) {
  let saved = new URLSearchParams(location.search).get("theme");
  try {
    saved ??= localStorage.getItem(KEY);
  } catch {}
  apply(saved === "light" || saved === "dark" ? saved : fallback);
  for (const button of document.querySelectorAll("[data-theme-toggle]"))
    button.addEventListener("click", () => {
      const next = theme() === "dark" ? "light" : "dark";
      apply(next);
      try {
        localStorage.setItem(KEY, next);
      } catch {}
    });
}
export const theme = () => (root.dataset.theme === "light" ? "light" : "dark");
function apply(next) {
  root.dataset.theme = next;
  for (const button of document.querySelectorAll("[data-theme-toggle]")) {
    button.setAttribute("aria-pressed", String(next === "light"));
    button.setAttribute("aria-label", next === "dark" ? "Включить светлую тему" : "Включить тёмную тему");
  }
  window.dispatchEvent(new CustomEvent("themechange", { detail: next }));
}

export function splitWords(element) {
  const words = element.textContent.trim().split(/\s+/);
  element.setAttribute("aria-label", element.textContent.trim());
  element.innerHTML = words.map((word, i) => `<span class="word" aria-hidden="true" style="--i:${i}"><span>${word}</span></span>`).join(" ");
  return [...element.querySelectorAll(".word")];
}

export function reveal(selector = "[data-reveal]") {
  const items = document.querySelectorAll(selector);
  if (!("IntersectionObserver" in window)) return items.forEach((el) => el.classList.add("is-in"));
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries)
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
    },
    { rootMargin: "0px 0px -12% 0px" },
  );
  items.forEach((el) => io.observe(el));
}

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const smooth = (a, b, v) => {
  const t = clamp((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};
export function progressOf(element) {
  const box = element.getBoundingClientRect();
  const span = box.height - innerHeight;
  return span > 0 ? clamp(-box.top / span) : clamp(1 - box.bottom / (innerHeight + box.height));
}

const loops = new Set();
let ticking = 0;
const pump = () => {
  ticking = 0;
  for (const fn of loops) fn();
};
const kick = () => {
  if (!ticking) ticking = requestAnimationFrame(pump);
};
addEventListener("scroll", kick, { passive: true });
addEventListener("resize", kick);
export function onScroll(fn) {
  loops.add(fn);
  kick();
  return () => loops.delete(fn);
}

export class House {
  constructor(frame) {
    this.frame = frame;
    this.ready = false;
    this.queue = {};
    this.listeners = new Set();
    frame.src = `${frame.dataset.src}${frame.dataset.src.includes("?") ? "&" : "?"}theme=${theme()}`;
    addEventListener("message", (event) => {
      if (event.source !== frame.contentWindow || !event.data) return;
      if (event.data.type === "hx:ready") {
        this.ready = true;
        this.post({ theme: theme(), ...this.queue });
        this.queue = {};
      }
      if (event.data.type === "hx:state") for (const fn of this.listeners) fn(event.data);
    });
    addEventListener("themechange", (event) => this.set({ theme: event.detail }));
  }
  post(values) {
    this.frame.contentWindow?.postMessage({ type: "hx:set", ...values }, "*");
  }
  set(values) {
    if (this.ready) this.post(values);
    else Object.assign(this.queue, values);
  }
  onState(fn) {
    this.listeners.add(fn);
  }
}

export function counters(selector = "[data-count]") {
  const run = (el) => {
    const to = Number(el.dataset.count);
    const digits = Number(el.dataset.digits ?? 0);
    const start = performance.now();
    const step = (now) => {
      const t = reduced.matches ? 1 : clamp((now - start) / 1400);
      el.textContent = (to * (1 - Math.pow(1 - t, 3))).toFixed(digits).replace(".", ",");
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries)
      if (entry.isIntersecting) {
        run(entry.target);
        io.unobserve(entry.target);
      }
  });
  document.querySelectorAll(selector).forEach((el) => io.observe(el));
}

export function glCanvas(canvas, fragment, { scale = 1, uniforms = [] } = {}) {
  const gl = canvas.getContext("webgl", { antialias: false, premultipliedAlpha: false, alpha: true, powerPreference: "high-performance" });
  if (!gl) return null;
  const compile = (type, src) => {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  };
  const program = gl.createProgram();
  try {
    gl.attachShader(program, compile(gl.VERTEX_SHADER, "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}"));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  } catch (error) {
    console.warn("WebGL недоступен, включён CSS-фон:", error.message);
    return null;
  }
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(program, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = Object.fromEntries(["uRes", "uTime", ...uniforms].map((name) => [name, gl.getUniformLocation(program, name)]));
  let ratio = scale;
  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2) * ratio;
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
    }
  };
  return {
    gl,
    u,
    base: scale,
    setScale(next) {
      ratio = next;
    },
    draw(time, set) {
      resize();
      gl.uniform2f(u.uRes, canvas.width, canvas.height);
      gl.uniform1f(u.uTime, time);
      set?.(gl, u);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}

export function animate(canvas, layer, set) {
  let visible = true;
  let frame = 0;
  let avg = 16;
  let last = 0;
  let scale = 1;
  const start = performance.now();
  const loop = (now) => {
    const dt = last ? now - last : 16;
    last = now;
    avg = avg * 0.92 + dt * 0.08;
    if (avg > 28 && scale > 0.45) {
      scale = Math.max(0.45, scale - 0.1);
      layer.setScale(layer.base * scale);
      avg = 16;
    }
    layer.draw(reduced.matches ? 4 : (now - start) / 1000, set);
    frame = visible && !reduced.matches ? requestAnimationFrame(loop) : 0;
  };
  new IntersectionObserver((entries) => {
    visible = entries[entries.length - 1].isIntersecting;
    if (visible && !frame) {
      last = 0;
      frame = requestAnimationFrame(loop);
    }
  }).observe(canvas);
  addEventListener("themechange", () => !frame && requestAnimationFrame(loop));
  addEventListener("resize", () => !frame && requestAnimationFrame(loop));
  frame = requestAnimationFrame(loop);
}
