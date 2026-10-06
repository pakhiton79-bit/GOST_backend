// ГОСТ 10198-91, тип I-1: строки таблицы деталей для каждого узла ящика.
// Строка детали: { name, t, w, l, qty, overrideKey } - толщина, ширина,
// длина (мм), количество на один узел и ключ ручной правки толщины
// (manualOverrides). Щиты торцевой и боковой считаются на 1 щит (их по 2).
const { fillBoards } = require('../helpers');

const PLANK_W = 100;     // ширина планок, полоза и основных досок
const RASKOSINA_W = 100; // ширина раскосины

// Доски, закрывающие пространство span (мм): основные по 100 мм + 1-2
// дополнительные на остаток (см. fillBoards). len - длина каждой доски.
function boardRows(name, t, span, len, roundBoardWidths, overrideKey) {
  const fb = fillBoards(span, roundBoardWidths);
  const rows = [];
  if (fb.mainQty > 0) rows.push({ name, t, w: PLANK_W, l: len, qty: fb.mainQty, overrideKey });
  fb.extra.forEach((e, i) => {
    const suffix = fb.extra.length > 1 ? ' ' + (i + 1) : '';
    rows.push({ name: name + ' (дополнительная)' + suffix, t, w: e.width, l: len, qty: e.qty, overrideKey });
  });
  return rows;
}

// g - геометрия ящика (см. compute.js):
//   L, W, H          - размеры груза;
//   T                - толщины деталей (T.dnoPlanka ... T.torRask);
//   skidT            - толщина полоза (null - полоза нет);
//   kLen             - длина досок дна, крышки и бокового щита;
//   plankQty         - число поясов планок;
//   horizPlankaLen   - длина горизонтальной планки торца;
//   roundBoardWidths - галочка «Округлить ширину досок».

// Дно: полоз (или планка, если полоз не нужен) + доски дна.
function buildDno(g) {
  const { W, T, skidT, kLen, plankQty, roundBoardWidths } = g;
  const rows = [];
  let width;
  if (skidT !== null) {
    width = W + T.bokBoard * 2;
    rows.push({ name: 'Полоз', t: skidT, w: PLANK_W, l: width, qty: plankQty, overrideKey: 't9Value' });
  } else {
    // По указанию пользователя: планка дна - как полоз и как значение справа
    // на чертежах дна и крышки: ширина груза + 2 доски бокового щита (планки
    // бока стоят снаружи по её торцам).
    width = W + T.bokBoard * 2;
    rows.push({ name: 'Планка', t: T.dnoPlanka, w: PLANK_W, l: width, qty: plankQty, overrideKey: 'tDnoPlanka' });
  }
  rows.push(...boardRows('Доска дна', T.dnoBoard, W + T.bokBoard * 2, kLen, roundBoardWidths, 'tDnoBoard'));
  return { rows, width };
}

// Длина планки крышки (она же ширина крышки на чертеже).
function kryshkaPlankLen(g) {
  return g.W + (g.T.bokBoard + g.T.bokPlanka) * 2;
}

// Крышка: планки + доски крышки.
function buildKryshka(g) {
  const { W, T, kLen, plankQty, roundBoardWidths } = g;
  return [
    { name: 'Планка', t: T.krPlanka, w: PLANK_W, l: kryshkaPlankLen(g), qty: plankQty, overrideKey: 'tKrPlanka' },
    ...boardRows('Доска крышки', T.krBoard, W + T.bokBoard * 2, kLen, roundBoardWidths, 'tKrBoard'),
  ];
}

// Боковой щит: планки + доски. Длина планки = полоз (без полоза - планка
// дна) + доска дна + высота груза + доска крышки.
function buildBokovoy(g) {
  const { H, T, skidT, kLen, plankQty, roundBoardWidths } = g;
  const bottomSupport = skidT !== null ? skidT : T.dnoPlanka;
  return [
    { name: 'Планка', t: T.bokPlanka, w: PLANK_W, l: bottomSupport + T.dnoBoard + H + T.krBoard, qty: plankQty, overrideKey: 'tBokPlanka' },
    ...boardRows('Доска бокового щита', T.bokBoard, H, kLen, roundBoardWidths, 'tBokBoard'),
  ];
}

