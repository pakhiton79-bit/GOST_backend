// ГОСТ 10198-91, тип II-2: обшивка щитов досками с промежутками (как у I-4,
// src/i4/boards.js): доски по 100 мм, крайние - по краям щита, остальные
// равномерно между ними; их наименьшее число, при котором промежуток между
// соседними досками не больше заданного (boardGapMax, 10-150 мм - по
// указанию пользователя). Если промежутков не выходит (не помещаются и 2
// доски по 100 мм) - щит обшивается сплошь, как у II-1 (основные по 100 мм
// + дополнительные на остаток), и выдаётся предупреждение.
const { fillBoards } = require('../helpers');

const BOARD_W = 100;
const GAP_MIN = 10, GAP_MAX = 150; // пределы настройки наибольшего промежутка, мм

// { qty, gap - промежуток между соседними досками, мм; share - доля
// промежутков в ширине щита } или null - промежутков не выйдет.
function gapBoards(span, maxGap) {
  span = Math.round(span);
  // (span - qty*100) / (qty-1) <= maxGap
  const qty = Math.max(2, Math.ceil((span + maxGap) / (BOARD_W + maxGap) - 1e-9));
  if (qty * BOARD_W >= span) return null;
  return { qty, gap: (span - qty * BOARD_W) / (qty - 1), share: (span - qty * BOARD_W) / span };
}

// Доски крышки поперёк ящика и боковых щитов - одной раскладкой (по
// указанию пользователя: доски бока продолжают линии досок крышки, все доски
// одной ширины 100 мм, пусть и меняется их число). Крышка (длина len) - как
// обычный щит с промежутками: крайние доски по краям, остальные равномерно;
// боковой щит (от edge до len - edge, edge - толщина торцевого щита) - те же
// доски крышки, что целиком над ним; от края бокового щита до его первой
// доски - промежуток sideEdge. Число досок крышки - наименьшее, при котором
// и промежутки между досками, и sideEdge не больше заданного; если sideEdge
// так не уменьшить (заданный промежуток меньше ~100 мм минус толщина
// торцевого щита) - наименьшее по одним промежуткам, sideEdge больше
// заданного (об этом - предупреждение у бокового щита). { lid: { qty, gap,
// share }, side: { qty, gap, share, edge } } или null - на боковой щит не
// приходится и 2 досок (тогда крышка и бок раскладываются каждый сам по
// себе).
function lidSideBoards(len, edge, maxGap) {
  len = Math.round(len);
  const side = len - 2 * edge;
  let fallback = null;
  for (let qty = 2; qty * BOARD_W < len; qty++) {
    const gap = (len - qty * BOARD_W) / (qty - 1);
    if (gap > maxGap + 1e-9) continue;
    const pitch = BOARD_W + gap;
    const first = Math.ceil((edge - 1e-9) / pitch);          // первая доска целиком над боком
    const last = Math.floor((len - edge - BOARD_W + 1e-9) / pitch);
    const sideQty = last - first + 1;
    if (sideQty < 2) continue;
    const sideEdge = first * pitch - edge;
    const res = {
      lid: { qty, gap, share: (len - qty * BOARD_W) / len },
      side: { qty: sideQty, gap, share: (side - sideQty * BOARD_W) / side, edge: sideEdge },
    };
    if (sideEdge <= maxGap + 1e-9) return res;
    if (!fallback) fallback = res;
  }
  return fallback;
}

// Замена fillBoards (тот же вид результата: mainQty, extra, warn,
// singleNarrow) - с промежутками; gap - промежутки ({ qty, gap, share }) или
// null - щит сплошной. panelName и warnings - для предупреждения о щите без
// промежутков.
function fillGapBoards(span, roundBoardWidths, maxGap, panelName, warnings) {
  const gb = gapBoards(span, maxGap);
  if (gb) return { mainQty: gb.qty, extra: [], warn: false, singleNarrow: false, gap: gb };
  warnings.push(`${panelName}: промежутков между досками нет - доски по 100 мм закрывают щит целиком.`);
  return { ...fillBoards(span, roundBoardWidths), gap: null };
}

module.exports = { fillGapBoards, gapBoards, lidSideBoards, BOARD_W, GAP_MIN, GAP_MAX };
