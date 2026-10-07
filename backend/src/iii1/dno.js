// ГОСТ 10198-91, тип III-1: дно - полозья, подполозные доски, доски дна,
// продольные брусья дна (по краям, на них стоят боковые щиты) и торцовые
// брусья.
const { vol, fillBoards } = require('../helpers');
const { endBeamSection } = require('./logic');

// c - контекст расчёта (см. compute.js); s - согласованные размеры (sizing.js).
// subLengthWarn - в таблице ⚠ вместо длины подполозной доски.
function buildDno(c, s, subLengthWarn) {
  const { W, MASS, ov, round, warnings, removeSkidBoards, removeFloorBoards } = c;
  const { skid, sub, len, outerW } = s;
  const rows = [];

  // Полоз (t9) и торцовый брус (t11): ручная толщина (ячейка таблицы или
  // «Тонкая настройка») - и в таблице, и в расчёте (skid.t, beam.t).
  rows.push({ name: 'Полоз', t: skid.t, w: skid.w, l: len, qty: skid.count, overrideKey: 't9' });
  if (!removeSkidBoards) {
    rows.push({ name: 'Подполозная доска', t: sub.t, w: sub.w, l: subLengthWarn ? '⚠' : sub.l, qty: sub.qty, overrideKey: 't10' });
  }

  const endBeam = endBeamSection(MASS);
  if (endBeam.exceeded) {
    warnings.push('Масса вне диапазона п.1.6.8 (≤20000 кг) - сечение торцового бруса дна принято по крайнему значению.');
  }
  const beamGostT = round(endBeam.h, 'Торцовый брус дна');
  const beam = { t: ov('t11', beamGostT, 'Толщина торцового бруса дна'), w: endBeam.w, l: W, qty: 2 };

  // Доски дна - поперёк ящика на всю наружную ширину, занимают наружную
  // длину без ширины двух торцовых брусьев.
  const floorT = s.floorBoardT, floorLen = outerW;
  const fb = fillBoards(len - beam.w * 2, c.roundBoardWidths);
  if (!removeFloorBoards) {
    if (fb.mainQty > 0) rows.push({ name: 'Доска дна', t: floorT, w: 100, l: floorLen, qty: fb.mainQty, overrideKey: 'floorBoardT' });
    fb.extra.forEach((e, i) => {
      const suffix = fb.extra.length > 1 ? ' ' + (i + 1) : '';
      rows.push({ name: 'Доска дна (дополнительная)' + suffix, t: floorT, w: e.width, l: floorLen, qty: e.qty, overrideKey: 'floorBoardT' });
    });
    if (fb.warn) warnings.push('Доска дна: остаток - нестандартная ширина (вне 75–99 мм).');
    if (fb.singleNarrow) warnings.push('Доска дна: одна доска уже менее 100 мм.');
  }

  // Продольные брусья дна - как горизонтальный брус бокового щита.
  const dnoBeam = { t: s.dnoBeamT, w: s.beamW, l: len, qty: 2 };
  rows.push({ name: 'Продольный брус дна', t: dnoBeam.t, w: dnoBeam.w, l: dnoBeam.l, qty: dnoBeam.qty, overrideKey: 'tDnoBeam' });
  rows.push({ name: 'Торцовый брус дна', t: beam.t, w: beam.w, l: beam.l, qty: beam.qty, overrideKey: 't11' });

  const volume = vol(skid.t, skid.w, len, skid.count) + (removeSkidBoards ? 0 : vol(sub.t, sub.w, sub.l, sub.qty)) + vol(beam.t, beam.w, beam.l, beam.qty)
    + vol(dnoBeam.t, dnoBeam.w, dnoBeam.l, dnoBeam.qty)
    + (removeFloorBoards ? 0 : (vol(floorT, 100, floorLen, fb.mainQty) + fb.extra.reduce((s2, e) => s2 + vol(floorT, e.width, floorLen, e.qty), 0)));

  return { rows, volume };
}

module.exports = { buildDno };
