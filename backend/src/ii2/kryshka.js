// ГОСТ 10198-91, тип II-2: крышка - поперечные брусья, продольные брусья и
// доски с промежутками (как у II-1, ../ii1/kryshka.js). Доски - поперёк
// ящика, раскладываются по наружной длине ящика.
const { vol } = require('../helpers');
const { fillGapBoards, BOARD_W } = require('./boards');

// c - контекст расчёта (см. compute.js); s - согласованные размеры (../ii1/sizing.js).
function buildKryshka(c, s) {
  const { L, W, warnings, skinT, optimizeSizes } = c;
  const rows = [];

  const crossLen = W - (optimizeSizes ? 2 : 0);
  rows.push({ name: 'Внутренний поперечный брус', t: s.crossBeamT, w: s.crossBeamW, l: crossLen, qty: s.crossBeamCount, overrideKey: 't21' });
  let volume = vol(s.crossBeamT, s.crossBeamW, crossLen, s.crossBeamCount);

  const longLen = L + s.stojkaT * 2 - (optimizeSizes ? 2 : 0);
  rows.push({ name: 'Внутренний продольный брус', t: s.longBeamT, w: s.longBeamW, l: longLen, qty: s.longBeamCount, overrideKey: 'tLongbeam' });
  volume += vol(s.longBeamT, s.longBeamW, longLen, s.longBeamCount);

  // Доски идут поперёк ящика (длина - наружная ширина) и лежат на
  // продольных брусьях; продольное расположение убрано по указанию
  // пользователя.
  const boardLen = s.outerW;
  const fillspace = s.len;
  const fb = fillGapBoards(fillspace, c.roundBoardWidths, c.boardGapMax, 'Крышка', warnings);
  if (fb.mainQty > 0) rows.push({ name: 'Доска крышки', t: skinT, w: BOARD_W, l: boardLen, qty: fb.mainQty, overrideKey: 'skinValue' });
  fb.extra.forEach((e, i) => {
    const suffix = fb.extra.length > 1 ? ' ' + (i + 1) : '';
    rows.push({ name: 'Доска крышки (дополнительная)' + suffix, t: skinT, w: e.width, l: boardLen, qty: e.qty, overrideKey: 'skinValue' });
  });
  if (fb.warn) warnings.push('Доска крышки: остаток - нестандартная ширина (вне 75–99 мм).');
  if (fb.singleNarrow) warnings.push('Доска крышки: одна доска уже менее 100 мм.');
  volume += vol(skinT, BOARD_W, boardLen, fb.mainQty)
    + fb.extra.reduce((s2, e) => s2 + vol(skinT, e.width, boardLen, e.qty), 0);

  return { rows, volume, boardGap: fb.gap };
}

module.exports = { buildKryshka };
