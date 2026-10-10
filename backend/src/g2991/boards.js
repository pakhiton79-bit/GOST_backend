// ГОСТ 2991-85: доски щитов - общее для всех типов. Ширины досок с учётом
// «в наличии», строки таблицы деталей, объём, порядок досок в щите и стыки.
const { vol } = require('../helpers');
const { G2991_WIDTH_OPTIONS, G2991_MAIN_WIDTH_DEFAULT } = require('./table2');

// Доски торца типа I (по указанию пользователя - пошире основных, чтобы
// стыки торца не совпадали со стыками бока).
const G2991_TOREC_BOARD_W = 150;

// Ширина «в наличии» для доски шириной w: ближайшая не уже w, а если все
// уже - самая широкая (одна ширина в наличии - всегда она). Ничего не
// выбрано - w. widths - по возрастанию.
function g2991StockWidth(w, widths) {
  if (!widths || !widths.length) return w;
  const up = widths.find(v => v >= w);
  return up === undefined ? widths[widths.length - 1] : up;
}

// Ширины досок типа (по указанию пользователя): основная - выбирается внутри
// типа (по умолчанию 100 мм), доски торца типа I - 150 мм; обе - вверх до
// ширины «в наличии».
function g2991BoardWidths(mainWidth, widths) {
  const main = G2991_WIDTH_OPTIONS.includes(mainWidth) ? mainWidth : G2991_MAIN_WIDTH_DEFAULT;
  return { main: g2991StockWidth(main, widths), torec: g2991StockWidth(G2991_TOREC_BOARD_W, widths) };
}

// Строки таблицы деталей по раскладке g2991FillBoards: основные доски, затем
// доборные (как в ГОСТ 10198-91). Этот же порядок - снизу вверх на чертеже.
function g2991BoardRows(name, t, l, fb, mainW) {
  const rows = [];
  if (fb.mainQty > 0) rows.push({ name, t, w: mainW, l, qty: fb.mainQty });
  fb.extra.forEach((e, i) => rows.push({ name: `${name} (дополнительная)${fb.extra.length > 1 ? ' ' + (i + 1) : ''}`, t, w: e.width, l, qty: e.qty }));
  return rows;
}
const g2991RowsVolume = rows => rows.reduce((s, r) => s + vol(r.t, r.w, r.l, r.qty), 0);

// Ширины досок раскладки по порядку и стыки между ними (от начала щита;
// стыки за краем щита - у подрезаемой последней доски - не считаются).
const g2991LayoutWidths = (fb, mainW) => [...Array(fb.mainQty).fill(mainW), ...fb.extra.flatMap(e => Array(e.qty).fill(e.width))];
function g2991Joints(widths, space) {
  const res = [];
  let pos = 0;
  widths.slice(0, -1).forEach(w => { pos += w; if (pos < space) res.push(pos); });
  return res;
}

if (typeof module !== 'undefined') module.exports = { G2991_TOREC_BOARD_W, g2991StockWidth, g2991BoardWidths, g2991BoardRows, g2991RowsVolume, g2991LayoutWidths, g2991Joints };
