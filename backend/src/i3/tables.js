// ГОСТ 10198-91, тип I-3: табличные данные и подбор сечений - перенесены как
// есть из src/logic.js исходного репозитория pakhiton79-bit/GOST_10198-91,
// без изменений в значениях/формулах (включая уже исправленный разбор ячеек
// Табл.19 - ширина полоза всегда больше или равна толщине, см. selectSkid19).

// ГОСТ 10198-91, п.1.6.11: толщина подполозной доски в зависимости от массы груза.
function subfloorThicknessRaw(mass) {
  if (mass <= 1000) return 25;
  if (mass <= 5000) return 32;
  if (mass <= 10000) return 40;
  return 50;
}

// ГОСТ 10198-91, п.1.6.15: толщина досок, планок и раскосов боковых, торцовых
// стенок и крышки ящиков типов I-3, I-4 в зависимости от массы груза.
function wallThickness(mass) {
  if (mass <= 1000) return { value: 19, exceeded: false };
  if (mass <= 3000) return { value: 22, exceeded: false };
  return { value: 22, exceeded: true };
}

// ГОСТ 10198-91, п.1.6.5: высота и ширина полозьев для грузов со сплошным жёстким
// основанием при строплении за полозья в пределах основания груза.
function polozSection165(mass) {
  const table = [
    { max: 800, h: 44, w: 100 },
    { max: 1000, h: 50, w: 100 },
    { max: 3000, h: 75, w: 125 },
    { max: 5000, h: 100, w: 100 },
    { max: 10000, h: 125, w: 150 },
    { max: 20000, h: 150, w: 175 },
  ];
  let row = table.find(r => mass <= r.max);
  let exceeded = false;
  if (!row) { row = table[table.length - 1]; exceeded = true; }
  return { h: row.h, w: row.w, exceeded };
}

