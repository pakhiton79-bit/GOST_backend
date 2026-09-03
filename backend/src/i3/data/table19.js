// ГОСТ 10198-91, тип I-3: "Таблица 19" (источник - файл заказчика "Новые
// стандарты полозьев.docx") - высота и ширина полозьев при креплении груза
// к полозьям или доскам дна, по массе груза, рабочей длине полоза и
// количеству полозьев. Вынесено из tables.js в отдельный файл - самая
// объёмная из табличных данных ГОСТа, менять её отдельно от остальных
// формул/таблиц.
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

  // п.1.6.2 - минимум полозьев по шагу осей 1200мм. Если ни один вариант из
  // таблицы не даёт нужное количество полозьев (например, у масс 500-4000кг
  // в Табл.19 предусмотрено только 2/3 полоза) - по уточнению пользователя:
  // добавляем максимум 1 полоз сверх табличного варианта с БОЛЬШИМ
  // количеством, БЕЗ понижения сечения (то же сечение, что и у табличного
  // варианта) - вопреки тексту примечания к самой таблице («на одну
  // градацию ниже»), которое здесь не применяется. Если даже +1 не хватает -
  // добавляем ещё (тем же сечением), но это уже повод для предупреждения
  // (extrapolatedBeyondOne, см. compute.js).
  let valid = options.filter(o => o.count >= minSkidsByWidth162(widthMm, o.w));
  let extrapolatedBeyondOne = false;
  if (valid.length === 0) {
    const base = options.reduce((a, b) => b.count > a.count ? b : a);
    const requiredCount = minSkidsByWidth162(widthMm, base.w);
    const finalCount = Math.max(base.count + 1, requiredCount);
    extrapolatedBeyondOne = finalCount > base.count + 1;
    valid = [{ count: finalCount, h: base.h, w: base.w, lengthUsed: base.lengthUsed, lengthSnapped: base.lengthSnapped }];
  }

  let chosen = (availableThicknesses && availableThicknesses.length)
    ? valid.find(o => availableThicknesses.includes(o.h))
    : null;
  if (!chosen) {
    chosen = valid.reduce((a, b) => b.count < a.count ? b : a);
  }

  const finalH = Math.min(chosen.h, chosen.w);
  const finalW = Math.max(chosen.h, chosen.w);

  return {
    h: finalH, w: finalW, count: chosen.count,
    massUsed: massRow.mass, massSnapped,
    lengthUsed: chosen.lengthUsed, lengthSnapped: chosen.lengthSnapped,
    extrapolatedBeyondOne,
  };
}

module.exports = { T19_LENGTHS, TABLE19, selectSkid19, minSkidsByWidth162 };
