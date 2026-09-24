// ГОСТ 10198-91, тип I-1: табличные/формульные данные - перенесены как есть
// из src/i1/logic.js исходного репозитория pakhiton79-bit/GOST_10198-91.

// Толщина досок, планок и раскосов - по плотности упаковывания груза
// (масса, кг / объём груза, дм³).
function packingDensity(massKg, Lmm, Wmm, Hmm) {
  const volumeDm3 = (Lmm * Wmm * Hmm) / 1e6; // мм³ -> дм³
  return massKg / volumeDm3;
}
function wallThicknessI1(density) {
  if (density <= 1) return 22;
  if (density <= 3) return 25;
  return 32;
}
// При расстоянии между поясами планок 400-500мм толщина снижается на одну
// градацию (32->25->22).
function stepDownGrade(v) {
  if (v === 32) return 25;
  if (v === 25) return 22;
  return v;
}

// Количество и раскладка поясов планок (боковой щит / крышка / дно). Все
// расстояния - ЧЕСТНЫЕ, от края доски/кромки планки до кромки соседней
// планки (ширина планки учтена). При ручном КОЛИЧЕСТВЕ поясов пояса
// (включая крайние) распределяются МАКСИМАЛЬНО РАВНОМЕРНО по всей длине
// доски: отступ от края до крайнего пояса равен зазору между соседними
// поясами (тот же приём, что у поперечных брусьев крышки в типе II-1) -
// ЧЕСТНОЕ расстояние от края доски до КРОМКИ планки, а не просто шаг сетки
// без учёта тела планки: ширина самой планки (PLANK_WIDTH=100мм, см. w:100
// у "Планка"/"Доска..." в compute.js) вычитается из boardLen ДО деления -
// при count поясах остаётся (count+1) одинаковых пустых промежутков (2
// крайних отступа + (count-1) зазоров между планками), каждый =
// (boardLen - count*PLANK_WIDTH)/(count+1).
//
// Штатное правило ГОСТ (override не задан, по уточнению пользователя):
// отступ от края доски до КРОМКИ крайнего пояса = 1/6 длины доски (она же
// наружная длина ящика), округлённая вверх до целого мм, но не более
// GOST_MAX_EDGE_DIST=1000мм; между двумя крайними поясами - минимальное
// число промежуточных, при котором зазор между кромками соседних поясов
// (с учётом ширины самих планок) не превышает GOST_MAX_PLANK_GAP=700мм,
// промежуточные расставлены равномерно. (Прежние версии: сначала 1/6 без
// учёта ширины планки - на доске ~1000-1100мм давало лишний 3-й пояс;
// затем равномерная раскладка всех поясов с зазором <=700мм - отступ от
// края тогда не был 1/6.)
//
// override (галочки "Настроить число поясов планок"/"Настроить расстояние
// между краями поясов планок" в UI) - override.mode==='count': заданное
// число поясов (минимум 2, целое), раскладка равномерная.
// override.mode==='gap': зазор между КРОМКАМИ соседних планок - РОВНО
// override.value (по уточнению пользователя: на чертеже должно стоять
// именно заданное расстояние, а не усреднённое), остаток длины доски
// делится поровну на 2 крайних отступа. Число поясов - то же, что и при
// равномерной раскладке с пределом override.value: минимальное, при
// котором крайний отступ тоже не больше override.value (n >= (boardLen-
// value)/(value+PLANK_WIDTH)), - т.е. отступ от края выходит в пределах
// (value/2-50 .. value]. Может быть и больше 700мм - сознательное
// отклонение от рекомендации ГОСТа, по указанию пользователя.
//
// wallValue*2 (толщина доски торца + толщина вертикальной планки торца,
// каждая = wallValue) - минимум отступа от края (раньше отступ был жёстко
// зафиксирован на wallValue*2 и не менялся вместе с числом/шагом поясов -
// это и было ошибкой). Если при заданном count равномерный отступ выходит
// меньше минимума (или вовсе отрицательный - планки не помещаются) - мест
// для такого числа поясов недостаточно (см. compute.js - жёсткий блок).
const PLANK_WIDTH = 100;
const GOST_MAX_PLANK_GAP = 700;
const GOST_MAX_EDGE_DIST = 1000;
function plankCount(boardLen, wallValue, override) {
  const minEdgeDist = wallValue * 2;
  if (!override) {
    // Штатное правило ГОСТ - см. комментарий выше.
    const edgeDist = Math.min(Math.ceil(boardLen / 6 - 1e-9), GOST_MAX_EDGE_DIST);
    const span = boardLen - edgeDist * 2 - 2 * PLANK_WIDTH; // между крайними поясами
    if (span < 0) return { count: null, edgeDist, middle: boardLen - edgeDist * 2 - 2 * PLANK_WIDTH };
    const inner = Math.max(0, Math.ceil((span - GOST_MAX_PLANK_GAP) / (GOST_MAX_PLANK_GAP + PLANK_WIDTH) - 1e-9));
    const count = inner + 2;
    const middle = boardLen - edgeDist * 2 - count * PLANK_WIDTH;
    if (edgeDist < minEdgeDist) return { count: null, edgeDist, middle };
    return { count, edgeDist, middle };
  }
  const eff = override;
  const count = eff.mode === 'count'
    ? Math.max(2, Math.round(eff.value))
    // Минимальное n, при котором (boardLen - n*PLANK_WIDTH)/(n+1) <= value
    // (зазор между КРОМКАМИ планок, а не шаг по осям): n >= (boardLen-value)/
    // (value+PLANK_WIDTH). Раньше было ceil(boardLen/value)-1 - без учёта
    // ширины планки, из-за чего местами добавлялся лишний пояс (напр. доска
    // 2200мм: 3 пояса с зазором 475мм, хотя 2 пояса дают 667мм <= 700мм).
    : Math.max(2, Math.ceil((boardLen - eff.value) / (eff.value + PLANK_WIDTH) - 1e-9));
  if (override && override.mode === 'gap') {
    // Ручной зазор - ровно заданный; отступ от края - остаток пополам (без
    // округления: при нечётном остатке это честные x.5мм - иначе сумма
    // отступов/планок/зазоров не сходилась бы с длиной доски).
    // Если отступ от края выходит меньше минимума (очень маленький зазор) -
    // убираем по одному поясу (отступ растёт на (value+PLANK_WIDTH)/2 за
    // шаг): зазор важнее, чем "отступ не больше зазора". Не помещаются даже
    // 2 пояса - ошибка (см. compute.js).
    let n = count;
    const edgeFor = k => (boardLen - k * PLANK_WIDTH - (k - 1) * override.value) / 2;
    while (n > 2 && edgeFor(n) < minEdgeDist) n--;
    const middle = (n - 1) * override.value;
    const edgeDist = edgeFor(n);
    if (edgeDist < minEdgeDist) return { count: null, edgeDist, middle };
    return { count: n, edgeDist, middle };
  }
  // Отступ от края - до целого мм: цех режет доски не в долях миллиметра,
  // а сама раскладка и так уже приближение.
  const edgeDist = Math.round((boardLen - count * PLANK_WIDTH) / (count + 1));
  // middle - остаток длины доски под (count-1) зазоров между планками
  // (после вычета обоих крайних отступов и тела всех планок); по
  // построению middle/(count-1) ≈ edgeDist (±1мм - из-за округления
  // edgeDist до целого мм; на чертежах подписывается именно middle/(count-1)).
  const middle = boardLen - edgeDist * 2 - count * PLANK_WIDTH;
  if (edgeDist < minEdgeDist) return { count: null, edgeDist, middle };
  return { count, edgeDist, middle };
}

module.exports = { packingDensity, wallThicknessI1, stepDownGrade, plankCount };
