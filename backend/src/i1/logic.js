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

// Количество планок (боковой щит / крышка / дно): 2 крайние на расстоянии
// boardLen/6 от каждого края, промежуточные - так, чтобы зазор между
// соседними планками не превышал 700мм.
//
// override (галочки "Настроить число поясов планок"/"Настроить расстояние
// между краями поясов планок" в UI, по запросу пользователя) - при активном
// override пояса (включая крайние) распределяются МАКСИМАЛЬНО РАВНОМЕРНО по
// всей длине доски: отступ от края до крайнего пояса равен шагу между
// соседними поясами (тот же приём, что у поперечных брусьев крышки в типе
// II-1) - при count поясах это (count+1) одинаковых промежутков, значит
// каждый = boardLen/(count+1). wallValue*2 (толщина доски торца + толщина
// вертикальной планки торца, каждая = wallValue) - не фиксированное
// значение отступа, а МИНИМУМ (раньше отступ был жёстко зафиксирован на
// wallValue*2 и не менялся вместе с числом/шагом поясов - это и было
// ошибкой). Если при заданном count равномерный шаг выходит меньше
// минимума - мест для такого числа поясов недостаточно (см. compute.js -
// жёсткий блок, как и при boardLen/6 < 0 у штатного правила). Само число
// поясов - либо берётся как есть (override.mode==='count', целое, минимум
// 2), либо выбирается максимальным таким, чтобы равномерный шаг не
// превышал заданного пользователем значения (override.mode==='gap', зазор
// может быть и больше 700мм - сознательное отклонение от рекомендации
// ГОСТа, по указанию пользователя).
function plankCount(boardLen, wallValue, override) {
  if (override) {
    const minEdgeDist = wallValue * 2;
    const count = override.mode === 'count'
      ? Math.max(2, Math.round(override.value))
      : Math.max(2, Math.ceil(boardLen / override.value - 1e-9) - 1);
    // Отступ от края - до целого мм (по запросу пользователя): цех режет
    // доски не в долях миллиметра, а сама раскладка и так уже приближение.
    const edgeDist = Math.round(boardLen / (count + 1));
    const middle = boardLen - edgeDist * 2;
    if (edgeDist < minEdgeDist) return { count: null, edgeDist, middle };
    return { count, edgeDist, middle };
  }
  const edgeDist = boardLen / 6;
  const middle = boardLen - edgeDist * 2;
  if (middle < 0) return { count: null, edgeDist, middle };
  return { count: Math.ceil(middle / 700 - 1e-9) + 1, edgeDist, middle };
}

module.exports = { packingDensity, wallThicknessI1, stepDownGrade, plankCount };