// Новый стандарт полозьев ("Таблица 19"): высота и ширина полозьев при
// креплении груза к полозьям или доскам дна, по массе груза, рабочей длине
// полоза и количеству полозьев.
const T19_LENGTHS = [1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000];
const TABLE19 = [
  { mass: 500, rows: [
    { count: 2, dims: ['50x100', '60x100', '60x100', '75x100', '75x100', '100x100', '100x100', null, null] },
    { count: 3, dims: ['40x100', '50x100', '50x100', '60x100', '100x60', '100x75', '100x75', null, null] },
  ] },
  { mass: 800, rows: [
    { count: 2, dims: ['60x100', '75x100', '75x100', '100x100', '100x100', '100x125', '125x100', null, null] },
    { count: 3, dims: ['50x100', '60x100', '60x100', '75x100', '100x75', '100x100', '100x100', null, null] },
  ] },
  { mass: 1000, rows: [
    { count: 2, dims: ['75x100', '100x100', '100x100', '100x125', '100x125', '125x100', '125x125', null, null] },
    { count: 3, dims: ['60x100', '75x100', '75x100', '75x125', '100x100', '100x100', '100x125', null, null] },
  ] },
  { mass: 1500, rows: [
    { count: 2, dims: ['100x75', '100x100', '100x125', '125x125', '125x150', '150x125', '150x150', null, null] },
    { count: 3, dims: ['60x100', '75x100', '100x100', '100x125', '100x125', '125x100', '125x125', null, null] },
  ] },
  { mass: 2000, rows: [
    { count: 2, dims: ['100x100', '100x125', '125x125', '125x150', '150x125', '150x125', '150x150', null, null] },
    { count: 3, dims: ['75x100', '100x100', '100x125', '125x100', '125x125', '125x125', '150x125', null, null] },
  ] },
  { mass: 2500, rows: [
    { count: 2, dims: ['100x125', '125x100', '125x150', '150x150', '150x150', '175x150', '175x150', '175x200', null] },
    { count: 3, dims: ['75x100', '100x125', '125x100', '125x125', '125x150', '150x125', '150x150', '175x175', null] },
  ] },
  { mass: 3000, rows: [
    { count: 2, dims: ['125x100', '125x125', '150x150', '150x175', '175x150', '175x175', '175x175', '200x175', '200x200'] },
    { count: 3, dims: ['100x100', '125x100', '125x125', '125x150', '150x125', '150x150', '175x150', '175x175', '175x175'] },
  ] },
  { mass: 4000, rows: [
    { count: 2, dims: ['125x125', '150x100', '150x175', '175x175', '175x200', '200x175', '200x200', '225x200', '225x225'] },
    { count: 3, dims: ['100x125', '125x125', '150x125', '150x150', '150x175', '175x150', '175x175', '175x200', '175x200'] },
  ] },
  { mass: 5000, rows: [
    { count: 3, dims: ['125x100', '125x150', '150x150', '50x175', '175x150', '175x200', '175x200', '200x200', '200x200'] },
    { count: 4, dims: ['100x100', '125x100', '125x150', '150x125', '150x175', '150x175', '175x150', '175x150', '175x175'] },
  ] },
  { mass: 6000, rows: [
    { count: 3, dims: ['125x125', '150x125', '150x175', '175x150', '175x175', '200x175', '200x200', '200x225', '225x225'] },
    { count: 4, dims: ['125x100', '125x125', '150x125', '150x150', '150x175', '175x150', '175x150', '175x175', '175x200'] },
  ] },
  { mass: 7000, rows: [
    { count: 3, dims: ['125x150', '150x150', '175x150', '175x175', '175x200', '200x200', '200x200', '225x200', '225x225'] },
    { count: 4, dims: ['125x100', '125x125', '150x125', '150x150', '175x150', '175x175', '175x175', '175x200', '200x200'] },
  ] },
  { mass: 8000, rows: [
    { count: 3, dims: ['150x125', '150x175', '175x175', '175x200', '200x200', '200x225', '225x225', '225x225', '225x250'] },
    { count: 4, dims: ['125x125', '150x125', '150x175', '150x175', '175x175', '175x200', '175x200', '200x200', '200x200'] },
  ] },
  { mass: 10000, rows: [
    { count: 3, dims: [null, '175x175', '175x200', '200x200', '225x225', '225x250', '250x225', '250x225', '250x250'] },
    { count: 4, dims: [null, '150x150', '175x150', '175x200', '200x175', '200x200', '200x200', '200x225', '225x225'] },
  ] },
  { mass: 12000, rows: [
    { count: 4, dims: [null, '150x175', '175x150', '175x200', '200x200', '200x225', '225x225', '225x250', '250x225'] },
    { count: 5, dims: [null, '150x150', '150x150', '175x175', '175x175', '175x200', '175x225', '200x200', '225x200'] },
  ] },
  { mass: 14000, rows: [
    { count: 4, dims: [null, '175x175', '175x175', '200x200', '200x225', '225x225', '225x225', '225x250', '250x225'] },
    { count: 5, dims: [null, '150x175', '175x150', '175x175', '175x200', '200x200', '200x200', '200x225', '225x225'] },
  ] },
  { mass: 16000, rows: [
    { count: 4, dims: [null, '175x200', '175x200', '200x200', '225x225', '225x250', '250x225', '250x225', '250x250'] },
    { count: 5, dims: [null, '175x175', '175x175', '175x200', '175x200', '200x200', '200x200', '225x200', '225x225'] },
  ] },
  { mass: 18000, rows: [
    { count: 4, dims: [null, null, '175x200', '200x200', '225x225', '225x250', '250x225', '250x225', '250x250'] },
    { count: 5, dims: [null, null, '175x175', '175x200', '200x200', '225x225', '225x225', '225x225', '225x250'] },
  ] },
  { mass: 20000, rows: [
    { count: 4, dims: [null, null, '200x200', '225x225', '225x250', '250x225', '250x225', '250x225', '250x250'] },
    { count: 5, dims: [null, null, '175x200', '200x200', '200x200', '200x225', '225x225', '225x250', '225x250'] },
  ] },
];

