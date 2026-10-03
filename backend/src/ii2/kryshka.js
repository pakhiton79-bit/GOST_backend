// ГОСТ 10198-91, тип II-2: крышка - поперечные брусья, продольные брусья
// (только при поперечном расположении досок) и доски с промежутками (как у
// II-1, ../ii1/kryshka.js).
//
// Доски крышки при поперечном расположении продолжают линии досок боковых
// щитов (по указанию пользователя): над боковым щитом (по длине груза L) -
// те же доски и промежутки, что у бокового щита (gapBoards по L), а над
// торцевыми щитами - по крайней доске шириной в толщину торцевого щита
// (стойка + обшивка), вплотную к соседней. Если у бокового щита промежутков
// нет - крышка раскладывается сама по себе (с промежутками по своей длине
// или сплошь). При продольном расположении - с промежутками по наружной
// ширине (так же, как торцевой щит).
const { vol } = require('../helpers');
const { gapBoards, fillGapBoards, BOARD_W } = require('./boards');

// Раскладка досок крышки: { mainQty, capW, extra, warn, singleNarrow, gap }.
// capW - ширина крайней доски над торцевым щитом (0 - крайних нет); gap -
// промежутки ({ qty, gap, share, capW }) или null - крышка сплошная.
function lidBoards(c, s, fillspace) {
  if (c.lidLayout === 'transverse') {
    const side = gapBoards(c.L, c.boardGapMax);
    if (side) {
      const capW = (s.len - c.L) / 2;
      return { mainQty: side.qty, capW, extra: [], warn: false, singleNarrow: false, gap: { ...side, capW } };
    }
  }
  return { ...fillGapBoards(fillspace, c.roundBoardWidths, c.boardGapMax, 'Крышка', c.warnings), capW: 0 };
}

// c - контекст расчёта (см. compute.js); s - согласованные размеры (../ii1/sizing.js).
function buildKryshka(c, s) {
  const { L, W, warnings, skinT, optimizeSizes } = c;
  const rows = [];

  const crossLen = W - (optimizeSizes ? 2 : 0);
  rows.push({ name: 'Внутренний поперечный брус', t: s.crossBeamT, w: s.crossBeamW, l: crossLen, qty: s.crossBeamCount, overrideKey: 't21' });
  let volume = vol(s.crossBeamT, s.crossBeamW, crossLen, s.crossBeamCount);

  // Доски: при поперечном расположении идут поперёк ящика (длина - наружная
  // ширина) и лежат на продольных брусьях; при продольном - вдоль (длина -
  // длина ящика).
  let boardLen, fillspace;
  if (c.lidLayout === 'transverse') {
    const longLen = L + s.stojkaT * 2 - (optimizeSizes ? 2 : 0);
    rows.push({ name: 'Внутренний продольный брус', t: s.longBeamT, w: s.longBeamW, l: longLen, qty: s.longBeamCount, overrideKey: 'tLongbeam' });
    volume += vol(s.longBeamT, s.longBeamW, longLen, s.longBeamCount);
    boardLen = s.outerW;
    fillspace = s.len;
  } else {
    boardLen = s.len;
    fillspace = s.outerW;
  }
  const fb = lidBoards(c, s, fillspace);
  if (fb.mainQty > 0) rows.push({ name: 'Доска крышки', t: skinT, w: BOARD_W, l: boardLen, qty: fb.mainQty, overrideKey: 'skinValue' });
  if (fb.capW > 0) rows.push({ name: 'Доска крышки (крайняя)', t: skinT, w: fb.capW, l: boardLen, qty: 2, overrideKey: 'skinValue' });
  fb.extra.forEach((e, i) => {
    const suffix = fb.extra.length > 1 ? ' ' + (i + 1) : '';
    rows.push({ name: 'Доска крышки (дополнительная)' + suffix, t: skinT, w: e.width, l: boardLen, qty: e.qty, overrideKey: 'skinValue' });
  });
  if (fb.warn) warnings.push('Доска крышки: остаток - нестандартная ширина (вне 75–99 мм).');
  if (fb.singleNarrow) warnings.push('Доска крышки: одна доска уже менее 100 мм.');
  volume += vol(skinT, BOARD_W, boardLen, fb.mainQty) + (fb.capW > 0 ? vol(skinT, fb.capW, boardLen, 2) : 0)
    + fb.extra.reduce((s2, e) => s2 + vol(skinT, e.width, boardLen, e.qty), 0);

  return { rows, volume, boardGap: fb.gap };
}

module.exports = { buildKryshka };
