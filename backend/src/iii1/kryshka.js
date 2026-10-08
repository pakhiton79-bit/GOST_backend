// ГОСТ 10198-91, тип III-1: крышка - доски обшивки (всегда поперёк ящика),
// продольные брусья (доски лежат на них) и поперечные брусья (набиты снизу,
// входят во внутреннюю высоту). Брусья - как горизонтальный брус бокового
// щита (п.1.8.1), продольные и поперечные - одной толщины.
const { vol, fillBoards } = require('../helpers');

// c - контекст расчёта (см. compute.js); s - согласованные размеры (sizing.js).
function buildKryshka(c, s) {
  const { W, warnings, skinT } = c;
  const rows = [];

  // Доски - поперёк ящика на всю наружную ширину (ширина груза + стойки и
  // обшивка боковых щитов, по указанию пользователя), занимают наружную длину.
  const boardLen = s.outerW;
  const fb = fillBoards(s.len, c.roundBoardWidths);
  if (fb.mainQty > 0) rows.push({ name: 'Доска крышки', t: skinT, w: 100, l: boardLen, qty: fb.mainQty, overrideKey: 'skinValue' });
  fb.extra.forEach((e, i) => {
    const suffix = fb.extra.length > 1 ? ' ' + (i + 1) : '';
    rows.push({ name: 'Доска крышки (дополнительная)' + suffix, t: skinT, w: e.width, l: boardLen, qty: e.qty, overrideKey: 'skinValue' });
  });
  if (fb.warn) warnings.push('Доска крышки: остаток - нестандартная ширина (вне 75–99 мм).');
  if (fb.singleNarrow) warnings.push('Доска крышки: одна доска уже менее 100 мм.');
  let volume = vol(skinT, 100, boardLen, fb.mainQty) + fb.extra.reduce((s2, e) => s2 + vol(skinT, e.width, boardLen, e.qty), 0);
  // Поперечные брусья: ширина груза + обшивка боковых щитов; в оптимальном
  // варианте (c.optimized) - по ширине груза.
  const crossLen = c.optimized ? W : W + skinT * 2;
  rows.push({ name: 'Поперечный брус крышки', t: s.lidBeamT, w: s.beamW, l: crossLen, qty: s.crossBeamCount, overrideKey: 'tLidBeam' });
  volume += vol(s.lidBeamT, s.beamW, crossLen, s.crossBeamCount);

  const longLen = s.len;
  rows.push({ name: 'Продольный брус крышки', t: s.lidBeamT, w: s.beamW, l: longLen, qty: s.longBeamCount, overrideKey: 'tLidBeam' });
  volume += vol(s.lidBeamT, s.beamW, longLen, s.longBeamCount);

  return { rows, volume };
}

module.exports = { buildKryshka };
