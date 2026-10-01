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
const { buildFrame, frameAngleDeg, tooManyPostsText, MIN_ANGLE, MAX_ANGLE } = require('./frame');
const { buildEndPanel } = require('./end-panel');

// «N поперечных брусьев не помещаются» - с согласованием по числу.
function tooManyCrossBeamsText(n) {
  const n10 = n % 10, n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return `${n} поперечный брус не помещается`;
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return `${n} поперечных бруса не помещаются`;
  return `${n} поперечных брусьев не помещаются`;
}
const { buildBokovoy } = require('./bokovoy');

// Плотность древесины по умолчанию, кг/м³; на клиенте настраивается
// шестерёнкой у «Массы ящика».
const WOOD_DENSITY_KG_M3 = 700;

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
//   xRaskosina, torecPostCount, bokPostCount (число стоек вручную; нет - штатно),
//   lidCrossBeamCount (число поперечных брусьев крышки вручную; нет - штатно),
//   addParchment,
//   availableThicknesses, manualOverrides, baseProductivity, timeCoeff,
//   woodDensity }.
function computeGost10198II1(input) {
  const { L, W, H, MASS, baseProductivity, timeCoeff, woodDensity } = input;
  const availableThicknesses = input.availableThicknesses || [];
  const round = makeRoundUpToAvailable(availableThicknesses);
  const { ov, belowGost, appliedCount } = makeThicknessOverrides(input.manualOverrides || {});

  // --- 1. Входные данные, обшивка ---
  if (!L || !W || !H || !MASS || L <= 0 || W <= 0 || H <= 0 || MASS <= 0) {
    return { error: 'Заполните все поля положительными числами.' };
  }
  const warnings = [];
  if (MASS > 20000) {
    warnings.push('Масса груза вне диапазона типа II-1 (≤20000 кг) - расчёт продолжен по крайнему значению.');
  }
  if (MASS < 200) {
    warnings.push(`Масса груза ${MASS} кг менее 200 кг - вне области распространения ГОСТ 10198-91 в целом (200–20000 кг). Расчёт продолжен, но результат нужно перепроверить.`);
  }
  // Толщина досок обшивки (щиты и крышка) - черновая таблица по массе.
  const skin = { value: ov('skinValue', round(skinThickness(MASS)), 'Толщина обшивки (доска крышки)') };
  const c = { ...input, availableThicknesses, skinT: skin.value, ov, round, warnings };

  // --- 2. Согласование размеров ---
  const s = stabilizeSizes(c);

  if (s.crossBeamExceeded) {
    warnings.push('Масса или ширина ящика вне Табл. 14 - поперечный брус крышки принят по крайнему значению.');
  }
  // Поперечные брусья крышки - равномерно: отступ от стенки до крайнего бруса
  // (crossEdge) равен промежутку между краями соседних (crossGap), при
  // «Оптимизировать размеры» отступ больше на 2 мм, промежутки - меньше.
  // Отступ меньше толщины обшивки + стойки: при числе, заданном вручную, -
  // блокировка, штатно (2 бруса) - предупреждение. Ручное число с
  // расстоянием больше 700 мм - предупреждение. maxCrossBeamCount -
  // наибольшее число брусьев без блокировки (край ползунка у клиента).
  const crossManual = input.lidCrossBeamCount > 0;
  const crossN = s.crossBeamCount, crossW = s.crossBeamW, crossAdd = s.crossBeamEdgeAdd;
  const crossEdge = (L - crossN * crossW) / (crossN + 1) + crossAdd;
  const crossGap = (L - crossN * crossW - 2 * crossEdge) / (crossN - 1);
  const crossHardMin = skin.value + s.stojkaT;
  const crossMinGap = crossHardMin - crossAdd; // отступ без надбавки, при котором крайний брус ещё не заходит на стенку
  const maxCrossBeamCount = Math.max(2, Math.floor((L - crossMinGap) / (crossW + crossMinGap) + 1e-9));
  if (crossEdge < crossHardMin) {
    if (crossManual) {
      return { error: `${tooManyCrossBeamsText(crossN)} в крышке: отступ от стенки до крайнего бруса ${Math.round(crossEdge)} мм меньше толщины обшивки и стойки (${Math.round(crossHardMin)} мм) - уменьшите число брусьев. Расчёт не выполняется.` };
    }
    warnings.push(`Отступ от стенки до крайнего поперечного бруса крышки ${Math.round(crossEdge)} мм меньше толщины обшивки и стойки (${Math.round(crossHardMin)} мм) даже при 2 брусьях.`);
  }
  if (crossManual && crossGap > s.crossBeamMaxGap) {
    warnings.push(`Расстояние между краями поперечных брусьев крышки ${Math.round(crossGap)} мм больше ${s.crossBeamMaxGap} мм.`);
  } else if (crossManual && crossEdge > s.crossBeamMaxGap) {
    warnings.push(`Отступ от стенки до крайнего поперечного бруса крышки ${Math.round(crossEdge)} мм больше ${s.crossBeamMaxGap} мм.`);
  }
  if (s.polozSimpleExceeded) {
    warnings.push('Масса вне диапазона табл. полозьев со сплошным основанием (500–20000 кг) - сечение полоза принято по крайнему значению.');
  }
  const t19 = s.skidTableInfo;
  if (t19) {
    if (t19.massSnapped) {
      warnings.push(`Масса ${MASS} кг вне Табл. 19 - принята ближайшая (${t19.massUsed} кг).`);
    }
    if (t19.lengthSnapped) {
      warnings.push(`Длина полоза ${Math.round(s.len)} мм вне Табл. 19 - принята ближайшая (${t19.lengthUsed} мм).`);
    }
    if (t19.extrapolatedBeyondOne) {
      warnings.push(`Табл. 19: не хватает полозьев для шага осей ≤1200 мм (п.1.6.2) - добавлен ещё того же сечения (${t19.count} шт. итого).`);
    }
  }
  if (s.stojkaExceeded) {
    warnings.push('Масса или высота ящика вне табл. толщины стоек - сечение принято по крайнему значению.');
  }
  if (s.longBeamExceeded) {
    warnings.push('Шаг осей брусьев крышки вне табл. продольных брусьев - сечение принято по крайнему значению.');
  }
  if (s.floorBoardExceeded) {
    warnings.push('Удельная нагрузка или шаг полозьев вне Табл. 4 - толщина доски дна принята по крайнему значению.');
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
  // Каркасы щитов. Штатное число стоек считается всегда - его клиент
  // показывает центром ползунков ручной настройки.
  const torecSpace = W + s.stojkaT * 2, bokSpace = L; // бок - по длине груза
  const torecManual = input.torecPostCount > 0, bokManual = input.bokPostCount > 0;
  const torecStandard = buildFrame(torecSpace, panelHeightFull, H);
  const bokStandard = buildFrame(bokSpace, panelHeightFull, H);
  const torecFrame = torecManual ? buildFrame(torecSpace, panelHeightFull, H, input.torecPostCount) : torecStandard;
  const bokFrame = bokManual ? buildFrame(bokSpace, panelHeightFull, H, input.bokPostCount) : bokStandard;
  if (torecFrame.tooNarrow) {
    return { error: `Ширина груза ${W} мм слишком мала для минимум двух стоек торцевого щита (по 100мм) - расчёт не выполняется.` };
  }
  if (bokFrame.tooNarrow) {
    return { error: `Длина груза ${L} мм слишком мала для минимум двух стоек бокового щита (по 100мм) - расчёт не выполняется.` };
  }
  // Заданное вручную число стоек не помещается - блокировка.
  if (torecManual && torecFrame.sectionW <= 0) {
    return { error: `${tooManyPostsText(torecFrame.count)} на торцевом щите ${Math.round(torecSpace)} мм - уменьшите число стоек. Расчёт не выполняется.` };
  }
  if (bokManual && bokFrame.sectionW <= 0) {
    return { error: `${tooManyPostsText(bokFrame.count)} на боковом щите ${Math.round(bokSpace)} мм - уменьшите число стоек. Расчёт не выполняется.` };
  }
  // Угол раскосины при ручном числе стоек - вне 20-60° только предупреждение.
  const manualAngleWarn = (manual, frame, title) => {
    if (!manual || !frame.hasRaskosina) return;
    const angle = frameAngleDeg(frame);
    if (angle < MIN_ANGLE || angle > MAX_ANGLE) {
      warnings.push(`${title}: угол раскосины ${Math.round(angle)}° вне 20–60° - нужна консультация конструктора.`);
    }
  };
  if (torecFrame.warn) warnings.push('Щит торцевой: ' + torecFrame.warn + '.');
  manualAngleWarn(torecManual, torecFrame, 'Щит торцевой');
  if (bokFrame.warn) warnings.push('Щит боковой: ' + bokFrame.warn + '.');
  manualAngleWarn(bokManual, bokFrame, 'Щит боковой');
  if (torecFrame.len <= 0) {
    return { error: `Внутренняя высота груза ${H} мм слишком мала для каркаса торцевого щита - расчёт не выполняется.` };
  }
  if (bokFrame.len <= 0) {
    return { error: `Внутренняя высота груза ${H} мм слишком мала для каркаса бокового щита - расчёт не выполняется.` };
  }
  // Раскосина - 2/3 толщины стойки.
  const rask = { t: ov('tRaskosina', round(s.stojkaT * 2 / 3), 'Толщина раскосины'), w: 100 };
  const endPanel = buildEndPanel(c, s, torecFrame, rask);
  const bokovoy = buildBokovoy(c, s, bokFrame, rask);

  // --- 4. Итог ---
  const totalVolume = dno.volume + kryshka.volume + 2 * endPanel.volume + 2 * bokovoy.volume;
  const normaVremeni = computeNormaVremeni(totalVolume, baseProductivity, timeCoeff);
  const woodRho = woodDensity > 0 ? woodDensity : WOOD_DENSITY_KG_M3;
  const crateMass = totalVolume * woodRho;

  if (round.state.exceeded) {
    warnings.push(`Расчётная толщина детали больше максимальной «в наличии» (${availableThicknesses[availableThicknesses.length - 1]} мм) - использовано значение по ГОСТ (нужен пиломатериал большей толщины).`);
  }
  Object.values(belowGost).forEach(b => {
    warnings.push(`${b.label}: вручную указано ${b.value} мм (< расчётных ${Math.round(b.gostValue * 100) / 100} мм по ГОСТ) - использовано введённое значение.`);
  });
  if (appliedCount() > 0) {
    warnings.push('Использованы вручную введённые толщины, а не расчётные по ГОСТ - чертежи ниже могут их не точно отражать.');
  }

  const result = {
    warnings, dno: dno.rows, kryshka: kryshka.rows, endPanel: endPanel.rows, bokovoy: bokovoy.rows,
    outerL: s.len, outerW: s.outerW, outerH: s.outerH, totalVolume, normaVremeni, crateMass, woodDensity: woodRho,
    // Параметры чертежей.
    k9Base: s.len, W, L, H, t_stojka: s.stojkaT, skin, t21: s.crossBeamT, t_longbeam: s.longBeamT, lidLayout: input.lidLayout,
    torecFrame, bokFrame, panelHeightFull,
    crossBeamCount: s.crossBeamCount, longbeamCount: s.longBeamCount,
    // Толщина обшивки и рамы на чертеже крышки: +2 мм при «Оптимизировать
    // размеры» (только чертёж).
    t32Display: input.optimizeSizes ? skin.value + 2 : skin.value,
    // Отступ от стенки до крайнего поперечного бруса и расстояние между
    // краями соседних (на чертеже крышки).
    edgeDistCross: Math.round(crossEdge), gapDistCross: Math.round(crossGap),
    sideFrameDisplay: s.stojkaT + skin.value + (input.optimizeSizes ? 2 : 0),
    xRaskosina: !!input.xRaskosina,
    standardTorecPostCount: torecStandard.count, standardBokPostCount: bokStandard.count,
    standardCrossBeamCount: s.standardCrossBeamCount, maxCrossBeamCount,
    // Пергамин (галочка «Добавить пергамин») - площадь внутренних поверхностей
    // ящика по размерам груза: 2×(Д×Ш + Д×В + Ш×В), м², вверх до 0.01 (как у
    // I-1 и I-3). Не пиломатериал - в объём, массу и норму времени не входит.
    parchment: input.addParchment ? [{ name: 'Пергамин', area: Math.ceil(2 * (L * W + L * H + W * H) / 1e6 * 100 - 1e-9) / 100 }] : [],
  };

  // Отрицательное число в любом поле - невозможная геометрия.
  const negField = findNegativeField(result, '');
  if (negField) {
    console.warn('Расчёт дал отрицательное значение:', negField);
    return { error: 'При таких размерах и массе груза получаются недопустимые (отрицательные) размеры деталей - рассчитать ящик нельзя. Проверьте введённые размеры и массу груза.' };
  }
  return result;
}

module.exports = { computeGost10198II1, WOOD_DENSITY_KG_M3 };
