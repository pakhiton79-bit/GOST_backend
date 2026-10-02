// ГОСТ 10198-91, тип I-2: толщина досок, планок и раскосин.

// Плотность упаковывания груза, кг/дм³ (масса / объём груза).
function packingDensity(massKg, Lmm, Wmm, Hmm) {
  const volumeDm3 = (Lmm * Wmm * Hmm) / 1e6;
  return massKg / volumeDm3;
}

// Толщина по ГОСТ - по плотности упаковывания. У решетчатого ящика (I-2)
// толще, чем у плотного (I-1): до 1 кг/дм³ - 25 мм (у I-1 22), свыше 1 -
// 32 мм (у I-1 свыше 1 до 3 - 25, свыше 3 - 32).
function wallThicknessI2(density) {
  if (density <= 1) return 25;
  return 32;
}

// Снижение толщины на одну градацию по ряду 19, 22, 25, 32 (32 -> 25,
// 25 -> 22) - когда расстояние между поясами планок попадает в 400-500 мм.
function stepDownGrade(t) {
  if (t === 32) return 25;
  if (t === 25) return 22;
  return t;
}

module.exports = { packingDensity, wallThicknessI2, stepDownGrade };
