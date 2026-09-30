// ГОСТ 10198-91, тип I-1: раскладка поясов планок по длине доски (общая для
// бокового щита, крышки и дна).
//
// Все расстояния - между КРОМКАМИ: от края доски до кромки крайней планки
// (edgeDist) и между кромками соседних планок (ширина самих планок учтена).
// Результат любой раскладки - { count, edgeDist, middle }:
//   count    - число поясов (null - планки не помещаются, расчёт блокируется);
//   edgeDist - отступ от края доски до кромки крайней планки;
//   middle   - суммарная длина всех (count-1) промежутков между планками,
//              т.е. зазор между соседними планками = middle / (count-1).
// minEdgeDist - минимальный отступ от края: (вертикальная планка торца +
// доска торца) × 2. Меньше - блокировка (count = null).

const PLANK_WIDTH = 100;
const GOST_MAX_PLANK_GAP = 700;
const GOST_MAX_EDGE_DIST = 1000;

// Штатно по ГОСТ: отступ от края = 1/6 длины доски (вверх до целого мм, не
// более 1000 мм); между двумя крайними поясами - минимум промежуточных, чтобы
// зазор между кромками не превышал 700 мм.
function standardLayout(boardLen, minEdgeDist) {
  const edgeDist = Math.min(Math.ceil(boardLen / 6 - 1e-9), GOST_MAX_EDGE_DIST);
  const span = boardLen - edgeDist * 2 - 2 * PLANK_WIDTH; // между крайними поясами
  if (span < 0) return { count: null, edgeDist, middle: span };
  const inner = Math.max(0, Math.ceil((span - GOST_MAX_PLANK_GAP) / (GOST_MAX_PLANK_GAP + PLANK_WIDTH) - 1e-9));
  const count = inner + 2;
  const middle = boardLen - edgeDist * 2 - count * PLANK_WIDTH;
  if (edgeDist < minEdgeDist) return { count: null, edgeDist, middle };
  return { count, edgeDist, middle };
}

// Текст ошибки «заданное число поясов не помещается»: «2 пояса планок не
// помещаются», «21 пояс планок не помещается», «15 поясов планок не помещаются».
function tooManyPlanksText(n) {
  const n10 = n % 10, n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return `${n} пояс планок не помещается`;
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return `${n} пояса планок не помещаются`;
  return `${n} поясов планок не помещаются`;
}

// Число поясов, которое реально ставится при ручной настройке числа.
function requestedPlankCount(value) {
  return Math.max(2, Math.round(value));
}

// Заданное число поясов (не меньше 2): равномерно по всей доске - отступ от
// края равен зазору между планками, (count+1) одинаковых промежутков.
// Отступ округляется до целого мм, поэтому зазор может отличаться от него на
// ±1 мм.
function countLayout(boardLen, minEdgeDist, value) {
  const count = requestedPlankCount(value);
  const edgeDist = Math.round((boardLen - count * PLANK_WIDTH) / (count + 1));
  const middle = boardLen - edgeDist * 2 - count * PLANK_WIDTH;
  if (edgeDist < minEdgeDist) return { count: null, edgeDist, middle };
  return { count, edgeDist, middle };
}

// Заданный зазор между кромками соседних планок: зазор ставится РОВНО, остаток
// длины делится поровну на 2 крайних отступа (без округления - иначе сумма не
// сошлась бы с длиной доски). Число поясов - минимальное, при котором отступ
// от края не больше зазора; если отступ выходит меньше минимума, пояса
// убираются по одному (но не меньше 2). Зазор может быть и больше 700 мм.
function gapLayout(boardLen, minEdgeDist, gap) {
  const edgeFor = n => (boardLen - n * PLANK_WIDTH - (n - 1) * gap) / 2;
  let count = Math.max(2, Math.ceil((boardLen - gap) / (gap + PLANK_WIDTH) - 1e-9));
  while (count > 2 && edgeFor(count) < minEdgeDist) count--;
  const edgeDist = edgeFor(count);
  const middle = (count - 1) * gap;
  if (edgeDist < minEdgeDist) return { count: null, edgeDist, middle };
  return { count, edgeDist, middle };
}

// override - ручная настройка из опций: { mode: 'count' | 'gap', value } либо
// null (штатная раскладка).
function plankLayout(boardLen, minEdgeDist, override) {
  if (!override) return standardLayout(boardLen, minEdgeDist);
  if (override.mode === 'gap') return gapLayout(boardLen, minEdgeDist, override.value);
  return countLayout(boardLen, minEdgeDist, override.value);
}

module.exports = { plankLayout, requestedPlankCount, tooManyPlanksText, PLANK_WIDTH };
