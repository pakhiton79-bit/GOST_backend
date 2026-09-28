// ГОСТ 10198-91, тип I-1: толщина досок, планок и раскосин.

// Плотность упаковывания груза, кг/дм³ (масса / объём груза).
function packingDensity(massKg, Lmm, Wmm, Hmm) {
  const volumeDm3 = (Lmm * Wmm * Hmm) / 1e6;
  return massKg / volumeDm3;
}

// Толщина по ГОСТ - по плотности упаковывания.
function wallThicknessI1(density) {
  if (density <= 1) return 22;
  if (density <= 3) return 25;
  return 32;
}

// Снижение толщины на одну градацию (32 -> 25 -> 22) - когда расстояние
// между поясами планок попадает в 400-500 мм.
function stepDownGrade(t) {
  if (t === 32) return 25;
  if (t === 25) return 22;
  return t;
}

module.exports = { packingDensity, wallThicknessI1, stepDownGrade };
