// ГОСТ 10198-91, тип II-1: щит торцевой (расчёт на 1 щит, щитов 2).
const { vol, fillBoards } = require('../helpers');

// c - контекст расчёта; s - согласованные размеры; frame - каркас (frame.js);
// rask - толщина и ширина раскосины.
function buildEndPanel(c, s, frame, rask) {
  const { W, warnings, skinT } = c;
  const stojka = { t: s.stojkaT, w: 100, l: frame.len, qty: frame.count * frame.floors };
  const horiz = { t: s.stojkaT, w: 100, l: W + s.stojkaT * 2, qty: frame.floors + 1 };
  const raskLen = Math.sqrt(Math.pow(frame.sectionW, 2) + Math.pow(frame.len, 2));
  const raskQty = frame.hasRaskosina ? (frame.count - 1) * frame.floors : 0;

  // Доски обшивки - на каждый этаж, по наружной ширине ящика.
  const boardLen = 100 * 2 + frame.len + s.longBeamT;
  const fb = fillBoards(s.outerW, c.roundBoardWidths);
  const boardQty = fb.mainQty * frame.floors;
  if (fb.warn) warnings.push('Доска торца: остаток — нестандартная ширина (вне 75–99 мм).');
  if (fb.singleNarrow) warnings.push('Доска торца: одна доска уже менее 100 мм.');

  // X-образные раскосины: к каждой раскосине - встречная из 2 кусков по
  // (длина - ширина) / 2, та же толщина.
  const withX = c.xRaskosina && frame.hasRaskosina;
  const rows = [
    { name: 'Стойка', t: stojka.t, w: stojka.w, l: stojka.l, qty: stojka.qty, overrideKey: 'tStojka' },
    { name: 'Горизонтальный брус', t: horiz.t, w: horiz.w, l: horiz.l, qty: horiz.qty, overrideKey: 'tStojka' },
  ];
  if (frame.hasRaskosina) rows.push({ name: 'Раскосина', t: rask.t, w: rask.w, l: raskLen, qty: raskQty, overrideKey: 'tRaskosina' });
  if (withX) rows.push({ name: 'Раскосина (дополнительная)', t: rask.t, w: rask.w, l: (raskLen - rask.w) / 2, qty: raskQty * 2, overrideKey: 'tRaskosina' });
  if (boardQty > 0) rows.push({ name: 'Доска', t: skinT, w: 100, l: boardLen, qty: boardQty, overrideKey: 'skinValue' });
  fb.extra.forEach((e, i) => {
    const suffix = fb.extra.length > 1 ? ' ' + (i + 1) : '';
    rows.push({ name: 'Доска (дополнительная)' + suffix, t: skinT, w: e.width, l: boardLen, qty: e.qty * frame.floors, overrideKey: 'skinValue' });
  });

  const volume = vol(stojka.t, stojka.w, stojka.l, stojka.qty) + vol(horiz.t, horiz.w, horiz.l, horiz.qty)
    + vol(rask.t, rask.w, raskLen, raskQty)
    + vol(skinT, 100, boardLen, boardQty) + fb.extra.reduce((s2, e) => s2 + vol(skinT, e.width, boardLen, e.qty), 0)
    + (withX ? vol(rask.t, rask.w, (raskLen - rask.w) / 2, raskQty * 2) : 0);

  return { rows, volume };
}

module.exports = { buildEndPanel };
