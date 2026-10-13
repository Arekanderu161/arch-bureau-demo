// Единицы модели: 1 = 0,1 м. Все цифры, которые показывает сайт, берутся отсюда.
export const UNIT_M = 0.1;
export const TAN = Math.tan((35 * Math.PI) / 180);

export const FOUNDATION = { x: -52, y: -37, w: 104, d: 74, z0: 0, z1: 3 };
export const WALL_T = 4;
export const GROUND = { x0: -50, x1: 50, y0: -35, y1: 35, z0: 3, z1: 33 };
export const SLAB = { x0: -50, x1: 60, y0: -35, y1: 35, z0: 33, z1: 36 };
export const UPPER = { x0: -40, x1: 60, y0: -35, y1: 35, z0: 36, z1: 64 };
export const ROOF = { overhang: 4, thick: 3, pitch: 35, gap: 0.5 };
export const DECK = { x0: 52, x1: 80, y0: -30, y1: 20, z0: 0, z1: 1.5 };
export const EXPLODE = 34;

const area = (b) => ((b.x1 - b.x0 - 2 * WALL_T) * (b.y1 - b.y0 - 2 * WALL_T) * UNIT_M * UNIT_M);
export const AREA = {
  ground: area(GROUND),
  upper: area(UPPER),
  get total() {
    return this.ground + this.upper;
  },
};

export const LAYERS = [
  {
    id: "foundation",
    group: "site",
    title: "Фундамент",
    lead: "Утеплённая шведская плита",
    specs: [
      ["Плита", "300 мм, бетон B25"],
      ["Утепление", "XPS 200 мм"],
      ["Пятно", `${(FOUNDATION.w * UNIT_M).toFixed(1)} × ${(FOUNDATION.d * UNIT_M).toFixed(1)} м`],
    ],
  },
  {
    id: "ground",
    group: "g1",
    title: "1 этаж",
    lead: "Гостиная, кухня, лестница",
    specs: [
      ["Стены", "газобетон D500, 375 мм"],
      ["Высота", `${((GROUND.z1 - GROUND.z0) * UNIT_M).toFixed(1)} м`],
      ["Площадь", `${AREA.ground.toFixed(1)} м²`],
    ],
  },
  {
    id: "slab",
    group: "g2",
    title: "Перекрытие",
    lead: "Монолит с тёплым полом",
    specs: [
      ["Плита", "монолит 200 мм + стяжка"],
      ["Консоль", `${((SLAB.x1 - GROUND.x1) * UNIT_M).toFixed(1)} м`],
      ["Тёплый пол", "контур PE-Xa 16 мм"],
    ],
  },
  {
    id: "upper",
    group: "g3",
    title: "2 этаж",
    lead: "Спальня, гардероб, терраса",
    specs: [
      ["Каркас", "CLT-панели, 140 мм"],
      ["Фасад", "термососна, вентзазор"],
      ["Площадь", `${AREA.upper.toFixed(1)} м²`],
    ],
  },
  {
    id: "roof",
    group: "g4",
    title: "Кровля",
    lead: "Двускатная, фальц",
    specs: [
      ["Уклон", `${ROOF.pitch}°`],
      ["Покрытие", "фальц, сталь 0,6 мм"],
      ["Солнечные панели", "6 × 430 Вт"],
    ],
  },
];

export const follow = (v) => {
  const e = 34 * Math.min(1, Math.max(0, v.explode ?? 0));
  return { ...v, site: v.yaw ?? 0, g1: e, g2: e, g3: e, g4: e };
};
