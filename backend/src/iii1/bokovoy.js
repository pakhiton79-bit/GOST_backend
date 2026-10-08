// ГОСТ 10198-91, тип III-1: щит боковой (расчёт на 1 щит, щитов 2). Щит -
// на всю наружную длину ящика, высотой с груз.
const { vol, fillBoards } = require('../helpers');

// Опорная планка крышки (п.1.8.2): ширина 50-75 мм - берём 75 мм (по
// указанию пользователя), длина - длина груза.
const OPORA_W = 75; // по ГОСТ, на имеющуюся ширину не округляется (по указанию пользователя)

// c - контекст расчёта; s - согласованные размеры; frame - каркас (frame.js);
// rask - толщина и ширина раскосины.
function buildBokovoy(c, s, frame, rask) {
  const { L, warnings, skinT } = c;
  // Каркас - горизонтальные брусья (низ и верх, + средний при 2 этажах) и
  // стойки одной толщины (Табл. 12).
  const horiz = { t: s.bokFrameT, w: s.beamW, l: s.len, qty: frame.floors + 1 };
  const stojka = { t: s.bokFrameT, w: 100, l: frame.len, qty: frame.count * frame.floors };
  const raskLen = Math.sqrt(Math.pow(frame.sectionW, 2) + Math.pow(frame.len, 2));
  const raskQty = frame.hasRaskosina ? (frame.count - 1) * frame.floors : 0;

  // Доски обшивки - на высоту щита (высота груза; в оптимальном варианте +
  // толщина досок дна), занимают наружную длину ящика.
  const boardLen = c.panelH;
  const fb = fillBoards(s.len, c.roundBoardWidths);
  if (fb.warn) warnings.push('Доска обшивки бока: остаток - нестандартная ширина (вне 75–99 мм).');
  if (fb.singleNarrow) warnings.push('Доска обшивки бока: одна доска уже менее 100 мм.');

  // Опорная планка - толщина как у обшивки.
  const opora = { t: skinT, w: OPORA_W, l: L, qty: 2 };

  // X-образные раскосины: к каждой раскосине - встречная из 2 кусков по
  // (длина - ширина) / 2, та же толщина.
  const withX = c.xRaskosina && frame.hasRaskosina;
  const rows = [
    { name: 'Горизонтальный брус', t: horiz.t, w: horiz.w, l: horiz.l, qty: horiz.qty, overrideKey: 'tBokFrame' },
    { name: 'Стойка', t: stojka.t, w: stojka.w, l: stojka.l, qty: stojka.qty, overrideKey: 'tBokFrame' },
  ];
  if (frame.hasRaskosina) rows.push({ name: 'Раскосина', t: rask.t, w: rask.w, l: raskLen, qty: raskQty, overrideKey: 'tRaskosina' });
  if (withX) rows.push({ name: 'Раскосина (дополнительная)', t: rask.t, w: rask.w, l: (raskLen - rask.w) / 2, qty: raskQty * 2, overrideKey: 'tRaskosina' });
  if (fb.mainQty > 0) rows.push({ name: 'Доска обшивки', t: skinT, w: 100, l: boardLen, qty: fb.mainQty, overrideKey: 'skinValue' });
  fb.extra.forEach((e, i) => {
    const suffix = fb.extra.length > 1 ? ' ' + (i + 1) : '';
    rows.push({ name: 'Доска обшивки (дополнительная)' + suffix, t: skinT, w: e.width, l: boardLen, qty: e.qty, overrideKey: 'skinValue' });
  });
  rows.push({ name: 'Опорная планка', t: opora.t, w: opora.w, l: opora.l, qty: opora.qty, overrideKey: 'skinValue' });

  const volume = vol(stojka.t, stojka.w, stojka.l, stojka.qty) + vol(horiz.t, horiz.w, horiz.l, horiz.qty)
    + vol(rask.t, rask.w, raskLen, raskQty) + vol(opora.t, opora.w, opora.l, opora.qty)
    + vol(skinT, 100, boardLen, fb.mainQty) + fb.extra.reduce((s2, e) => s2 + vol(skinT, e.width, boardLen, e.qty), 0)
    + (withX ? vol(rask.t, rask.w, (raskLen - rask.w) / 2, raskQty * 2) : 0);

  return { rows, volume };
}

module.exports = { buildBokovoy };