// Торцевой щит: 2 вертикальные и 2 горизонтальные планки + доски.
function buildTorec(g) {
  const { W, H, T, horizPlankaLen, roundBoardWidths } = g;
  return [
    { name: 'Вертикальная планка', t: T.torPlanka, w: PLANK_W, l: H, qty: 2, overrideKey: 'tTorPlanka' },
    { name: 'Горизонтальная планка', t: T.torPlanka, w: PLANK_W, l: horizPlankaLen, qty: 2, overrideKey: 'tTorPlanka' },
    ...boardRows('Доска торцевого щита', T.torBoard, H, W, roundBoardWidths, 'tTorBoard'),
  ];
}

// Длина диагонали прямоугольника a×b.
function diagonal(a, b) {
  return Math.sqrt(a * a + b * b);
}

// Раскосина длиной len; при X-образных (xRaskosina) к ней добавляется
// встречная из двух кусков по (len - ширина) / 2 - кусков вдвое больше.
function raskosinaRows(len, qty, t, overrideKey, xRaskosina) {
  const rows = [{ name: 'Раскосина', t, w: RASKOSINA_W, l: len, qty, overrideKey }];
  if (xRaskosina) {
    rows.push({ name: 'Раскосина (дополнительная)', t, w: RASKOSINA_W, l: (len - RASKOSINA_W) / 2, qty: qty * 2, overrideKey });
  }
  return rows;
}

// Раскосины всех узлов - дописываются в конец их таблиц. Торец - всегда 1
// раскосина по диагонали между планками; бок, крышка и дно - по одной в
// каждом промежутке между поясами планок. Крышку и дно можно исключить
// галочкой «Убрать раскосины крышки и дна» (withLidBottom = false).
// Возвращает текст ошибки, если раскосине торца не хватает места.
function addRaskosiny(parts, g, plankGap, withLidBottom, xRaskosina) {
  const { W, H, T, plankQty, horizPlankaLen } = g;
  const torecLegH = H - 200;
  const torecLegW = horizPlankaLen - 200;
  if (torecLegH <= 0 || torecLegW <= 0) {
    return `Недостаточно места для раскосины торца (катеты должны быть >0, получено ${Math.round(torecLegH)}×${Math.round(torecLegW)} мм) - расчёт не выполняется.`;
  }
  parts.torec.push(...raskosinaRows(diagonal(torecLegH, torecLegW), 1, T.torRask, 'tTorRask', xRaskosina));

  const qty = plankQty - 1;
  if (!(qty > 0)) return null;
  parts.bokovoy.push(...raskosinaRows(diagonal(H, plankGap), qty, T.bokRask, 'tBokRask', xRaskosina));
  if (!withLidBottom) return null;
  parts.kryshka.push(...raskosinaRows(diagonal(kryshkaPlankLen(g), plankGap), qty, T.krRask, 'tKrRask', xRaskosina));
  parts.dno.push(...raskosinaRows(diagonal(W + T.bokBoard * 2, plankGap), qty, T.dnoRask, 'tDnoRask', xRaskosina));
  return null;
}

// Лента обшивки торцов - по периметру торца: длина одной ленты = (ширина
// груза + 2 доски бока + высота груза + доска крышки + доска дна) × 2, лент 2.
// Не пиломатериал - в объём не входит.
function endTapeRows(g) {
  const { W, H, T } = g;
  return [{ name: 'Обшивочная лента', l: Math.ceil(((W + T.bokBoard * 2) + (H + T.krBoard + T.dnoBoard)) * 2 - 1e-9), qty: 2 }];
}

// Пергамин: площадь внутренних поверхностей ящика 2×(Д×Ш + Д×В + Ш×В), м²,
// вверх до 0.01. В объём не входит.
function parchmentRows(g) {
  const { L, W, H } = g;
  return [{ name: 'Пергамин', area: Math.ceil(2 * (L * W + L * H + W * H) / 1e6 * 100 - 1e-9) / 100 }];
}

module.exports = { buildDno, buildKryshka, buildBokovoy, buildTorec, kryshkaPlankLen, addRaskosiny, endTapeRows, parchmentRows };
