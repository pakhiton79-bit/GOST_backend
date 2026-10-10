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

module.exports = { fillGapBoards, gapBoards, BOARD_W, GAP_MIN, GAP_MAX };
