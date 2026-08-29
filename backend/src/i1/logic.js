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
function plankCount(boardLen) {
  const edgeDist = boardLen / 6;
  const middle = boardLen - edgeDist * 2;
  if (middle < 0) return { count: null, edgeDist, middle };
  return { count: Math.ceil(middle / 700 - 1e-9) + 1, edgeDist, middle };
}

module.exports = { packingDensity, wallThicknessI1, stepDownGrade, plankCount };
