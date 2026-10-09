// ГОСТ 10198-91, тип I-4: расчёт ящика. Ящик - как у типа I-3 (отдельная
// копия), но доски обшивки всех щитов (дно, крышка, бока, торцы) - с
// промежутками: крайние по краям щита, остальные равномерно между ними,
// промежуток между соседними досками - не больше заданного (boardGapMax,
// 10-100 мм, обязательно; см. boards.js). Пергамина нет (решетчатый ящик).
// Толщина стенок - та же, что у I-3 (п.1.6.15 - общий для I-3 и I-4).
//
// Порядок расчёта:
//   1. проверка входных данных (в том числе наибольшего промежутка);
//   2. толщина стенок (п.1.6.15) с округлением до «в наличии»;
//   3. узлы: дно (dno.js), крышка (kryshka.js), щит торцевой (end-panel.js),
//      щит боковой (bokovoy.js);
//   4. наружные размеры, объём, масса, норма времени, промежутки по щитам
//      (для чертежей), предупреждения.
//
// Ручные толщины из таблицы (manualOverrides): толщина стенок (wallValue),
// доска дна (t12Value), подполозная доска (t10Value), поперечный брус крышки
// (t21Value), полоз (t9Value) и торцовый брус дна (t11Value) - подставляются
// везде, где участвуют.
const { makeRoundUpToAvailable, thicknessPartWarnings, findNegativeField, inputLimitsError, computeNormaVremeni } = require('../helpers');
const { wallThickness } = require('../i3/tables');
const { buildDno } = require('./dno');
const { buildKryshka } = require('./kryshka');
const { buildEndPanel } = require('./end-panel');
const { buildBokovoy } = require('./bokovoy');
const { PLANK_W } = require('./plank-layout');
const { GAP_MIN, GAP_MAX } = require('./boards');

// Плотность древесины по умолчанию, кг/м³; на клиенте настраивается
// шестерёнкой у «Массы ящика».
const WOOD_DENSITY_KG_M3 = 700;

// Ручные правки толщин: значение подставляется вместо расчётного по ГОСТ;
// запоминает, сколько правок применено и какие меньше ГОСТ.
function makeThicknessOverrides(manualOverrides) {
  const belowGost = {};
  let applied = 0;
  function ov(key, gostValue, label) {
    const v = manualOverrides[key];
    if (v === undefined || v === null || Number.isNaN(v) || v <= 0) return gostValue;
    applied++;
    if (v < gostValue) belowGost[key] = { value: v, gostValue, label };
    else delete belowGost[key];
    return v;
  }
  return { ov, belowGost, appliedCount: () => applied };
}

