// ГОСТ 10198-91, тип II-1: расчёт каркасно-щитового ящика.
//
// Порядок расчёта:
//   1. проверка входных данных, толщина обшивки;
//   2. согласование размеров: стойка, полозья, доска дна, брусья крышки
//      (sizing.js);
//   3. узлы: дно (dno.js), крышка (kryshka.js), каркасы щитов (frame.js),
//      щит торцевой (end-panel.js), щит боковой (bokovoy.js);
//   4. объём, норма времени, предупреждения.
//
// Ручные толщины из таблицы (manualOverrides) подставляются везде, где
// участвуют, кроме полоза (t9) и торцового бруса дна (t11): их сечение -
// табличная пара толщина×ширина, ручное значение - только число в таблице.
// Таблицы и формулы, общие с типом I-3, берутся из ../i3.
const { makeRoundUpToAvailable, findNegativeField, computeNormaVremeni } = require('../helpers');
const { skinThickness } = require('./logic');
const { stabilizeSizes } = require('./sizing');
const { buildDno } = require('./dno');
const { buildKryshka } = require('./kryshka');
const { buildFrame } = require('./frame');
const { buildEndPanel } = require('./end-panel');
const { buildBokovoy } = require('./bokovoy');
const { nearestKryshkaVariant, nearestPanelVariant } = require('./drawing-variants');

// Ручные правки толщин. Значение из цикла согласования читается на каждой
// итерации, поэтому «меньше ГОСТ» не пишется в предупреждения сразу, а
// копится в belowGost и выводится один раз в конце.
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

