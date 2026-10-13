import { initTheme, splitWords, reveal, onScroll, progressOf, smooth, clamp, House, reduced } from "./common.js";
import { monolith } from "./fx-monolith.js";
import { mountArt } from "./art.js";
import { LAYERS } from "../house/model.mjs";

initTheme("dark");
document.querySelectorAll("[data-split]").forEach(splitWords);
mountArt();
reveal();
monolith(document.querySelector(".hero-gl"));

const header = document.querySelector("[data-header]");
onScroll(() => header.toggleAttribute("data-scrolled", scrollY > 40));

const manifesto = document.querySelector("[data-manifesto]");
const words = splitWords(manifesto.querySelector("[data-words]"));
words.forEach((w) => w.classList.add("is-lit-able"));
onScroll(() => {
  const p = progressOf(manifesto);
  const lit = Math.round(smooth(0.05, 0.85, p) * words.length);
  words.forEach((w, i) => w.classList.toggle("is-lit", i < lit));
});

const anatomy = document.querySelector("[data-anatomy]");
const list = anatomy.querySelector("[data-layers]");
list.innerHTML = LAYERS.map(
  (layer, i) => `<li data-layer="${layer.id}"><button type="button" data-goto="${i}"><span class="layer-num">${String(i + 1).padStart(2, "0")}</span><span class="layer-title">${layer.title}</span><span class="layer-lead">${layer.lead}</span></button><dl>${layer.specs.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl></li>`,
).join("");
const items = [...list.children];
const bar = anatomy.querySelector("[data-anatomy-bar]");
const house = new House(anatomy.querySelector("[data-house]"));
const START = 0.1;
const END = 0.9;
let sent = -1;
let active = -2;
onScroll(() => {
  const p = progressOf(anatomy);
  const explode = smooth(START, END, p);
  if (Math.abs(explode - sent) > 0.004 || (explode === 0 && sent !== 0) || (explode === 1 && sent !== 1)) {
    sent = explode;
    house.set({ explode });
  }
  const index = p < START * 0.6 ? -1 : Math.min(LAYERS.length - 1, Math.floor(clamp((p - START * 0.6) / (END - START * 0.6)) * LAYERS.length));
  if (index !== active) {
    active = index;
    items.forEach((li, i) => {
      li.classList.toggle("is-active", i === index);
      li.classList.toggle("is-past", i < index);
    });
  }
  bar.style.transform = `scaleX(${p.toFixed(4)})`;
});
list.addEventListener("click", (event) => {
  const button = event.target.closest("[data-goto]");
  if (!button) return;
  const i = Number(button.dataset.goto);
  const span = anatomy.offsetHeight - innerHeight;
  const p = START * 0.6 + ((i + 0.5) / LAYERS.length) * (END - START * 0.6);
  scrollTo({ top: anatomy.offsetTop + span * p, behavior: reduced.matches ? "auto" : "smooth" });
});

const cards = [...document.querySelectorAll("[data-card]")];
onScroll(() => {
  cards.forEach((card, i) => {
    const next = cards[i + 1];
    if (!next) return;
    const top = parseFloat(getComputedStyle(card).top) || 0;
    const t = clamp(1 - (next.getBoundingClientRect().top - top) / (innerHeight * 0.8));
    card.style.setProperty("--t", t.toFixed(3));
  });
});

const process = document.querySelector("[data-process]");
const road = process.querySelector("[data-road]");
const steps = [...process.querySelectorAll("[data-step]")];
onScroll(() => {
  const box = process.querySelector(".road").getBoundingClientRect();
  const p = clamp((innerHeight * 0.62 - box.top) / box.height);
  road.style.strokeDashoffset = String(1 - p);
  steps.forEach((step) => {
    const at = (step.offsetTop + 24) / box.height;
    step.classList.toggle("is-on", p >= at);
  });
});

const form = document.querySelector("[data-form]");
form.addEventListener("submit", (event) => {
  event.preventDefault();
  form.querySelector("[data-form-note]").textContent = "Спасибо! Это демо-версия сайта — заявка никуда не отправлена.";
  form.reset();
});
