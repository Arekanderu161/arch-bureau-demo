// Генеративные «рендеры» для карточек демо-проектов: только SVG и CSS-переменные, без фото.
const DX = 0.62;
const DY = -0.36;

function box(x, y, w, h, d, { windows = null, roof = null, tone = "a" } = {}) {
  const ox = d * DX;
  const oy = d * DY;
  const out = [];
  out.push(`<path class="art-side art-${tone}" d="M${x + w} ${y}l${ox} ${oy}v${h}l${-ox} ${-oy}z"/>`);
  out.push(`<rect class="art-front art-${tone}" x="${x}" y="${y}" width="${w}" height="${h}"/>`);
  if (roof === "gable") {
    const peak = Math.min(w * 0.42, 60);
    out.push(`<path class="art-roof" d="M${x - 4} ${y}L${x + w / 2} ${y - peak}L${x + w + 4} ${y}Z"/>`);
    out.push(`<path class="art-roof-side" d="M${x + w / 2} ${y - peak}l${ox} ${oy}L${x + w + 4 + ox} ${y + oy}L${x + w + 4} ${y}Z"/>`);
  } else out.push(`<path class="art-top art-${tone}" d="M${x} ${y}l${ox} ${oy}h${w}l${-ox} ${-oy}z"/>`);
  if (windows) {
    const [cols, rows, pad = 6] = windows;
    const cw = (w - pad * (cols + 1)) / cols;
    const rh = (h - pad * (rows + 1)) / rows;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) out.push(`<rect class="art-win" x="${(x + pad + c * (cw + pad)).toFixed(1)}" y="${(y + pad + r * (rh + pad)).toFixed(1)}" width="${cw.toFixed(1)}" height="${rh.toFixed(1)}"/>`);
  }
  return out.join("");
}
const shadow = (x, y, w, d) => `<path class="art-shadow" d="M${x} ${y}h${w}l${d * 1.4} ${d * 0.25}h${-w}z"/>`;

const SCENES = {
  house: () => shadow(110, 230, 170, 60) + box(110, 150, 170, 80, 70, { windows: [4, 1, 10], roof: "gable" }) + box(250, 190, 70, 40, 50, { windows: [2, 1, 8], tone: "b" }),
  tower: () => shadow(160, 250, 80, 90) + box(160, 50, 80, 200, 60, { windows: [3, 9, 5] }) + box(110, 190, 50, 60, 60, { windows: [2, 2, 6], tone: "b" }),
  pavilion: () => {
    let cols = "";
    for (let i = 0; i < 7; i++) cols += `<rect class="art-col" x="${92 + i * 36}" y="168" width="4" height="62"/>`;
    return shadow(80, 232, 240, 70) + `<path class="art-glass" d="M96 170h220v60H96z"/>` + cols + box(70, 156, 260, 12, 90, { tone: "b" });
  },
  terrace: () => shadow(90, 240, 220, 70) + box(90, 200, 220, 40, 80, { windows: [6, 1, 7] }) + box(120, 160, 160, 40, 70, { windows: [4, 1, 7], tone: "b" }) + box(150, 120, 100, 40, 60, { windows: [3, 1, 7] }),
  cube: () => shadow(130, 240, 140, 80) + box(130, 100, 140, 140, 90, { windows: [1, 1, 34] }) + `<rect class="art-accent" x="190" y="196" width="22" height="44"/>`,
  barn: () => shadow(80, 236, 220, 80) + box(80, 160, 220, 76, 90, { windows: [7, 1, 9], roof: "gable", tone: "b" }),
};

export function art(kind, seed = 0) {
  const sun = 60 + ((seed * 53) % 260);
  return `<svg class="art" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
<defs><linearGradient id="sky${seed}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--art-sky1)"/><stop offset="1" stop-color="var(--art-sky2)"/></linearGradient></defs>
<rect width="400" height="300" fill="url(#sky${seed})"/>
<circle class="art-sun" cx="${sun}" cy="${70 + (seed % 3) * 14}" r="${22 + (seed % 4) * 4}"/>
<path class="art-ground" d="M0 230H400V300H0z"/>
<g class="art-lines">${Array.from({ length: 9 }, (_, i) => `<path d="M${i * 50 - 40} 300L${i * 50 + 30} 230"/>`).join("")}</g>
${SCENES[kind]()}
</svg>`;
}

export function mountArt(root = document) {
  root.querySelectorAll("[data-art]").forEach((el, i) => {
    el.insertAdjacentHTML("afterbegin", art(el.dataset.art, Number(el.dataset.seed ?? i)));
  });
}