// Полная градационная последовательность сечений полоза, встречающаяся в
// Табл. 19 (используется, когда таблица не предусматривает нужное количество
// полозьев для данной массы - см. selectSkid19 ниже).
const SKID_GRADATIONS = [40, 50, 60, 75, 100, 125, 150, 175, 200, 225, 250];
function skidGradeDown(mm) {
  const i = SKID_GRADATIONS.indexOf(mm);
  return i > 0 ? SKID_GRADATIONS[i - 1] : mm;
}

function nearestIndexBy(arr, keyFn, target) {
  let best = 0, bestDiff = Infinity;
  arr.forEach((item, i) => {
    const diff = Math.abs(keyFn(item) - target);
    if (diff < bestDiff || (diff === bestDiff && keyFn(item) > keyFn(arr[best]))) {
      bestDiff = diff; best = i;
    }
  });
  return best;
}

// ГОСТ 10198-91, п.1.6.2: минимально необходимое количество полозьев по шагу
// осей ≤1200мм, с учётом того, что наружный край крайнего полоза не должен
// выступать за габарит ящика (ось крайнего полоза отстоит от края не более
// чем на skidW/2).
function minSkidsByWidth162(widthMm, skidW) {
  const span = Math.max(0, widthMm - (skidW || 0));
  return Math.max(2, Math.ceil(span / 1200) + 1);
}

// Подбор сечения и количества полозьев по новому стандарту (Табл. 19).
// availableThicknesses - толщины "в наличии" (для приоритета при выборе
// среди равнозначных вариантов количества полозьев); передаётся явно
// параметром (без обращения к какому-либо глобальному/модульному состоянию),
// чтобы функция оставалась чистой и пригодной для использования в бэкенде.
function selectSkid19(mass, workingLengthMm, widthMm, availableThicknesses) {
  const massIdx = nearestIndexBy(TABLE19, r => r.mass, mass);
  const massRow = TABLE19[massIdx];
  const massSnapped = mass > TABLE19[TABLE19.length - 1].mass;

  const lengthExceeded = workingLengthMm > T19_LENGTHS[T19_LENGTHS.length - 1];

  const options = massRow.rows.map(row => {
    const availIdx = row.dims.map((d, i) => d !== null ? i : null).filter(i => i !== null);
    if (availIdx.length === 0) return null;
    let bestI = availIdx[0], bestDiff = Infinity;
    availIdx.forEach(i => {
      const diff = Math.abs(T19_LENGTHS[i] - workingLengthMm);
      if (diff < bestDiff || (diff === bestDiff && T19_LENGTHS[i] > T19_LENGTHS[bestI])) { bestDiff = diff; bestI = i; }
    });
    // Ширина полоза (w) - всегда БОЛЬШЕЕ из двух чисел ячейки, толщина (h) -
    // меньшее: в исходном файле заказчика это не выдержано позиционно (66 из
    // 286 ячеек записаны как "большее x меньшее").
    const nums = row.dims[bestI].split('x').map(Number);
    const h = Math.min(nums[0], nums[1]);
    const w = Math.max(nums[0], nums[1]);
    return { count: row.count, h, w, lengthUsed: T19_LENGTHS[bestI], lengthSnapped: lengthExceeded };
  }).filter(o => o !== null);

  let valid = options.filter(o => o.count >= minSkidsByWidth162(widthMm, o.w));
  let spacingExceeded = false;
  let extrapolatedCount = null;
  if (valid.length === 0) {
    let base = options.reduce((a, b) => b.count > a.count ? b : a);
    let cur = base;
    while (cur.count < minSkidsByWidth162(widthMm, cur.w)) {
      const w = skidGradeDown(cur.w);
      if (w === cur.w) break;
      cur = { count: cur.count + 1, h: cur.h, w, lengthUsed: cur.lengthUsed, lengthSnapped: cur.lengthSnapped };
    }
    if (cur.count >= minSkidsByWidth162(widthMm, cur.w)) {
      valid = [cur];
      extrapolatedCount = cur.count;
    } else {
      valid = [cur];
      spacingExceeded = true;
    }
  }

  let chosen = (availableThicknesses && availableThicknesses.length)
    ? valid.find(o => availableThicknesses.includes(o.h))
    : null;
  if (!chosen) {
    chosen = valid.reduce((a, b) => b.count < a.count ? b : a);
  }

  return {
    h: chosen.h, w: chosen.w, count: chosen.count,
    massUsed: massRow.mass, massSnapped,
    lengthUsed: chosen.lengthUsed, lengthSnapped: chosen.lengthSnapped,
    spacingExceeded,
    extrapolatedCount,
  };
}