// input: { variant ('skid' - крепление за полозья | 'floor_boards' - к доскам
//   дна), L, W, H, MASS, optimizeSizes, removeFloorBoards, removeSkidBoards,
//   roundBoardWidths, solidRigidBase, forkliftLoading, xRaskosina, addRaskosina (раскосины и там, где по ГОСТ их нет), addEndTape,
//   plankLayoutMode, plankLayoutValue, beamGapValue, beamCountValue,
//   availableThicknesses, manualOverrides, baseProductivity, timeCoeff,
//   woodDensity, boardGapMax - наибольший промежуток между досками обшивки, мм }.
function computeGost10198I4(input) {
  const { L, W, H, MASS, baseProductivity, timeCoeff, woodDensity } = input;
  const availableThicknesses = input.availableThicknesses || [];
  const round = makeRoundUpToAvailable(availableThicknesses);

  // --- 1. Входные данные ---
  if (!L || !W || !H || !MASS || L <= 0 || W <= 0 || H <= 0 || MASS <= 0) {
    return { error: 'Заполните все поля положительными числами.' };
  }
  const limitsError = inputLimitsError(input);
  if (limitsError) return { error: limitsError };
  // Наибольший промежуток обязателен, значения по умолчанию нет.
  const gapMax = input.boardGapMax;
  if (!(gapMax >= GAP_MIN && gapMax <= GAP_MAX)) {
    return { error: `Укажите наибольший промежуток между досками обшивки (от ${GAP_MIN} до ${GAP_MAX} мм) - расчёт не выполняется.` };
  }
  const warnings = [];
  if (L <= 1200 || W <= 800) {
    warnings.push(`Габариты ${L}×${W} мм ≤ 1200×800 - формально действует ГОСТ 21140. Расчёт по ГОСТ 10198-91 продолжен, но результат нужно сверить с ГОСТ 21140.`);
  }
  if (MASS < 200) {
    warnings.push(`Масса груза ${MASS} кг менее 200 кг - вне области распространения ГОСТ 10198-91 в целом (200–20000 кг). Расчёт продолжен, но результат нужно перепроверить.`);
  }

  // --- 2. Толщина стенок: досок, планок и раскосин щитов и крышки ---
  const { ov, belowGost, appliedCount } = makeThicknessOverrides(input.manualOverrides || {});
  const wallGost = wallThickness(MASS);
  const wall = ov('wallValue', round(wallGost.value), 'Толщина досок/планок/раскосов');
  if (MASS > 3000) {
    warnings.push('Масса груза вне диапазона типа I-4 (Табл. 1, ≤3000 кг) - расчёт продолжен по крайнему значению.');
  }
  if (wallGost.exceeded) {
    warnings.push('Масса вне диапазона п.1.6.15 - толщина стенок принята по крайнему значению (25 мм).');
  }

  // Контекст для узлов: входные данные + толщина стенок и общие функции.
  const c = { ...input, availableThicknesses, wall, ov, round, warnings, boardGapMax: gapMax };

  // --- 3. Узлы ---
  const dno = buildDno(c);
  const len = dno.skidLen; // длина ящика по полозу - она же длина крышки и бока

  const outerL = len;
  const outerW = W + wall * 4;
  const outerH = (input.removeSkidBoards ? 0 : dno.subT) + dno.skidT + dno.t12 + wall + wall + H;

  const kryshka = buildKryshka(c, len, outerW);
  if (kryshka.error) return { error: kryshka.error };
  const { planks, beams } = kryshka;
  // Шаг поясов по осям - ширина секции бокового щита.
  const sectionW = planks.count > 1 ? planks.gap + PLANK_W : 0;

  const endPanel = buildEndPanel(c, dno.t12);
  const bokovoy = buildBokovoy(c, { len, t12: dno.t12, skidT: dno.skidT, plankQty: planks.count, sectionW });

  // --- 4. Итог ---
  const totalVolume = dno.volume + kryshka.volume + 2 * endPanel.volume + 2 * bokovoy.volume;
  const normaVremeni = computeNormaVremeni(totalVolume, baseProductivity, timeCoeff);
  const woodRho = woodDensity > 0 ? woodDensity : WOOD_DENSITY_KG_M3;
  const crateMass = totalVolume * woodRho;

  if (endPanel.floors === 2 && !endPanel.hasRaskosina) {
    warnings.push('Щит торцевой (2 этажа, без раскосины): чертёж приблизительный - показан чертёж одного этажа.');
  }
  if (round.state.exceeded) {
    warnings.push(`Расчётная толщина детали больше максимальной «в наличии» - использована самая толстая из наличия (${availableThicknesses[availableThicknesses.length - 1]} мм), это тоньше ГОСТ.`);
  }
  warnings.push(...thicknessPartWarnings(round, availableThicknesses));
  Object.values(belowGost).forEach(b => {
    warnings.push(`${b.label}: вручную указано ${b.value} мм (< расчётных ${Math.round(b.gostValue * 100) / 100} мм по ГОСТ) - использовано введённое значение.`);
  });
  if (appliedCount() > 0) {
    warnings.push('Использованы вручную введённые толщины, а не расчётные по ГОСТ - чертежи ниже могут их не точно отражать.');
  }

  const result = {
    warnings, dno: dno.rows, kryshka: kryshka.rows, endPanel: endPanel.rows, bokovoy: bokovoy.rows, crateMass, woodDensity: woodRho,
    outerL, outerW, outerH, totalVolume, normaVremeni,
    // Параметры чертежей.
    k9Base: len, t41: wall, t40: wall, torecFrameThickness: wall + wall,
    W, L, t30: wall, t32: wall,
    edgeDistKryshka: planks.edgeDist, l21: beams.count, w21: kryshka.beamW, l19: planks.count, bokSectionW: sectionW, plankGap: planks.gap,
    beamEdgeDist: beams.edgeDist, beamGap: beams.gap, beamSideGap: kryshka.beamSideGap, standardBeamCount: beams.standardCount,
    standardPlankCount: kryshka.standardPlanks.count, standardPlankGap: kryshka.standardPlanks.gap,
    k32: endPanel.boardLen, torecSections: endPanel.sections, torecHasRaskosina: endPanel.hasRaskosina, HplusT12: H + dno.t12,
    torecNoRaskosinaDiagram: endPanel.noRaskosinaDiagram, torecFloors: endPanel.floors, k30plusW31: endPanel.floorSpan,
    H, t12: dno.t12, k41: len, bokOverhang: bokovoy.overhang, l42: bokovoy.raskQty, bokFloors: bokovoy.floors, bokVertSpan: bokovoy.vertSpan,
    k40: bokovoy.vertLen, w43: bokovoy.horizW, xRaskosina: !!input.xRaskosina, t20: wall,
    // Лента обшивки торцов (галочка «Добавить ленту обшивки торцов») - по
    // периметру торца: длина одной ленты = (ширина груза + 2 доски бока +
    // высота груза + доска крышки + доска дна) × 2, лент 2; без досок дна
    // («Убрать доски дна») их толщина 0. В объём не входит.
    endTape: input.addEndTape ? [{ name: 'Обшивочная лента', l: Math.ceil(((W + wall * 2) + (H + wall + dno.t12)) * 2 - 1e-9), qty: 2 }] : [],
    // Промежутки обшивки по щитам (для чертежей): { qty, gap, share } или
    // null - щит сплошной (или доски дна убраны).
    boardGaps: { dno: dno.boardGap, kryshka: kryshka.boardGap, torec: endPanel.boardGap, bokovoy: bokovoy.boardGap },
  };

  // Отрицательное число в любом поле - невозможная геометрия.
  const negField = findNegativeField(result, '');
  if (negField) {
    console.warn('Расчёт дал отрицательное значение:', negField);
    return { error: 'При таких размерах и массе груза получаются недопустимые размеры деталей - рассчитать ящик нельзя. Проверьте введённые размеры и массу груза.' };
  }
  return result;
}

module.exports = { computeGost10198I4, WOOD_DENSITY_KG_M3 };