// input: { L, W, H, MASS, fasteningType ('skid' | 'floor_boards'),
//   solidRigidBase, removeFloorBoards, removeSkidBoards, forkliftLoading,
//   roundBoardWidths, lidLayout ('longitudinal' | 'transverse'), optimizeSizes,
//   availableThicknesses, manualOverrides, baseProductivity, timeCoeff }.
function computeGost10198II1(input) {
  const { L, W, H, MASS, baseProductivity, timeCoeff } = input;
  const availableThicknesses = input.availableThicknesses || [];
  const round = makeRoundUpToAvailable(availableThicknesses);
  const { ov, belowGost, appliedCount } = makeThicknessOverrides(input.manualOverrides || {});

  // --- 1. Входные данные, обшивка ---
  if (!L || !W || !H || !MASS || L <= 0 || W <= 0 || H <= 0 || MASS <= 0) {
    return { error: 'Заполните все поля положительными числами.' };
  }
  const warnings = [];
  if (MASS > 20000) {
    warnings.push('Масса груза вне диапазона типа II-1 (≤20000 кг) — расчёт продолжен по крайнему значению.');
  }
  if (MASS < 200) {
    warnings.push(`Масса груза ${MASS} кг менее 200 кг — вне области распространения ГОСТ 10198-91 в целом (200–20000 кг). Расчёт продолжен, но результат нужно перепроверить.`);
  }
  // Толщина досок обшивки (щиты и крышка) - черновая таблица по массе.
  const skin = { value: ov('skinValue', round(skinThickness(MASS)), 'Толщина обшивки (доска крышки)') };
  const c = { ...input, availableThicknesses, skinT: skin.value, ov, round, warnings };

  // --- 2. Согласование размеров ---
  const s = stabilizeSizes(c);

  if (s.crossBeamExceeded) {
    warnings.push('Масса или ширина ящика вне Табл. 14 — поперечный брус крышки принят по крайнему значению.');
  }
  if (s.crossBeamMarginBelowMin) {
    warnings.push('Отступ от края крышки до крайнего бруса меньше минимума (обшивка + стойка + 10 мм) даже при 2 брусьях — уменьшить без нарушения шага ≤700 мм нельзя.');
  }
  if (s.polozSimpleExceeded) {
    warnings.push('Масса вне диапазона табл. полозьев со сплошным основанием (500–20000 кг) — сечение полоза принято по крайнему значению.');
  }
  const t19 = s.skidTableInfo;
  if (t19) {
    if (t19.massSnapped) {
      warnings.push(`Масса ${MASS} кг вне Табл. 19 — принята ближайшая (${t19.massUsed} кг).`);
    }
    if (t19.lengthSnapped) {
      warnings.push(`Длина полоза ${Math.round(s.len)} мм вне Табл. 19 — принята ближайшая (${t19.lengthUsed} мм).`);
    }
    if (t19.extrapolatedBeyondOne) {
      warnings.push(`Табл. 19: не хватает полозьев для шага осей ≤1200 мм (п.1.6.2) — добавлен ещё того же сечения (${t19.count} шт. итого).`);
    }
  }
  if (s.stojkaExceeded) {
    warnings.push('Масса или высота ящика вне табл. толщины стоек — сечение принято по крайнему значению.');
  }
  if (s.longBeamExceeded) {
    warnings.push('Шаг осей брусьев крышки вне табл. продольных брусьев — сечение принято по крайнему значению.');
  }
  const kryshkaVariant = nearestKryshkaVariant(s.longBeamCount, s.crossBeamCount);
  if (!kryshkaVariant.exact) {
    warnings.push(`Крышка: чертёж — ближайшее готовое сочетание брусьев (${kryshkaVariant.longbeamCount}×прод./${kryshkaVariant.crossBeamCount}×попер.) вместо расчётного (${s.longBeamCount}×прод./${s.crossBeamCount}×попер.); точное количество см. в таблице ниже.`);
  }
  // Отступ от края крышки до края крайнего поперечного бруса (брусья - равномерно).
  const edgeDistCross = Math.round((L - s.crossBeamCount * s.crossBeamW) / (s.crossBeamCount + 1));
  if (s.floorBoardExceeded) {
    warnings.push('Удельная нагрузка или шаг полозьев вне Табл. 4 — толщина доски дна принята по крайнему значению.');
  }
  // Подполозная доска: длина < 300 мм - предупреждение; ≤ 0 или < 300 при
  // погрузке погрузчиком - в таблице ⚠ вместо длины.
  if (s.sub.l < 300) {
    warnings.push(`Длина подполозной доски ${Math.round(s.sub.l)} мм менее 300 мм.`);
  }
  const forkliftFail = input.forkliftLoading && s.sub.l < 300;
  if (forkliftFail) {
    warnings.push(`Погрузка погрузчиком требует ≥300 мм у подполозной доски (сейчас ${Math.round(s.sub.l)} мм).`);
  }

  // --- 3. Узлы ---
  const dno = buildDno(c, s, s.sub.l <= 0 || forkliftFail);
  const kryshka = buildKryshka(c, s);

  // Каркасы щитов. Высота щита на 1 этаж - без опоры снизу (полоза и доски дна).
  const panelHeightFull = H + s.floorBoardT + s.longBeamT;
  const torecFrame = buildFrame(W + s.stojkaT * 2, panelHeightFull, H);
  const bokFrame = buildFrame(L, panelHeightFull, H); // по длине груза
  if (torecFrame.tooNarrow) {
    return { error: `Ширина груза ${W} мм слишком мала для минимум двух стоек торцевого щита (по 100мм) — расчёт не выполняется.` };
  }
  if (bokFrame.tooNarrow) {
    return { error: `Длина груза ${L} мм слишком мала для минимум двух стоек бокового щита (по 100мм) — расчёт не выполняется.` };
  }
  if (torecFrame.warn) warnings.push('Щит торцевой: ' + torecFrame.warn + '.');
  if (bokFrame.warn) warnings.push('Щит боковой: ' + bokFrame.warn + '.');
  if (torecFrame.len <= 0) {
    return { error: `Внутренняя высота груза ${H} мм слишком мала для каркаса торцевого щита — расчёт не выполняется.` };
  }
  if (bokFrame.len <= 0) {
    return { error: `Внутренняя высота груза ${H} мм слишком мала для каркаса бокового щита — расчёт не выполняется.` };
  }
  const torecVariant = nearestPanelVariant(torecFrame.count, torecFrame.floors);
  if (!torecVariant.exact) {
    warnings.push(`Щит торцевой: чертёж — ближайшая готовая схема (${torecVariant.count} стойки/${torecVariant.floors} эт.) вместо расчётной (${torecFrame.count} стоек/${torecFrame.floors} эт.); точное количество см. в таблице ниже.`);
  }
  const bokVariant = nearestPanelVariant(bokFrame.count, bokFrame.floors);
  if (!bokVariant.exact) {
    warnings.push(`Щит боковой: чертёж — ближайшая готовая схема (${bokVariant.count} стойки/${bokVariant.floors} эт.) вместо расчётной (${bokFrame.count} стоек/${bokFrame.floors} эт.); точное количество см. в таблице ниже.`);
  }

  // Раскосина - 2/3 толщины стойки.
  const rask = { t: ov('tRaskosina', round(s.stojkaT * 2 / 3), 'Толщина раскосины'), w: 100 };
  const endPanel = buildEndPanel(c, s, torecFrame, rask);
  const bokovoy = buildBokovoy(c, s, bokFrame, rask);

  // --- 4. Итог ---
  const totalVolume = dno.volume + kryshka.volume + 2 * endPanel.volume + 2 * bokovoy.volume;
  const normaVremeni = computeNormaVremeni(totalVolume, baseProductivity, timeCoeff);

  if (round.state.exceeded) {
    warnings.push(`Расчётная толщина детали больше максимальной «в наличии» (${availableThicknesses[availableThicknesses.length - 1]} мм) — использовано значение по ГОСТ (нужен пиломатериал большей толщины).`);
  }
  Object.values(belowGost).forEach(b => {
    warnings.push(`${b.label}: вручную указано ${b.value} мм (< расчётных ${Math.round(b.gostValue * 100) / 100} мм по ГОСТ) — использовано введённое значение.`);
  });
  if (appliedCount() > 0) {
    warnings.push('Использованы вручную введённые толщины, а не расчётные по ГОСТ — чертежи ниже могут их не точно отражать.');
  }

  const result = {
    warnings, dno: dno.rows, kryshka: kryshka.rows, endPanel: endPanel.rows, bokovoy: bokovoy.rows,
    outerL: s.len, outerW: s.outerW, outerH: s.outerH, totalVolume, normaVremeni,
    // Параметры чертежей.
    k9Base: s.len, W, L, H, t_stojka: s.stojkaT, skin, t21: s.crossBeamT, t_longbeam: s.longBeamT, lidLayout: input.lidLayout,
    torecFrame, bokFrame, panelHeightFull,
    crossBeamCount: s.crossBeamCount, longbeamCount: s.longBeamCount,
    // Толщина обшивки и рамы на чертеже крышки: +2 мм при «Оптимизировать
    // размеры» (только чертёж).
    t32Display: input.optimizeSizes ? skin.value + 2 : skin.value, edgeDistCross,
    sideFrameDisplay: s.stojkaT + skin.value + (input.optimizeSizes ? 2 : 0),
  };

  // Отрицательное число в любом поле - невозможная геометрия.
  const negField = findNegativeField(result, '');
  if (negField) {
    console.warn('Расчёт дал отрицательное значение:', negField);
    return { error: 'При таких размерах и массе груза получаются недопустимые (отрицательные) размеры деталей — рассчитать ящик нельзя. Проверьте введённые размеры и массу груза.' };
  }
  return result;
}

module.exports = { computeGost10198II1 };
