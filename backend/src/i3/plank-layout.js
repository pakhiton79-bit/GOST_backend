// ГОСТ 10198-91, тип I-3: раскладка поясов планок крышки (вертикальные
// планки бокового щита стоят по тем же местам).
//
// Все расстояния - между КРОМКАМИ (ширина планки 100 мм учтена). Результат:
// { count, edgeDist, gap } - число поясов, отступ от края крышки до кромки
// крайнего пояса и зазор между кромками соседних поясов; либо { error }.

const PLANK_W = 100;      // ширина планки
const RASKOSINA_W = 100;  // ширина раскосины
const MAX_PLANK_GAP = 700;

// Штатно по ГОСТ: зазор не более 700 мм, отступ от края - 1/6 длины, но не
// больше зазора (иначе пояса ставятся равномерно: отступ = зазору). Число
// поясов - минимальное, при котором это выполняется.
function standardPlankLayout(len) {
  for (let n = 2; ; n++) {
    let edge = len / 6, gap = (len - 2 * edge - n * PLANK_W) / (n - 1);
    if (edge > gap) edge = gap = (len - n * PLANK_W) / (n + 1);
    if (gap <= MAX_PLANK_GAP || n >= 200) return { count: n, edgeDist: edge, gap };
  }
}

// Заданный зазор: ровно он (может быть и больше 700 мм), остаток пополам на
// отступы; при отступе меньше минимального пояса убираются по одному.
function gapPlankLayout(len, gap, minEdge) {
  const edgeFor = k => (len - k * PLANK_W - (k - 1) * gap) / 2;
  let n = Math.max(2, Math.ceil((len - gap) / (gap + PLANK_W) - 1e-9));
  while (n > 2 && edgeFor(n) < minEdge) n--;
  if (edgeFor(n) < minEdge) return { error: `Расстояние между планками ${gap} мм не помещается на крышке ${Math.round(len)} мм (2 планки и отступы от края) - расчёт не выполняется.` };
  return { count: n, edgeDist: edgeFor(n), gap };
}

// Текст ошибки «заданное число поясов не помещается»: «2 пояса планок не
// помещаются», «21 пояс планок не помещается», «15 поясов планок не помещаются».
function tooManyPlanksText(n) {
  const n10 = n % 10, n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return `${n} пояс планок не помещается`;
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return `${n} пояса планок не помещаются`;
  return `${n} поясов планок не помещаются`;
}

// Заданное число поясов: равномерно, отступ от края = зазору (до целого мм).
function countPlankLayout(len, count, minEdge) {
  const n = Math.max(2, Math.round(count));
  const edge = Math.round((len - n * PLANK_W) / (n + 1));
  if (edge < minEdge) return { error: `${tooManyPlanksText(n)} на крышке ${Math.round(len)} мм${n > 2 ? ' - уменьшите число поясов' : ''}. Расчёт не выполняется.` };
  return { count: n, edgeDist: edge, gap: (len - 2 * edge - n * PLANK_W) / (n - 1) };
}

// override - ручная настройка из опций ({ mode: 'count' | 'gap', value }) либо
// null. minEdge - минимальный отступ при ручной раскладке: (вертикальная
// планка торца + доска торца) × 2; меньше - расчёт блокируется.
function plankLayout(len, override, minEdge) {
  if (!override) return standardPlankLayout(len);
  if (override.mode === 'gap') return gapPlankLayout(len, override.value, minEdge);
  return countPlankLayout(len, override.value, minEdge);
}

module.exports = { plankLayout, PLANK_W, RASKOSINA_W };
