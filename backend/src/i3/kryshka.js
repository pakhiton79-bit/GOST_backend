// ГОСТ 10198-91, тип I-3: крышка - планки (пояса), доски и внутренние
// поперечные брусья.
const { vol, fillBoards } = require('../helpers');
const { crossBeamThickness } = require('./tables');
const { plankLayout, PLANK_W } = require('./plank-layout');

const BEAM_W = 100;          // ширина поперечного бруса (по Табл. 14 всегда 100 мм)
const STANDARD_BEAM_GAP = 800;

// Поперечные брусья. Штатно: зазор между кромками соседних брусьев ровно
// 800 мм (или свой - галочка, beamGapValue), число брусьев - максимальное при
// отступе от края не меньше minEdge, остаток длины - поровну на оба отступа.
// Своё число брусьев (beamCountValue) - равномерно, отступ = зазору (до целого
// мм). Возвращает { count, edgeDist, gap, standardCount } либо { error }.
function beamLayout(len, minEdge, beamGapValue, beamCountValue) {
  const countForGap = gap => Math.max(1, Math.floor((len - 2 * minEdge + gap) / (BEAM_W + gap) + 1e-9));
  const standardCount = countForGap(STANDARD_BEAM_GAP);
  if (beamCountValue > 0) {
    const count = Math.max(1, Math.round(beamCountValue));
    const edgeDist = Math.round((len - count * BEAM_W) / (count + 1));
    const gap = count > 1 ? (len - 2 * edgeDist - count * BEAM_W) / (count - 1) : 0;
    if (edgeDist < minEdge) {
      return { error: `Длина крышки ${Math.round(len)} мм недостаточна для ${count} поперечных брусьев с отступом от края - расчёт не выполняется.` };
    }
    return { count, edgeDist, gap, standardCount };
  }
  const gap = beamGapValue > 0 ? beamGapValue : STANDARD_BEAM_GAP;
  const count = countForGap(gap);
  const edgeDist = (len - count * BEAM_W - (count - 1) * gap) / 2;
  // Свой зазор, при котором помещается только 1 брус, и зазор больше его
  // отступа от края - смысла не имеет, расчёт блокируется.
  if (beamGapValue > 0 && count === 1 && gap > edgeDist) {
    return { error: `Расстояние между поперечными брусьями ${gap} мм больше отступа единственного бруса от края крышки (${Math.round(edgeDist)} мм) - расчёт не выполняется.` };
  }
  return { count, edgeDist, gap, standardCount };
}

// c - контекст расчёта (см. compute.js); len - длина крышки (= длина полоза),
// outerW - наружная ширина ящика (для Табл. 14).
function buildKryshka(c, len, outerW) {
  const { W, MASS, wall, ov, round, warnings } = c;
  const rows = [];
  const width = W + wall * 2; // длина планки, ширина крышки

  // Пояса планок. Штатная раскладка считается всегда - её число и зазор
  // клиент показывает центром ползунков ручной настройки.
  const override = (c.plankLayoutMode === 'count' || c.plankLayoutMode === 'gap') && c.plankLayoutValue > 0
    ? { mode: c.plankLayoutMode, value: c.plankLayoutValue }
    : null;
  const minEdge = (wall + wall) * 2; // (вертикальная планка + доска торца) × 2
  const standard = plankLayout(len, null, minEdge);
  const planks = override ? plankLayout(len, override, minEdge) : standard;
  if (planks.error) return { error: planks.error };
  rows.push({ name: 'Планка', t: wall, w: PLANK_W, l: width, qty: planks.count, overrideKey: 'wallValue' });

  const fb = fillBoards(W + wall * 2, c.roundBoardWidths);
  if (fb.mainQty > 0) rows.push({ name: 'Доска крышки', t: wall, w: 100, l: len, qty: fb.mainQty, overrideKey: 'wallValue' });
  fb.extra.forEach((e, i) => {
    const suffix = fb.extra.length > 1 ? ' ' + (i + 1) : '';
    rows.push({ name: 'Доска крышки (дополнительная)' + suffix, t: wall, w: e.width, l: len, qty: e.qty, overrideKey: 'wallValue' });
  });
  if (fb.warn) warnings.push('Доска крышки: остаток - нестандартная ширина (вне 75–99 мм).');
  if (fb.singleNarrow) warnings.push('Доска крышки: одна доска уже менее 100 мм.');

  // Внутренние поперечные брусья: толщина по Табл. 14 (масса + наружная ширина).
  const crossBeam = crossBeamThickness(MASS, outerW);
  if (crossBeam.exceeded) {
    warnings.push('Масса или ширина ящика вне Табл. 14 - брус крышки принят по крайнему значению.');
  }
  const beamT = ov('t21Value', round(crossBeam.value), 'Толщина внутреннего поперечного бруса крышки');
  const beamLen = W - (c.optimizeSizes ? 4 : 0);
  const beams = beamLayout(len, wall + wall, c.beamGapValue, c.beamCountValue);
  if (beams.error) return { error: beams.error };
  rows.push({ name: 'Внутренний поперечный брус', t: beamT, w: BEAM_W, l: beamLen, qty: beams.count, overrideKey: 't21Value' });

  const volume = vol(wall, PLANK_W, width, planks.count) + vol(wall, 100, len, fb.mainQty) + vol(beamT, BEAM_W, beamLen, beams.count)
    + fb.extra.reduce((s, e) => s + vol(wall, e.width, len, e.qty), 0);

  return { rows, volume, planks, standardPlanks: standard, beams, beamW: BEAM_W };
}

module.exports = { buildKryshka };
