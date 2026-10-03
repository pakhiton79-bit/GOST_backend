// ГОСТ 10198-91, тип II-1: щит боковой (расчёт на 1 щит, щитов 2).
const { vol, fillBoards } = require('../helpers');
const { STOJKA_W } = require('./frame');

// c - контекст расчёта; s - согласованные размеры; frame - каркас (frame.js);
// rask - толщина и ширина раскосины.
function buildBokovoy(c, s, frame, rask) {
  const { L, warnings, skinT } = c;
  const stojka = { t: s.stojkaT, w: 100, l: frame.len, qty: frame.count * frame.floors };
  // Горизонтальные брусья: низ и верх рамы (+ между этажами).
  const horiz = { t: s.stojkaT, w: 100, l: L, qty: frame.floors + 1 };
  const raskLen = Math.sqrt(Math.pow(frame.sectionW, 2) + Math.pow(frame.len, 2));
  const raskQty = frame.hasRaskosina ? (frame.count - 1) * frame.floors : 0;

  // Опорная планка - несёт поперечные брусья крышки: толщина - доска
  // обшивки, ширина - ширина стойки минус толщина поперечного бруса (вниз до
  // целого, в пределах 50-75 мм), длина - как у горизонтального бруса.
  const opora = { t: skinT, w: Math.min(75, Math.max(50, Math.floor(STOJKA_W - s.crossBeamT))), l: horiz.l, qty: 2 };

  // Доски обшивки - на длину груза + толщину стойки торцевого щита с
  // каждой стороны (по указанию пользователя: заходят на торцы стоек
  // торцевых щитов; доски торца - по наружной ширине - закрывают их концы).
  const boardLen = 100 * 2 + frame.len + s.longBeamT;
  const fb = fillBoards(L + s.stojkaT * 2, c.roundBoardWidths);
  const boardQty = fb.mainQty * frame.floors;
  if (fb.warn) warnings.push('Доска бока: остаток - нестандартная ширина (вне 75–99 мм).');
  if (fb.singleNarrow) warnings.push('Доска бока: одна доска уже менее 100 мм.');

  // X-образные раскосины: к каждой раскосине - встречная из 2 кусков по
  // (длина - ширина) / 2, та же толщина.
  const withX = c.xRaskosina && frame.hasRaskosina;
  const rows = [
    { name: 'Стойка', t: stojka.t, w: stojka.w, l: stojka.l, qty: stojka.qty, overrideKey: 'tStojka' },
  ];
  if (horiz.qty > 0) rows.push({ name: 'Горизонтальный брус', t: horiz.t, w: horiz.w, l: horiz.l, qty: horiz.qty, overrideKey: 'tStojka' });
  if (frame.hasRaskosina) rows.push({ name: 'Раскосина', t: rask.t, w: rask.w, l: raskLen, qty: raskQty, overrideKey: 'tRaskosina' });
  if (withX) rows.push({ name: 'Раскосина (дополнительная)', t: rask.t, w: rask.w, l: (raskLen - rask.w) / 2, qty: raskQty * 2, overrideKey: 'tRaskosina' });
  rows.push({ name: 'Опорная планка', t: opora.t, w: opora.w, l: opora.l, qty: opora.qty, overrideKey: 'skinValue' });
  if (boardQty > 0) rows.push({ name: 'Доска', t: skinT, w: 100, l: boardLen, qty: boardQty, overrideKey: 'skinValue' });
  fb.extra.forEach((e, i) => {
    const suffix = fb.extra.length > 1 ? ' ' + (i + 1) : '';
    rows.push({ name: 'Доска (дополнительная)' + suffix, t: skinT, w: e.width, l: boardLen, qty: e.qty * frame.floors, overrideKey: 'skinValue' });
  });

  const volume = vol(stojka.t, stojka.w, stojka.l, stojka.qty) + vol(horiz.t, horiz.w, horiz.l, horiz.qty)
    + vol(rask.t, rask.w, raskLen, raskQty) + vol(opora.t, opora.w, opora.l, opora.qty)
    + vol(skinT, 100, boardLen, boardQty) + fb.extra.reduce((s2, e) => s2 + vol(skinT, e.width, boardLen, e.qty * frame.floors), 0)
    + (withX ? vol(rask.t, rask.w, (raskLen - rask.w) / 2, raskQty * 2) : 0);

  return { rows, volume };
}

module.exports = { buildBokovoy };
