// ГОСТ 10198-91, тип III-1: расчёт каркасно-щитового плотного разборного
// ящика с наружным каркасом (на болтах).
//
// Порядок расчёта:
//   1. проверка входных данных, толщина обшивки (16 мм, при насыпном или
//      незакреплённом грузе 19 мм);
//   2. согласование размеров: каркас щитов (Табл. 12; стойки и
//      горизонтальные брусья щита - одной толщины), брусья крышки и
//      продольный брус дна (как горизонтальный брус бокового щита), полозья,
//      доска дна, число поперечных брусьев крышки (sizing.js);
//   3. узлы: дно (dno.js), крышка (kryshka.js), каркасы щитов (frame.js),
//      щит торцевой (end-panel.js), щит боковой (bokovoy.js), болты
//      (bolts.js);
//   4. объём, норма времени, предупреждения.
//
// Ручные толщины из таблицы (manualOverrides) подставляются везде, где
// участвуют.
const { makeRoundUpToAvailable, thicknessPartWarnings, findNegativeField, inputLimitsError, computeNormaVremeni } = require('../helpers');
const { skinThickness } = require('./logic');
const { stabilizeSizes } = require('./sizing');
const { buildDno } = require('./dno');
const { buildKryshka } = require('./kryshka');
const { buildFrame, frameAngleDeg, tooManyPostsText, MIN_ANGLE, MAX_ANGLE } = require('./frame');
const { buildEndPanel } = require('./end-panel');
const { buildBokovoy } = require('./bokovoy');
const { boltRows } = require('./bolts');

// Плотность древесины по умолчанию, кг/м³; на клиенте настраивается
// шестерёнкой у «Массы ящика».
const WOOD_DENSITY_KG_M3 = 700;

// «N поперечных брусьев не помещаются» - с согласованием по числу.
function tooManyCrossBeamsText(n) {
  const n10 = n % 10, n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return `${n} поперечный брус не помещается`;
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return `${n} поперечных бруса не помещаются`;
  return `${n} поперечных брусьев не помещаются`;
}

// Поля «Тонкая настройка» (fineThickness) -> ключи ручных толщин (как у
// II-1): каркас - одна толщина у стоек, горизонтальных брусьев и раскосин
// обоих щитов (по указанию пользователя); у брусьев крышки и продольного
// бруса дна - свои поля, каркас их не меняет (см. sizing.js).
const FINE_THICKNESS_KEYS = {
  skid: ['t9'], sub: ['t10'], endBeam: ['t11'], dnoBeam: ['tDnoBeam'], floor: ['floorBoardT'],
  frame: ['tTorFrame', 'tBokFrame', 'tRaskosina'], skin: ['skinValue'], lidBeam: ['tLidBeam'],
};
function fineThicknessOverrides(fineThickness) {
  const out = {};
  Object.keys(FINE_THICKNESS_KEYS).forEach(f => {
    const v = fineThickness && fineThickness[f];
    if (v > 0) FINE_THICKNESS_KEYS[f].forEach(k => { out[k] = v; });
  });
  return out;
}

// Ручные толщины: правка ячейки таблицы деталей (manualOverrides) главнее
// поля «Тонкая настройка» (fine), то - главнее расчёта по ГОСТ (как у
// II-1). opts.cell = false - не учитывать правку ячейки. Значение из цикла
// согласования читается на каждой итерации, поэтому «меньше ГОСТ» не
// пишется в предупреждения сразу, а копится в belowGost.
function makeThicknessOverrides(manualOverrides, fine) {
  const belowGost = {};
  let applied = 0;
  const valid = v => !(v === undefined || v === null || Number.isNaN(v) || v <= 0);
  function ov(key, gostValue, label, opts) {
    const useCell = !opts || opts.cell !== false;
    const v = useCell && valid(manualOverrides[key]) ? manualOverrides[key]
      : valid(fine[key]) ? fine[key] : undefined;
    if (v === undefined) return gostValue;
    applied++;
    if (v < gostValue) belowGost[key] = { value: v, gostValue, label };
    else delete belowGost[key];
    return v;
  }
  return { ov, belowGost, appliedCount: () => applied };
}

