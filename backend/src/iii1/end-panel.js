// ГОСТ 10198-91, тип III-1: щит торцевой (расчёт на 1 щит, щитов 2). Щит -
// по ширине груза, между боковыми щитами, высотой с груз.
const { vol, fillBoards } = require('../helpers');

// c - контекст расчёта; s - согласованные размеры; frame - каркас (frame.js);
// rask - толщина и ширина раскосины.
function buildEndPanel(c, s, frame, rask) {
  const { W, warnings, skinT } = c;
  // Каркас - горизонтальные брусья (низ и верх, + средний при 2 этажах) и
  // стойки одной толщины (Табл. 12).
  const horiz = { t: s.torFrameT, w: s.beamW, l: W, qty: frame.floors + 1 };
  const stojka = { t: s.torFrameT, w: 100, l: frame.len, qty: frame.count * frame.floors };
  const raskLen = Math.sqrt(Math.pow(frame.sectionW, 2) + Math.pow(frame.len, 2));
  const raskQty = frame.hasRaskosina ? (frame.count - 1) * frame.floors : 0;

  // Доски обшивки - на высоту щита (высота груза; в оптимальном варианте +
  // толщина досок дна), занимают ширину груза.
  const boardLen = c.panelH;
  const fb = fillBoards(W, c.roundBoardWidths);
  if (fb.warn) warnings.push('Доска обшивки торца: остаток - нестандартная ширина (вне 75–99 мм).');
  if (fb.singleNarrow) warnings.push('Доска обшивки торца: одна доска уже менее 100 мм.');

  // X-образные раскосины: к каждой раскосине - встречная из 2 кусков по
  // (длина - ширина) / 2, та же толщина.
  const withX = c.xRaskosina && frame.hasRaskosina;
  const rows = [
    { name: 'Горизонтальный брус', t: horiz.t, w: horiz.w, l: horiz.l, qty: horiz.qty, overrideKey: 'tTorFrame' },
    { name: 'Стойка', t: stojka.t, w: stojka.w, l: stojka.l, qty: stojka.qty, overrideKey: 'tTorFrame' },
  ];
  if (frame.hasRaskosina) rows.push({ name: 'Раскосина', t: rask.t, w: rask.w, l: raskLen, qty: raskQty, overrideKey: 'tRaskosina' });
  if (withX) rows.push({ name: 'Раскосина (дополнительная)', t: rask.t, w: rask.w, l: (raskLen - rask.w) / 2, qty: raskQty * 2, overrideKey: 'tRaskosina' });
  if (fb.mainQty > 0) rows.push({ name: 'Доска обшивки', t: skinT, w: 100, l: boardLen, qty: fb.mainQty, overrideKey: 'skinValue' });
  fb.extra.forEach((e, i) => {
    const suffix = fb.extra.length > 1 ? ' ' + (i + 1) : '';
    rows.push({ name: 'Доска обшивки (дополнительная)' + suffix, t: skinT, w: e.width, l: boardLen, qty: e.qty, overrideKey: 'skinValue' });
  });

  const volume = vol(stojka.t, stojka.w, stojka.l, stojka.qty) + vol(horiz.t, horiz.w, horiz.l, horiz.qty)
    + vol(rask.t, rask.w, raskLen, raskQty)
    + vol(skinT, 100, boardLen, fb.mainQty) + fb.extra.reduce((s2, e) => s2 + vol(skinT, e.width, boardLen, e.qty), 0)
    + (withX ? vol(rask.t, rask.w, (raskLen - rask.w) / 2, raskQty * 2) : 0);

  return { rows, volume };
}

module.exports = { buildEndPanel };
