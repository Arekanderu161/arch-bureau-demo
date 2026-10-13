import { initTheme, splitWords, reveal, onScroll, progressOf, House, counters, reduced } from "./common.js";
import { blueprint } from "./fx-blueprint.js";
import { mountArt } from "./art.js";
import { LAYERS } from "../house/model.mjs";

initTheme("light");
document.querySelectorAll("[data-split]").forEach(splitWords);
mountArt();
reveal();
counters();
blueprint(document.querySelector(".hero-gl"));

const header = document.querySelector("[data-header]");
onScroll(() => header.toggleAttribute("data-scrolled", scrollY > 40));

const hero = document.querySelector(".hero");
const coords = document.querySelector("[data-coords]");
hero.addEventListener("pointermove", (e) => {
  const box = hero.getBoundingClientRect();
  const x = Math.round(((e.clientX - box.left) / box.width) * 12000);
  const y = Math.round(((box.bottom - e.clientY) / box.height) * 8000);
  coords.textContent = `X ${String(x).padStart(5, "0")} · Y ${String(y).padStart(4, "0")}`;
});

const lists = [...document.querySelectorAll("[data-callouts]")];
LAYERS.forEach((layer, i) => {
  const host = lists[i < 3 ? 0 : 1];
  host.insertAdjacentHTML(
    "beforeend",
    `<li data-layer="${layer.id}"><span class="callout-num">${String(i + 1).padStart(2, "0")}</span><h3>${layer.title}</h3><p>${layer.lead}</p><dl>${layer.specs.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl></li>`,
  );
});
const callouts = [...document.querySelectorAll("[data-layer]")];
const house = new House(document.querySelector("[data-house]"));
house.onState(({ layer }) => callouts.forEach((li) => li.classList.toggle("is-active", li.dataset.layer === layer)));
callouts.forEach((li, i) => {
  li.tabIndex = 0;
  const pick = () => {
    house.set({ explode: i ? i / (LAYERS.length - 1) : 0.06 });
    const box = house.frame.getBoundingClientRect();
    if (box.bottom < innerHeight * 0.35 || box.top > innerHeight * 0.65) house.frame.scrollIntoView({ behavior: reduced.matches ? "auto" : "smooth", block: "center" });
  };
  li.addEventListener("click", pick);
  li.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), pick()));
});

const gallery = document.querySelector("[data-gallery]");
const track = gallery.querySelector("[data-track]");
const sheets = [...track.children];
const index = gallery.querySelector("[data-gallery-index]");
const bar = gallery.querySelector("[data-gallery-bar]");
const sizeGallery = () => {
  const extra = Math.max(0, track.scrollWidth - innerWidth);
  gallery.style.height = `${innerHeight + extra}px`;
  return extra;
};
let extra = sizeGallery();
addEventListener("resize", () => (extra = sizeGallery()));
onScroll(() => {
  const p = progressOf(gallery);
  track.style.transform = `translate3d(${(-p * extra).toFixed(1)}px,0,0)`;
  sheets.forEach((sheet) => {
    const box = sheet.getBoundingClientRect();
    const c = (box.left + box.width / 2 - innerWidth / 2) / innerWidth;
    sheet.style.setProperty("--shift", c.toFixed(3));
  });
  index.textContent = String(Math.min(sheets.length, 1 + Math.round(p * (sheets.length - 1)))).padStart(2, "0");
  bar.style.transform = `scaleX(${p.toFixed(4)})`;
});

const carousel = document.querySelector("[data-carousel]");
const slides = [...carousel.querySelectorAll(".slide")];
const dots = carousel.querySelector("[data-dots]");
dots.innerHTML = slides.map((_, i) => `<button type="button" aria-label="Услуга ${i + 1}"></button>`).join("");
let current = 0;
let timer = 0;
const layout = () => {
  const n = slides.length;
  slides.forEach((slide, i) => {
    let o = i - current;
    if (o > n / 2) o -= n;
    if (o < -n / 2) o += n;
    slide.style.setProperty("--o", String(o));
    slide.style.setProperty("--a", String(Math.abs(o)));
    slide.classList.toggle("is-current", o === 0);
    slide.setAttribute("aria-hidden", String(o !== 0));
  });
  [...dots.children].forEach((d, i) => d.setAttribute("aria-current", String(i === current)));
};
const go = (i) => {
  current = (i + slides.length) % slides.length;
  layout();
};
const autoplay = () => {
  clearInterval(timer);
  if (!reduced.matches) timer = setInterval(() => go(current + 1), 5200);
};
carousel.querySelector("[data-prev]").addEventListener("click", () => (go(current - 1), autoplay()));
carousel.querySelector("[data-next]").addEventListener("click", () => (go(current + 1), autoplay()));
dots.addEventListener("click", (e) => {
  const i = [...dots.children].indexOf(e.target);
  if (i >= 0) go(i), autoplay();
});
slides.forEach((slide, i) => slide.addEventListener("click", () => i !== current && (go(i), autoplay())));
carousel.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") go(current - 1), autoplay();
  if (e.key === "ArrowRight") go(current + 1), autoplay();
});
carousel.addEventListener("pointerenter", () => clearInterval(timer));
carousel.addEventListener("pointerleave", autoplay);
let swipe = null;
carousel.addEventListener("pointerdown", (e) => (swipe = e.clientX));
carousel.addEventListener("pointerup", (e) => {
  if (swipe === null) return;
  const dx = e.clientX - swipe;
  swipe = null;
  if (Math.abs(dx) > 50) go(current + (dx < 0 ? 1 : -1)), autoplay();
});
layout();
autoplay();

const form = document.querySelector("[data-form]");
form.addEventListener("submit", (event) => {
  event.preventDefault();
  form.querySelector("[data-form-note]").textContent = "Спасибо! Это демо-версия сайта — заявка никуда не отправлена.";
  form.reset();
});