// input: { L, W, H, MASS, fasteningType ('skid' | 'floor_boards'),
//   solidRigidBase, removeFloorBoards, removeSkidBoards, forkliftLoading,
//   roundBoardWidths,
//   bulkCargo (насыпной или незакреплённый груз), addRaskosina, xRaskosina,
//   torecPostCount, bokPostCount (число стоек вручную; нет - штатно),
//   lidCrossBeamCount (число поперечных брусьев крышки вручную; нет - штатно),
//   lidCrossBeamAxis (расстояние между осями поперечных брусьев крышки
//   500-800 мм вручную; нет - штатно; при lidCrossBeamCount не учитывается),
//   addParchment, fineThickness ({ skid, sub, endBeam, dnoBeam, floor,
//   frame, skin, lidBeam } - толщины из «Тонкой настройки», мм;
//   нет - по расчёту), availableThicknesses, manualOverrides, baseProductivity,
//   timeCoeff, woodDensity, optimized (оптимальный конструктивный вариант
//   по таблице заказчика: без продольных брусьев дна, щиты по высоте с
//   досками дна, см. sizing.js, dno.js, kryshka.js) }.
function computeGost10198III1(input) {
  const { L, W, H, MASS, baseProductivity, timeCoeff, woodDensity } = input;
  const availableThicknesses = input.availableThicknesses || [];
  const round = makeRoundUpToAvailable(availableThicknesses);
  const { ov, belowGost, appliedCount } = makeThicknessOverrides(input.manualOverrides || {}, fineThicknessOverrides(input.fineThickness));

  // --- 1. Входные данные, обшивка ---
  if (!L || !W || !H || !MASS || L <= 0 || W <= 0 || H <= 0 || MASS <= 0) {
    return { error: 'Заполните все поля положительными числами.' };
  }
  const limitsError = inputLimitsError(input);
  if (limitsError) return { error: limitsError };
  const warnings = [];
  if (MASS > 20000) {
    warnings.push('Масса груза вне диапазона типа III-1 (≤20000 кг) - расчёт продолжен по крайнему значению.');
  }
  if (MASS < 200) {
    warnings.push(`Масса груза ${MASS} кг менее 200 кг - вне области распространения ГОСТ 10198-91 в целом (200–20000 кг). Расчёт продолжен, но результат нужно перепроверить.`);
  }
  const skin = { value: ov('skinValue', round(skinThickness(input.bulkCargo)), 'Толщина обшивки') };
  const c = { ...input, availableThicknesses, skinT: skin.value, ov, round, warnings };

  // --- 2. Согласование размеров ---
  const s = stabilizeSizes(c);

  // Поперечные брусья крышки: крайние - вровень с концами крышки, остальные
  // - равномерно между ними. Промежуток между краями соседних (crossGap)
  // меньше 0 - брусья не помещаются: при числе, заданном вручную, -
  // блокировка. Ручное число с промежутком больше 700 мм - предупреждение
  // (при заданном расстоянии между осями - нет: оно 500-800 мм по п.1.8.1).
  // maxCrossBeamCount - наибольшее число брусьев без блокировки (край
  // ползунка у клиента).
  const crossManual = input.lidCrossBeamCount > 0;
  const crossN = s.crossBeamCount, crossGap = s.crossBeamLayout.gap;
  const maxCrossBeamCount = Math.max(2, Math.floor(s.len / s.beamW + 1e-9));
  if (crossGap < 0) {
    if (crossManual) {
      return { error: `${tooManyCrossBeamsText(crossN)} в крышке длиной ${Math.round(s.len)} мм - уменьшите число брусьев. Расчёт не выполняется.` };
    }
    warnings.push(`Поперечные брусья крышки не помещаются по длине крышки (${Math.round(s.len)} мм) даже при 2 брусьях.`);
  }
  if (crossManual && crossGap > s.crossBeamMaxGap) {
    warnings.push(`Расстояние между краями поперечных брусьев крышки ${Math.round(crossGap)} мм больше ${s.crossBeamMaxGap} мм.`);
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
    warnings.push('Масса или высота ящика вне Табл. 12 - толщина каркаса щитов принята по крайнему значению.');
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

  // Каркасы щитов. Высота щита - высота груза; в оптимальном варианте
  // (input.optimized) щиты закрывают и доски дна - высота груза + толщина
  // доски дна.
  // Торцевой щит - по ширине груза, боковой - по наружной длине ящика.
  // Штатное число стоек считается всегда - его клиент показывает центром
  // ползунков ручной настройки.
  const panelH = input.optimized ? H + s.floorBoardT : H;
  c.panelH = panelH;
  const torecSpace = W, bokSpace = s.len;
  const torecManual = input.torecPostCount > 0, bokManual = input.bokPostCount > 0;
  const frameArgs = [panelH, H, s.beamW, input.addRaskosina];
  const torecStandard = buildFrame(torecSpace, ...frameArgs);
  const bokStandard = buildFrame(bokSpace, ...frameArgs);
  const torecFrame = torecManual ? buildFrame(torecSpace, ...frameArgs, input.torecPostCount) : torecStandard;
  const bokFrame = bokManual ? buildFrame(bokSpace, ...frameArgs, input.bokPostCount) : bokStandard;
  if (torecFrame.tooNarrow) {
    return { error: `Ширина груза ${W} мм слишком мала для минимум двух стоек торцевого щита (по 100мм) - расчёт не выполняется.` };
  }
  if (bokFrame.tooNarrow) {
    return { error: `Длина груза ${L} мм слишком мала для минимум двух стоек бокового щита (по 100мм) - расчёт не выполняется.` };
  }
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
  // Раскосина - не тоньше 2/3 толщины стойки щита, ширина как у стойки
  // (п.1.7.7); каркас из «Тонкой настройки» задаёт и раскосины.
  // Толщина раскосины - как у стоек и горизонтальных брусьев щита (по
  // указанию пользователя; раньше - 2/3 толщины каркаса).
  const rask = frameT => ({ t: ov('tRaskosina', round(frameT), 'Толщина раскосины'), w: 100 });
  const endPanel = buildEndPanel(c, s, torecFrame, rask(s.torFrameT));
  const bokovoy = buildBokovoy(c, s, bokFrame, rask(s.bokFrameT));

  // --- 4. Итог ---
  const totalVolume = dno.volume + kryshka.volume + 2 * endPanel.volume + 2 * bokovoy.volume;
  const normaVremeni = computeNormaVremeni(totalVolume, baseProductivity, timeCoeff);
  const woodRho = woodDensity > 0 ? woodDensity : WOOD_DENSITY_KG_M3;
  const crateMass = totalVolume * woodRho;

  if (round.state.exceeded) {
    warnings.push(`Расчётная толщина детали больше максимальной «в наличии» (${availableThicknesses[availableThicknesses.length - 1]} мм) - использована толщина по ГОСТ, такой толщины нет в наличии.`);
  }
  warnings.push(...thicknessPartWarnings(round, availableThicknesses));
  Object.values(belowGost).forEach(b => {
    warnings.push(`${b.label}: вручную указано ${b.value} мм (< расчётных ${Math.round(b.gostValue * 100) / 100} мм по ГОСТ) - использовано введённое значение.`);
  });

  const result = {
    warnings, dno: dno.rows, kryshka: kryshka.rows, endPanel: endPanel.rows, bokovoy: bokovoy.rows,
    outerL: s.len, outerW: s.outerW, outerH: s.outerH, totalVolume, normaVremeni, crateMass, woodDensity: woodRho,
    W, L, H, skin, torFrameT: s.torFrameT, bokFrameT: s.bokFrameT, lidBeamT: s.lidBeamT,
    torecFrame, bokFrame, panelH,
    crossBeamCount: s.crossBeamCount, longbeamCount: s.longBeamCount,
    gapDistCross: Math.round(crossGap), axisDistCross: Math.round(s.crossBeamLayout.axis),
    xRaskosina: !!input.xRaskosina, optimized: !!input.optimized,
    standardTorecPostCount: torecStandard.count, standardBokPostCount: bokStandard.count,
    standardCrossBeamCount: s.standardCrossBeamCount, maxCrossBeamCount,
    // Болты - отдельный раздел, в объём не входят.
    bolts: boltRows(MASS, s, panelH),
    // Пергамин (галочка «Добавить пергамин») - площадь внутренних поверхностей
    // ящика по размерам груза: 2×(Д×Ш + Д×В + Ш×В), м², вверх до 0.01 (как у
    // других типов). В объём, массу и норму времени не входит.
    parchment: input.addParchment ? [{ name: 'Пергамин', area: Math.ceil(2 * (L * W + L * H + W * H) / 1e6 * 100 - 1e-9) / 100 }] : [],
  };
  if (appliedCount() > 0) {
    warnings.push('Использованы вручную введённые толщины, а не расчётные по ГОСТ.');
  }

  // Отрицательное число в любом поле - невозможная геометрия.
  const negField = findNegativeField(result, '');
  if (negField) {
    console.warn('Расчёт дал отрицательное значение:', negField);
    return { error: 'При таких размерах и массе груза получаются недопустимые размеры деталей - рассчитать ящик нельзя. Проверьте введённые размеры и массу груза.' };
  }
  return result;
}

module.exports = { computeGost10198III1, WOOD_DENSITY_KG_M3 };
