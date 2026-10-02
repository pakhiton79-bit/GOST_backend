// ГОСТ 10198-91, тип I-2: тот же ящик, что I-1 (расчёт - ../i1), но доски
// обшивки всех щитов (дно, крышка, бока, торцы) - с промежутками: крайние по
// краям щита, остальные равномерно между ними, промежутки - не больше
// заданной доли поверхности щита (boardGapPercent, 10-50%, обязательна).
const { computeGost10198I1, WOOD_DENSITY_KG_M3 } = require('../i1/compute');

const I2_VARIANT = { name: 'I-2', boardGaps: true };

function computeGost10198I2(input) {
  return computeGost10198I1(input, I2_VARIANT);
}

module.exports = { computeGost10198I2, WOOD_DENSITY_KG_M3 };
