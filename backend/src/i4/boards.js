// ГОСТ 10198-91, тип I-4: обшивка щитов досками с промежутками (как у типа
// I-2): доски по 100 мм, крайние - по краям щита, остальные равномерно между
// ними; их наименьшее число, при котором промежутки занимают не больше
// заданной доли (boardGapShare, 0.1..0.5) ширины щита и каждый промежуток не
// больше 100 мм (по указанию пользователя). Если промежутков не выходит (не
// помещаются и 2 доски по 100 мм или доля слишком мала) - щит обшивается
// сплошь, как у I-3 (основные по 100 мм + дополнительные на остаток), и
// выдаётся предупреждение.
const { fillBoards } = require('../helpers');

const BOARD_W = 100;
const MAX_GAP = 100;   // наибольший промежуток между досками, мм

// { qty, gap - промежуток между соседними досками, мм; share - его доля } или
// null - промежутков не выйдет.
function gapBoards(span, share) {
  span = Math.round(span);
  // по доле и по наибольшему промежутку: (span - qty*100)/(qty-1) <= 100
  const qty = Math.max(2, Math.ceil(span * (1 - share) / BOARD_W - 1e-9), Math.ceil((span + MAX_GAP) / (BOARD_W + MAX_GAP) - 1e-9));
  if (qty * BOARD_W >= span) return null;
  return { qty, gap: (span - qty * BOARD_W) / (qty - 1), share: (span - qty * BOARD_W) / span };
}

// Ближайший вариант с промежутками, когда gapBoards их не дал: наибольшее
// число досок по 100 мм, при котором промежуток ещё есть (доля тогда больше
// заданной); null - не помещаются и 2 доски.
function gapBoardsNearest(span) {
  span = Math.round(span);
  let qty = Math.floor(span / BOARD_W);
  if (qty * BOARD_W >= span) qty--;
  if (qty < 2) return null;
  return { qty, gap: (span - qty * BOARD_W) / (qty - 1), share: (span - qty * BOARD_W) / span };
}

// Замена fillBoards (тот же вид результата: mainQty, extra, warn,
// singleNarrow) - с промежутками; gap - промежутки ({ qty, gap, share }) или
// null - щит сплошной. panelName и warnings - для предупреждения о щите без
// промежутков.
function fillGapBoards(span, roundBoardWidths, share, panelName, warnings) {
  const gb = gapBoards(span, share);
  if (gb) return { mainQty: gb.qty, extra: [], warn: false, singleNarrow: false, gap: gb };
  const near = gapBoardsNearest(span);
  const alt = near ? ` (с промежутками вышло бы ${near.qty} досок, ${Math.round(near.share * 100)}% поверхности)` : '';
  warnings.push(`${panelName}: при доле промежутков не больше ${Math.round(share * 100)}% промежутков между досками нет - доски по 100 мм закрывают щит целиком${alt}.`);
  return { ...fillBoards(span, roundBoardWidths), gap: null };
}

module.exports = { fillGapBoards, gapBoards, BOARD_W };
