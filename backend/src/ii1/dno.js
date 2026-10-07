// ГОСТ 10198-91, тип II-1: дно - полозья, подполозные доски, торцовые брусья
// и доски дна.
const { vol, fillBoards } = require('../helpers');
const { endBeamSection } = require('./logic');

// c - контекст расчёта (см. compute.js); s - согласованные размеры (sizing.js).
// subLengthWarn - в таблице ⚠ вместо длины подполозной доски.
function buildDno(c, s, subLengthWarn) {
  const { L, W, MASS, ov, round, warnings, removeSkidBoards, removeFloorBoards } = c;
  const { skid, sub, len } = s;
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
  rows.push({ name: 'Торцовый брус дна', t: beam.t, w: beam.w, l: beam.l, qty: beam.qty, overrideKey: 't11' });

  // Доски дна - между торцовыми брусьями, поперёк ящика.
  const floorT = s.floorBoardT, floorLen = W;
  const fb = fillBoards(L - beam.w * 2, c.roundBoardWidths);
  if (!removeFloorBoards) {
    if (fb.mainQty > 0) rows.push({ name: 'Доска дна', t: floorT, w: 100, l: floorLen, qty: fb.mainQty, overrideKey: 'floorBoardT' });
    fb.extra.forEach((e, i) => {
      const suffix = fb.extra.length > 1 ? ' ' + (i + 1) : '';
      rows.push({ name: 'Доска дна (дополнительная)' + suffix, t: floorT, w: e.width, l: floorLen, qty: e.qty, overrideKey: 'floorBoardT' });
    });
    if (fb.warn) warnings.push('Доска дна: остаток - нестандартная ширина (вне 75–99 мм).');
    if (fb.singleNarrow) warnings.push('Доска дна: одна доска уже менее 100 мм.');
  }

  const volume = vol(skid.t, skid.w, len, skid.count) + (removeSkidBoards ? 0 : vol(sub.t, sub.w, sub.l, sub.qty)) + vol(beam.t, beam.w, beam.l, beam.qty)
    + (removeFloorBoards ? 0 : (vol(floorT, 100, floorLen, fb.mainQty) + fb.extra.reduce((s2, e) => s2 + vol(floorT, e.width, floorLen, e.qty), 0)));

  return { rows, volume };
}

module.exports = { buildDno };
