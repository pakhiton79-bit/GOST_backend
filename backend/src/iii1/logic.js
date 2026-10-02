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

// Табл. 9: продольные брусья боковых и торцовых стенок (толщина × ширина) по
// массе груза и расстоянию между осями основных поперечных брусьев крышки.
// Брусья рамы крышки - того же сечения (п.1.8.1). Колонка - ближайшее
// расстояние; меньше 500 мм - колонка 500 и толщина на одну градацию меньше
// (примечание к таблице).
const T9_AXIS = [500, 600, 700, 800, 900, 1000];
const TABLE9 = [
  { maxMass: 500, s: ['25x100', '25x100', '25x100', '25x100', '25x100', '25x100'] },
  { maxMass: 1000, s: ['25x100', '25x100', '25x100', '25x100', '32x100', '32x100'] },
  { maxMass: 2000, s: ['32x100', '32x100', '40x100', '40x100', '40x100', '40x100'] },
  { maxMass: 4000, s: ['40x100', '50x100', '50x100', '50x100', '50x100', '50x100'] },
  { maxMass: 6000, s: ['50x100', '60x100', '60x100', '60x100', '60x100', '75x100'] },
  { maxMass: 8000, s: ['60x100', '60x100', '75x100', '75x100', '75x100', '100x100'] },
  { maxMass: 10000, s: ['75x100', '75x100', '75x100', '100x100', '100x100', '100x100'] },
  { maxMass: 12000, s: ['75x100', '75x100', '100x100', '100x100', '100x100', '100x100'] },
  { maxMass: 14000, s: ['75x100', '100x100', '100x100', '100x100', '100x100', '100x100'] },
  { maxMass: 16000, s: ['75x100', '100x100', '100x100', '100x100', '100x100', '100x100'] },
  { maxMass: 20000, s: ['100x100', '100x100', '100x100', '100x100', '100x125', '100x125'] },
];
// Ряд толщин для понижения на градацию - толщины пиломатериала, из которых
// на сайте выбираются толщины «в наличии».
const THICKNESS_GRADES = [16, 19, 22, 25, 32, 40, 50, 60, 75, 100, 125, 150, 175, 200, 225, 250];
function gradeDown(t) {
  const lower = THICKNESS_GRADES.filter(g => g < t);
  return lower.length ? lower[lower.length - 1] : t;
}
function beamSection9(mass, axisMm) {
  let exceeded = false;
  let row = TABLE9.find(r => mass <= r.maxMass);
  if (!row) { row = TABLE9[TABLE9.length - 1]; exceeded = true; }
  let colIdx = 0, best = Infinity;
  T9_AXIS.forEach((a, i) => {
    const d = Math.abs(a - axisMm);
    if (d < best || (d === best && a > T9_AXIS[colIdx])) { best = d; colIdx = i; }
  });
  if (axisMm > T9_AXIS[T9_AXIS.length - 1]) exceeded = true;
  const [t, w] = row.s[colIdx].split('x').map(Number);
  return { t: axisMm < T9_AXIS[0] ? gradeDown(t) : t, w, exceeded };
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
// space с шагом осей не более maxAxis (крайние - по краям пространства).
function minCountBySpan(space, memberWidth, maxAxis) {
  const span = Math.max(0, space - (memberWidth || 0));
  return Math.max(2, Math.ceil(span / maxAxis) + 1);
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
  skinThickness, stojkaSection, beamSection9, endBeamSection,
  minCountBySpan, clearGapBySpan, endBeamBoltDiameter,
};
