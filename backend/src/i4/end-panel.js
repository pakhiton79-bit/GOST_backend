// ГОСТ 10198-91, тип I-4: щит торцевой (расчёт на 1 щит, щитов 2).
const { vol } = require('../helpers');
const { fillGapBoards } = require('./boards');
const { PLANK_W, RASKOSINA_W } = require('./plank-layout');

const MIN_ANGLE = 20, MAX_ANGLE = 60; // допустимый угол раскосины, °

// Этажи - по высоте ГРУЗА: до 2000 мм включительно 1 этаж, выше - 2 (средняя
// горизонтальная планка делит щит пополам).
function floorsForHeight(H) {
  return H > 2000 ? 2 : 1;
}

// c - контекст расчёта (см. compute.js); t12 - толщина доски дна (щит
// закрывает груз и доску дна).
function buildEndPanel(c, t12) {
  const { W, H, wall, warnings } = c;
  const floors = floorsForHeight(H);
  const hFull = H + t12;

  // Горизонтальные планки: низ и верх (+ середина на 2 этажах), длина = ширина груза.
  const horiz = { l: W, qty: floors === 2 ? 3 : 2 };
  // Вертикальные планки - между горизонтальными, на каждый этаж.
  const vertLen = floors === 2 ? (hFull - PLANK_W * 3) / 2 : hFull - PLANK_W * 2;

  // Секции по ширине: добавляются, пока угол раскосины меньше 20° (и есть
  // место под ещё одну вертикальную планку). Раскосины нет у низкого или
  // узкого щита (≤ 600 мм) и у одной секции с углом больше 60°.
  const sectionWidth = n => (W - PLANK_W * (n + 1)) / n;
  const angleDeg = n => Math.atan2(vertLen, sectionWidth(n)) * 180 / Math.PI;
  let sections = 1;
  if (H > 600 && W > 600) {
    while (angleDeg(sections) < MIN_ANGLE && sectionWidth(sections + 1) > 0) sections++;
    if (angleDeg(sections) < MIN_ANGLE) {
      warnings.push(`Щит торцевой: угол раскосины <20° даже при максимуме секций (${sections}) - больше не добавить, не хватает места (по ${PLANK_W} мм на планку).`);
    }
  }
  const hasRaskosina = H > 600 && W > 600 && !(sections === 1 && angleDeg(1) > MAX_ANGLE);
  const vertQty = (sections + 1) * floors;
  const rask = { l: Math.sqrt(Math.pow(sectionWidth(sections), 2) + Math.pow(vertLen, 2)), qty: hasRaskosina ? sections * floors : 0 };

  const fb = fillGapBoards(hFull, c.roundBoardWidths, c.boardGapShare, 'Щит торцевой', warnings);
  if (fb.warn) warnings.push('Доска торца: остаток - нестандартная ширина (вне 75–99 мм).');
  if (fb.singleNarrow) warnings.push('Доска торца: одна доска уже менее 100 мм.');

  // X-образные раскосины: к каждой раскосине - встречная из 2 кусков по
  // (длина - ширина) / 2.
  const withX = c.xRaskosina && hasRaskosina;
  const rows = [
    { name: 'Вертикальная планка', t: wall, w: PLANK_W, l: vertLen, qty: vertQty, overrideKey: 'wallValue' },
    { name: 'Горизонтальная планка', t: wall, w: PLANK_W, l: horiz.l, qty: horiz.qty, overrideKey: 'wallValue' },
  ];
  if (hasRaskosina) rows.push({ name: 'Раскосина', t: wall, w: RASKOSINA_W, l: rask.l, qty: rask.qty, overrideKey: 'wallValue' });
  if (withX) rows.push({ name: 'Раскосина (дополнительная)', t: wall, w: RASKOSINA_W, l: (rask.l - RASKOSINA_W) / 2, qty: rask.qty * 2, overrideKey: 'wallValue' });
  if (fb.mainQty > 0) rows.push({ name: 'Доска торца', t: wall, w: 100, l: W, qty: fb.mainQty, overrideKey: 'wallValue' });
  fb.extra.forEach((e, i) => {
    const suffix = fb.extra.length > 1 ? ' ' + (i + 1) : '';
    rows.push({ name: 'Доска торца (дополнительная)' + suffix, t: wall, w: e.width, l: W, qty: e.qty, overrideKey: 'wallValue' });
  });

  const volume = (vol(wall, PLANK_W, vertLen, vertQty) + vol(wall, PLANK_W, horiz.l, horiz.qty)
    + vol(wall, 100, W, fb.mainQty) + fb.extra.reduce((s, e) => s + vol(wall, e.width, W, e.qty), 0)
    + vol(wall, RASKOSINA_W, rask.l, rask.qty))
    + (withX ? vol(wall, RASKOSINA_W, (rask.l - RASKOSINA_W) / 2, rask.qty * 2) : 0);

  return {
    rows, volume, floors, sections, hasRaskosina, boardLen: W, floorSpan: vertLen + PLANK_W, boardGap: fb.gap,
    // Чертёж «без раскосины» (рамка) - кроме случая H > 600 при W ≤ 600.
    noRaskosinaDiagram: !hasRaskosina && (H <= 600 || W > 600),
  };
}

module.exports = { buildEndPanel, floorsForHeight };
