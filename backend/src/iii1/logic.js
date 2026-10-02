// ГОСТ 10198-91, тип III-1: таблицы и формулы, специфичные для этого типа.
// Общие с типами I-3 и II-1 таблицы дна (Табл. 4, 19, п.1.6.5, 1.6.11)
// берутся из ../i3 (см. sizing.js).

// Толщина досок обшивки стенок и крышки (п.1.6.13): не менее 16 мм; при
// насыпном грузе или деталях, не связанных между собой и не закреплённых к
// дну (галочка «Насыпной или незакреплённый груз»), - не менее 19 мм.
// Морские перевозки не учитываются (по указанию пользователя).
function skinThickness(bulkCargo) {
  return bulkCargo ? 19 : 16;
}

// Табл. 12: толщина стоек нештабелируемых ящиков по массе груза и наружной
// высоте ящика (только эта таблица - по указанию пользователя), ширина 100.
// По указанию пользователя по ней же - горизонтальные брусья щитов (одна
// толщина каркаса на щит), брусья крышки и продольный брус дна.
const T_STOJKI_HEIGHTS = [1000, 1500, 2000, 2500, 3000];
const TABLE_STOJKI = [
  { maxMass: 4000, t: [25, 25, 32, 32, 40] },
  { maxMass: 6000, t: [25, 25, 32, 40, 40] },
  { maxMass: 8000, t: [25, 32, 40, 40, 50] },
  { maxMass: 10000, t: [25, 32, 40, 50, 50] },
  { maxMass: 16000, t: [25, 40, 50, 50, 50] },
  { maxMass: 20000, t: [32, 40, 50, 50, 50] },
];
function stojkaSection(mass, outerHmm) {
  let exceeded = false;
  let row = TABLE_STOJKI.find(r => mass <= r.maxMass);
  if (!row) { row = TABLE_STOJKI[TABLE_STOJKI.length - 1]; exceeded = true; }
  let colIdx = T_STOJKI_HEIGHTS.findIndex(h => outerHmm <= h);
  if (colIdx === -1) { colIdx = T_STOJKI_HEIGHTS.length - 1; exceeded = true; }
  return { t: row.t[colIdx], w: 100, exceeded };
}

// Торцовый брус дна (п.1.6.8) по массе груза, до 20000 кг (как у II-1).
function endBeamSection(mass) {
  if (mass <= 1000) return { h: 44, w: 100, exceeded: false };
  if (mass <= 2000) return { h: 60, w: 100, exceeded: false };
  if (mass <= 3500) return { h: 75, w: 100, exceeded: false };
  if (mass <= 5000) return { h: 100, w: 100, exceeded: false };
  if (mass <= 20000) return { h: 125, w: 125, exceeded: false };
  return { h: 125, w: 125, exceeded: true };
}

// Наименьшее число одинаковых элементов шириной memberWidth в пространстве
// space с чистым просветом между соседними не более maxGap (крайние - по
// краям пространства).
function minCountByClearGap(space, memberWidth, maxGap) {
  return Math.max(2, Math.ceil((space + maxGap) / (memberWidth + maxGap) - 1e-9));
}
// Чистый просвет между соседними из count элементов шириной memberWidth,
// равномерно расставленных в пространстве space.
function clearGapBySpan(space, memberWidth, count) {
  return (space - memberWidth * count) / (count - 1);
}

// Табл. 26: диаметр болтов крепления торцовых брусьев дна к полозьям, мм.
function endBeamBoltDiameter(mass, skidCount) {
  if (skidCount <= 2) return mass <= 3000 ? 12 : mass <= 6000 ? 16 : 20;
  return mass <= 6000 ? 12 : mass <= 10000 ? 16 : 20;
}

module.exports = {
  skinThickness, stojkaSection, endBeamSection,
  minCountByClearGap, clearGapBySpan, endBeamBoltDiameter,
};