// ГОСТ 10198-91, п.1.6.8: толщина и ширина торцовых брусьев дна по массе груза.
function endBeamSection(mass) {
  if (mass <= 1000) return { h: 44, w: 100, exceeded: false };
  if (mass <= 2000) return { h: 60, w: 100, exceeded: false };
  if (mass <= 3500) return { h: 75, w: 100, exceeded: false };
  if (mass <= 5000) return { h: 100, w: 100, exceeded: false };
  return { h: 125, w: 125, exceeded: true };
}

// Толщина доски дна по массе груза (крепление за полозья, "новое правило").
function floorBoardThicknessNew(mass) {
  return mass <= 1000 ? 16 : 19;
}

// ГОСТ 10198-91, Таблица 4 (п.1.6.9): толщина досок дна при креплении груза
// к доскам дна, по удельной нагрузке и расстоянию между осями смежных полозьев.
const T4_LOADS = [0.10, 0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50];
const T4_DISTANCES = [500, 600, 800, 1000, 1200];
const TABLE4 = [
  [19, 19, 19, 22, 25],
  [19, 19, 22, 32, 32],
  [19, 22, 25, 32, 40],
  [19, 22, 32, 40, 40],
  [19, 22, 32, 40, 50],
  [22, 25, 32, 40, 50],
  [22, 25, 40, 50, 50],
  [22, 32, 40, 50, 50],
];
function floorBoardThickness(mass, Lmm, Wmm, distanceMm) {
  const S_cm2 = (Lmm / 10) * (Wmm / 10);
  const udel = mass / S_cm2;
  let exceeded = false;
  if (udel < 0.10) return { value: 19, udel, exceeded: false };
  let rowIdx = T4_LOADS.findIndex(v => udel <= v);
  if (rowIdx === -1) { rowIdx = T4_LOADS.length - 1; exceeded = true; }
  let colIdx = T4_DISTANCES.findIndex(v => distanceMm <= v);
  if (colIdx === -1) { colIdx = T4_DISTANCES.length - 1; exceeded = true; }
  return { value: TABLE4[rowIdx][colIdx], udel, exceeded };
}

// ГОСТ 10198-91, Таблица 14: толщина поперечных брусьев крышки для
// нештабелируемых ящиков (тип I-3), по массе груза и наружной ширине.
const T14_WIDTHS = [1000, 1500, 2000, 2500, 3200];
const TABLE14 = [
  { maxMass: 1000, t: [32, 32, 32, 40, 40] },
  { maxMass: 3000, t: [32, 32, 40, 50, 50] },
  { maxMass: 5000, t: [32, 40, 50, 60, 75] },
  { maxMass: 8000, t: [40, 50, 60, 75, 75] },
  { maxMass: 12000, t: [40, 60, 75, 75, 100] },
  { maxMass: 20000, t: [50, 75, 75, 100, 100] },
];
function crossBeamThickness(mass, outerWmm) {
  let exceeded = false;
  let row = TABLE14.find(r => mass <= r.maxMass);
  if (!row) { row = TABLE14[TABLE14.length - 1]; exceeded = true; }
  let colIdx = T14_WIDTHS.findIndex(w => outerWmm <= w);
  if (colIdx === -1) { colIdx = T14_WIDTHS.length - 1; exceeded = true; }
  return { value: row.t[colIdx], exceeded };
}

module.exports = {
  subfloorThicknessRaw, wallThickness, polozSection165,
  T19_LENGTHS, TABLE19, selectSkid19, minSkidsByWidth162,
  endBeamSection, floorBoardThicknessNew,
  T4_LOADS, T4_DISTANCES, TABLE4, floorBoardThickness,
  T14_WIDTHS, TABLE14, crossBeamThickness,
};
