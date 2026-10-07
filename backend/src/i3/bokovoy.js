// ГОСТ 10198-91, тип I-3: щит боковой (расчёт на 1 щит, щитов 2).
// Вертикальные планки стоят по поясам крышки.
const { vol, fillBoards } = require('../helpers');
const { floorsForHeight } = require('./end-panel');
const { PLANK_W, RASKOSINA_W } = require('./plank-layout');

const MAX_OVERHANG = 70;

// c - контекст расчёта (см. compute.js); p - размеры из других узлов:
//   len         - длина щита (= длина полоза);
//   t12, skidT  - толщины доски дна и полоза;
//   plankQty    - число поясов планок (из крышки);
//   sectionW    - шаг поясов по осям (зазор + ширина планки), 0 при 1 поясе.
function buildBokovoy(c, p) {
  const { H, wall, warnings } = c;
  const { len, t12, skidT, plankQty, sectionW } = p;
  const hFull = H + t12;

  // Раскосины - у щита выше 600 мм и с 2+ поясами (галочка «Добавить
  // раскосины» - при любой высоте; при 1 поясе раскосину ставить некуда).
  // 2 этажа - по высоте груза (как у торца) или если на 1 этаже угол
  // раскосины вышел бы больше 60°.
  const hasRaskosina = (H > 600 || c.addRaskosina) && plankQty > 1;
  if (c.addRaskosina && plankQty <= 1) {
    warnings.push('Щит боковой: раскосину не поставить - у крышки один пояс планок (нужно хотя бы два).');
  }
  const angle1FloorDeg = sectionW > 0 ? Math.atan2(hFull, sectionW) * 180 / Math.PI : null;
  const floors = (floorsForHeight(H) === 2 || (hasRaskosina && angle1FloorDeg !== null && angle1FloorDeg > 60)) ? 2 : 1;

  // Средняя горизонтальная планка (только на 2 этажах) - во всю длину щита.
  const horiz = { l: len, qty: floors === 2 ? 1 : 0 };
  // Вертикальные планки заходят на полоз на 2/3 его толщины (не более 70 мм).
  const overhang = Math.min(skidT * 2 / 3, MAX_OVERHANG);
  const plankFull = hFull + overhang;
  const vert = { l: floors === 2 ? (plankFull - PLANK_W) / 2 : plankFull, qty: plankQty * floors };

  const fb = fillBoards(hFull, c.roundBoardWidths);
  if (fb.warn) warnings.push('Доска бока: остаток - нестандартная ширина (вне 75–99 мм).');
  if (fb.singleNarrow) warnings.push('Доска бока: одна доска уже менее 100 мм.');

  // Раскосина - по диагонали секции одного этажа.
  const vertSpan = floors === 2 ? (hFull - PLANK_W) / 2 : hFull;
  const rask = { l: Math.sqrt(Math.pow(sectionW, 2) + Math.pow(vertSpan, 2)), qty: hasRaskosina ? (plankQty - 1) * floors : 0 };
  if (hasRaskosina && sectionW > 0) {
    const angleDeg = Math.atan2(vertSpan, sectionW) * 180 / Math.PI;
    if (angleDeg < 20 || angleDeg > 60) {
      warnings.push(`Угол раскосины бокового щита ${Math.round(angleDeg)}° вне 20–60° - нужна консультация конструктора.`);
    }
  }

  const withX = c.xRaskosina && hasRaskosina; // X-образные - как у торца
  const volume = vol(wall, PLANK_W, vert.l, vert.qty) + vol(wall, 100, len, fb.mainQty)
    + fb.extra.reduce((s, e) => s + vol(wall, e.width, len, e.qty), 0)
    + vol(wall, RASKOSINA_W, rask.l, rask.qty) + vol(wall, PLANK_W, horiz.l, horiz.qty)
    + (withX ? vol(wall, RASKOSINA_W, (rask.l - RASKOSINA_W) / 2, rask.qty * 2) : 0);

  const rows = [
    { name: 'Вертикальная планка', t: wall, w: PLANK_W, l: vert.l, qty: vert.qty, overrideKey: 'wallValue' },
  ];
  if (fb.mainQty > 0) rows.push({ name: 'Доска бока', t: wall, w: 100, l: len, qty: fb.mainQty, overrideKey: 'wallValue' });
  fb.extra.forEach((e, i) => {
    const suffix = fb.extra.length > 1 ? ' ' + (i + 1) : '';
    rows.push({ name: 'Доска бока (дополнительная)' + suffix, t: wall, w: e.width, l: len, qty: e.qty, overrideKey: 'wallValue' });
  });
  if (horiz.qty > 0) rows.push({ name: 'Горизонтальная планка', t: wall, w: PLANK_W, l: horiz.l, qty: horiz.qty, overrideKey: 'wallValue' });
  if (hasRaskosina) rows.push({ name: 'Раскосина', t: wall, w: RASKOSINA_W, l: rask.l, qty: rask.qty, overrideKey: 'wallValue' });
  if (withX) rows.push({ name: 'Раскосина (дополнительная)', t: wall, w: RASKOSINA_W, l: (rask.l - RASKOSINA_W) / 2, qty: rask.qty * 2, overrideKey: 'wallValue' });

  return { rows, volume, floors, overhang, vertLen: vert.l, vertSpan, raskQty: rask.qty, horizW: PLANK_W };
}

module.exports = { buildBokovoy };
