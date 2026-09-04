// ГОСТ 10198-91, тип II-1: чистый расчёт - серверный порт
// computeGost10198II1() из src/ii1/calc.js исходного репозитория
// pakhiton79-bit/GOST_10198-91 (методика расчёта не менялась, только
// избавление от модульного глобального состояния толщин "в наличии" -
// тот же характер порта, что и у ../i1/compute.js/../i3/compute.js).
// Общие с типом I-3 таблицы/формулы переиспользуются напрямую из ../i3
// (см. вводный комментарий в ./logic.js).
const { roundup, vol, fillBoards, makeRoundUpToAvailable, findNegativeField } = require('../helpers');
const { subfloorThicknessRaw, polozSection165, floorBoardThicknessNew } = require('../i3/sections');
const { floorBoardThickness } = require('../i3/data/table4');
const { crossBeamThickness } = require('../i3/data/table14');
const { selectSkid19, minSkidsByWidth162 } = require('../i3/data/table19');
const {
  skinThickness, stojkaSection, endBeamSection,
  minCountBySpan, clearGapBySpan, longBeamSection, wallBeamSection,
} = require('./logic');

// input: {L,W,H,MASS,fasteningType,solidRigidBase,removeFloorBoards,
//         removeSkidBoards,forkliftLoading,roundBoardWidths,lidLayout,
//         optimizeSizes,availableThicknesses,manualOverrides}.
function computeGost10198II1(input) {
  const { L, W, H, MASS, fasteningType, solidRigidBase, removeFloorBoards,
    removeSkidBoards, forkliftLoading, roundBoardWidths, lidLayout,
    optimizeSizes } = input;
  const availableThicknesses = input.availableThicknesses || [];
  const roundUpToAvailable = makeRoundUpToAvailable(availableThicknesses);
  const mo = input.manualOverrides || {};

  if (!L || !W || !H || !MASS || L <= 0 || W <= 0 || H <= 0 || MASS <= 0) {
    return { error: 'Заполните все поля положительными числами.' };
  }

  let warnings = [];

  // Ручной ввод толщины в таблице (клиент шлёт его в manualOverrides) -
  // подставляется вместо расчётного по ГОСТ значения. У большинства полей -
  // полный каскад, значение читается внутри цикла стабилизации на каждой
  // итерации (см. ниже), поэтому предупреждение "меньше ГОСТ-минимума" не
  // добавляем сразу в ov() (иначе задвоилось бы 4 раза за 4 итерации), а
  // копим в belowGost и печатаем один раз после того, как всё
  // стабилизировалось. Исключение - t9 (полоз) и t11 (торцовый брус дна):
  // сечение выбирается из ГОСТ-таблицы парой толщина+ширина сразу - override
  // только толщины без ширины нарушил бы табличную связку, поэтому у этих
  // двух полей override ИЗОЛИРОВАННЫЙ (см. t9Display/t11Display ниже).
  const belowGost = {};
  let overridesApplied = 0;
  function ov(key, gostValue, label) {
    const v = mo[key];
    if (v === undefined || v === null || Number.isNaN(v) || v <= 0) return gostValue;
    overridesApplied++;
    if (v < gostValue) {
      belowGost[key] = { value: v, gostValue, label };
    } else {
      delete belowGost[key];
    }
    return v;
  }
  if (MASS > 20000) {
    warnings.push('Масса груза вне диапазона типа II-1 (≤20000 кг) — расчёт продолжен по крайнему значению.');
  }

  const skin = { value: ov('skinValue', roundUpToAvailable(skinThickness(MASS)), 'Толщина обшивки (доска крышки)') };

  const w21 = 100; // ширина поперечного бруса крышки - по Табл. 14 всегда 100мм

  // --- Итеративная стабилизация: толщина стойки <-> наружная ширина/высота
  //     <-> длина полоза (Табл.19) <-> продольный брус крышки (режим
  //     "поперечное") --- см. подробный комментарий в src/ii1/calc.js
  //     исходного репозитория.
  let t_stojka = skin.value, stojkaExceeded = false;
  let k9Base = L, outerW = W, skidCalcWidth = W, t9 = 0, w9 = 0, l9 = 0, lastSkidInfo = null;
  let t21 = 0, crossBeamExceeded = false, crossBeamCount = 0, crossBeamMarginBelowMin = false;
  let t_longbeam = 0, w_longbeam = 100, longbeamCount = 0, longbeamExceeded = false;
  let floorBoardT = 0, floorBoardExceeded = false;
  let t10 = 0, w10 = 0, k10 = 0, l10 = 0;
  let outerH = 0;
  let polozSimpleExceeded = false;

  for (let iter = 0; iter < 4; iter++) {
    k9Base = L + (t_stojka + skin.value) * 2;
    outerW = W + (t_stojka + skin.value) * 2;
    skidCalcWidth = W + t_stojka * 2;

    const crossBeamRaw = crossBeamThickness(MASS, outerW); // Табл. 14
    crossBeamExceeded = crossBeamRaw.exceeded;
    t21 = ov('t21', roundUpToAvailable(crossBeamRaw.value), 'Толщина поперечного бруса крышки');
    // Поперечные брусья крышки - расстояние МЕЖДУ ОСЯМИ (с учётом ширины
    // крайнего бруса) не более 700мм; расположены РАВНОМЕРНО по всей длине
    // крышки - включая отступы от краёв, равные промежуткам между соседними
    // брусьями (а не flush-edge, как у стоек каркаса).
    crossBeamCount = Math.max(2, Math.ceil((L + w21) / 700 - 1));
    const crossMinMargin = skin.value + t_stojka + 10;
    const crossMarginCheck = (L - crossBeamCount * w21) / (crossBeamCount + 1);
    crossBeamMarginBelowMin = crossMarginCheck < crossMinMargin;

    if (solidRigidBase) {
      const l9_default = (W > 1100) ? 3 : 2;
      const poloz = polozSection165(MASS);
      polozSimpleExceeded = poloz.exceeded;
      const minNeeded = minSkidsByWidth162(skidCalcWidth, poloz.w);
      l9 = l9_default < minNeeded ? minNeeded : l9_default;
      t9 = poloz.h; w9 = poloz.w;
      lastSkidInfo = null;
    } else {
      const sel = selectSkid19(MASS, k9Base, skidCalcWidth, availableThicknesses);
      l9 = sel.count; t9 = sel.h; w9 = sel.w;
      lastSkidInfo = sel;
    }

    const t10Raw = forkliftLoading ? Math.max(subfloorThicknessRaw(MASS), 50) : subfloorThicknessRaw(MASS);
    t10 = ov('t10', roundUpToAvailable(t10Raw), 'Толщина подполозной доски');
    w10 = Math.min(w9, 150); k10 = k9Base - 400; l10 = l9;

    if (fasteningType === 'floor_boards') {
      const distanceMm = l9 > 1 ? skidCalcWidth / (l9 - 1) : skidCalcWidth;
      const fb = floorBoardThickness(MASS, L, W, distanceMm);
      floorBoardT = roundUpToAvailable(fb.value); floorBoardExceeded = fb.exceeded;
    } else {
      floorBoardT = roundUpToAvailable(floorBoardThicknessNew(MASS));
    }
    floorBoardT = ov('floorBoardT', floorBoardT, 'Толщина доски дна');

    outerH = (removeSkidBoards ? 0 : t10) + t9 + floorBoardT + H + t21 + t_longbeam + skin.value;

    const stj = stojkaSection(MASS, outerH);
    t_stojka = ov('tStojka', roundUpToAvailable(stj.t), 'Толщина стойки');
    stojkaExceeded = stj.exceeded;

    if (lidLayout === 'transverse') {
      const fillspaceLong = W;
      longbeamCount = minCountBySpan(fillspaceLong, 100, 800);
      const longbeamAxis = clearGapBySpan(fillspaceLong, 100, longbeamCount) + 100; // ось-в-ось
      const crossBeamAxis = (L + w21) / (crossBeamCount + 1);
      const lb = longBeamSection(crossBeamAxis, roundBoardWidths, longbeamAxis);
      t_longbeam = ov('tLongbeam', roundUpToAvailable(lb.t), 'Толщина продольного бруса крышки');
      w_longbeam = lb.w; longbeamExceeded = lb.exceeded;
    } else {
      t_longbeam = 0; w_longbeam = 100; longbeamCount = 0;
    }
  }

  if (crossBeamExceeded) {
    warnings.push('Масса или ширина ящика вне Табл. 14 — поперечный брус крышки принят по крайнему значению.');
  }
  if (crossBeamMarginBelowMin) {
    warnings.push('Отступ от края крышки до крайнего бруса меньше минимума (обшивка + стойка + 10 мм) даже при 2 брусьях — уменьшить без нарушения шага ≤700 мм нельзя.');
  }
  if (polozSimpleExceeded) {
    warnings.push('Масса вне диапазона табл. полозьев со сплошным основанием (500–20000 кг) — сечение полоза принято по крайнему значению.');
  }
  if (lastSkidInfo) {
    if (lastSkidInfo.massSnapped) {
      warnings.push(`Масса ${MASS} кг вне Табл. 19 — принята ближайшая (${lastSkidInfo.massUsed} кг).`);
    }
    if (lastSkidInfo.lengthSnapped) {
      warnings.push(`Длина полоза ${Math.round(k9Base)} мм вне Табл. 19 — принята ближайшая (${lastSkidInfo.lengthUsed} мм).`);
    }
    if (lastSkidInfo.extrapolatedBeyondOne) {
      warnings.push(`Табл. 19: не хватает полозьев для шага осей ≤1200 мм (п.1.6.2) — добавлен ещё того же сечения (${lastSkidInfo.count} шт. итого).`);
    }
  }
  if (stojkaExceeded) {
    warnings.push('Масса или высота ящика вне табл. толщины стоек — сечение принято по крайнему значению.');
  }
  if (longbeamExceeded) {
    warnings.push('Шаг осей брусьев крышки вне табл. продольных брусьев — сечение принято по крайнему значению.');
  }
  // Чертёж крышки показывает готовые фото только для 9 конкретных сочетаний
  // число_продольных×число_поперечных брусьев - если расчётное сочетание не
  // входит в этот список, берётся ближайшее и добавляется предупреждение
  // (см. nearestKryshkaVariant в frontend/public/js/ii1/diagrams/kryshka.js).
  const kryshkaVariant = nearestKryshkaVariant(longbeamCount, crossBeamCount);
  if (!kryshkaVariant.exact) {
    warnings.push(`Крышка: чертёж — ближайшее готовое сочетание брусьев (${kryshkaVariant.longbeamCount}×прод./${kryshkaVariant.crossBeamCount}×попер.) вместо расчётного (${longbeamCount}×прод./${crossBeamCount}×попер.); точное количество см. в таблице ниже.`);
  }
  // Отступ от края крышки до края крайнего поперечного бруса - та же формула
  // (count+1 равных промежутков), которой уже задан сам crossBeamCount выше.
  const edgeDistCross = Math.round((L - crossBeamCount * w21) / (crossBeamCount + 1));
  if (floorBoardExceeded) {
    warnings.push('Удельная нагрузка или шаг полозьев вне Табл. 4 — толщина доски дна принята по крайнему значению.');
  }
  if (k10 < 300) {
    warnings.push(`Длина подполозной доски ${Math.round(k10)} мм менее 300 мм.`);
  }
  const subfloorForkliftFail = forkliftLoading && k10 < 300;
  if (subfloorForkliftFail) {
    warnings.push(`Погрузка погрузчиком требует ≥300 мм у подполозной доски (сейчас ${Math.round(k10)} мм).`);
  }

  // --- ДНО ---
  const dno = [];
  const t9Display = ov('t9', t9, 'Толщина полоза');
  dno.push({ name: 'Полоз', t: t9Display, w: w9, l: k9Base, qty: l9, overrideKey: 't9' });
  if (!removeSkidBoards) {
    dno.push({
      name: 'Подполозная доска',
      t: subfloorForkliftFail ? '⚠' : t10,
      w: subfloorForkliftFail ? '⚠' : w10,
      l: subfloorForkliftFail ? '⚠' : k10,
      qty: subfloorForkliftFail ? '⚠' : l10,
      overrideKey: subfloorForkliftFail ? null : 't10',
    });
  }
  const endBeam = endBeamSection(MASS);
  const t11 = roundUpToAvailable(endBeam.h), w11 = endBeam.w, k11 = W, l11 = 2;
  const t11Display = ov('t11', t11, 'Толщина торцового бруса дна');
  dno.push({ name: 'Торцовый брус дна', t: t11Display, w: w11, l: k11, qty: l11, overrideKey: 't11' });

  const fbDno = fillBoards(L - w11 * 2, roundBoardWidths);
  const t12 = floorBoardT, w12 = 100, l12 = fbDno.mainQty, k12 = W;
  if (!removeFloorBoards) {
    if (l12 > 0) dno.push({ name: 'Доска дна', t: t12, w: w12, l: k12, qty: l12, overrideKey: 'floorBoardT' });
    fbDno.extra.forEach((e, i) => {
      dno.push({ name: 'Доска дна (дополнительная) ' + (i + 1), t: t12, w: e.width, l: k12, qty: e.qty });
    });
    if (fbDno.warn) {
      warnings.push('Доска дна: остаток — нестандартная ширина (вне 75–99 мм).');
    }
    if (fbDno.singleNarrow) {
      warnings.push('Доска дна: одна доска уже менее 100 мм.');
    }
  }

  const volDno = vol(t9, w9, k9Base, l9) + (removeSkidBoards ? 0 : vol(t10, w10, k10, l10)) + vol(t11, w11, k11, l11)
    + (removeFloorBoards ? 0 : (vol(t12, w12, k12, l12) + fbDno.extra.reduce((s, e) => s + vol(t12, e.width, k12, e.qty), 0)));

  // --- КРЫШКА ---
  const k21 = W - (optimizeSizes ? 4 : 0);
  const kryshka = [];
  kryshka.push({ name: 'Внутренний поперечный брус', t: t21, w: w21, l: k21, qty: crossBeamCount, overrideKey: 't21' });
  let volKryshka = vol(t21, w21, k21, crossBeamCount);

  let lidBoardLen, lidFillspace;
  if (lidLayout === 'transverse') {
    const k_longbeam = L + t_stojka * 2 - (optimizeSizes ? 4 : 0);
    kryshka.push({ name: 'Внутренний продольный брус', t: t_longbeam, w: w_longbeam, l: k_longbeam, qty: longbeamCount, overrideKey: 'tLongbeam' });
    volKryshka += vol(t_longbeam, w_longbeam, k_longbeam, longbeamCount);
    lidBoardLen = outerW;
    lidFillspace = k9Base;
  } else {
    lidBoardLen = k9Base;
    lidFillspace = outerW;
  }
  const fbKryshka = fillBoards(lidFillspace, roundBoardWidths);
  const t20 = skin.value, w20 = 100, l20 = fbKryshka.mainQty, k20 = lidBoardLen;
  if (l20 > 0) kryshka.push({ name: 'Доска крышки', t: t20, w: w20, l: k20, qty: l20, overrideKey: 'skinValue' });
  fbKryshka.extra.forEach((e, i) => {
    kryshka.push({ name: 'Доска крышки (дополнительная) ' + (i + 1), t: t20, w: e.width, l: k20, qty: e.qty });
  });
  if (fbKryshka.warn) {
    warnings.push('Доска крышки: остаток — нестандартная ширина (вне 75–99 мм).');
  }
  if (fbKryshka.singleNarrow) {
    warnings.push('Доска крышки: одна доска уже менее 100 мм.');
  }
  volKryshka += vol(t20, w20, k20, l20) + fbKryshka.extra.reduce((s, e) => s + vol(t20, e.width, k20, e.qty), 0);

  // --- Общая высота панели (щита) на 1 этаж, без опоры снизу (полоза/доски дна) ---
  const panelHeightFull = H + floorBoardT + t_longbeam;

  // Продольные брусья торца/бока (в таблице деталей - "Горизонтальный брус",
  // не путать с продольным брусом крышки выше - это разные объекты с
  // разными параметрами из разных таблиц источника, по уточнению
  // пользователя) - общая таблица масса×шаг осей поперечных брусьев крышки
  // (crossBeamAxis - та же величина, что и у продольного бруса крышки).
  const crossBeamAxis = (L + w21) / (crossBeamCount + 1);
  const wallBeam = wallBeamSection(MASS, crossBeamAxis);
  const t_wallbeam = ov('tWallbeam', roundUpToAvailable(wallBeam.t), 'Толщина горизонтального бруса торца/бока');
  const wallbeamExceeded = wallBeam.exceeded;
  if (wallbeamExceeded) {
    warnings.push('Масса или шаг осей поперечных брусьев крышки вне табл. продольных брусьев торца/бока — сечение принято по крайнему значению.');
  }

  // Вспомогательная функция: считает число стоек по каркасу щита (см.
  // подробный комментарий в src/ii1/calc.js исходного репозитория).
  function buildFrame(fillspace, panelH) {
    const memberW = 100; // ширина стойки
    const maxAxis = 800;
    const spacingMinCount = minCountBySpan(fillspace, memberW, maxAxis);
    function sectionW(n) { return clearGapBySpan(fillspace, memberW, n); }
    function angleDeg(n, h) { return Math.atan2(h, sectionW(n)) * 180 / Math.PI; }
    function stojkaLen(fl) {
      return fl === 2 ? (panelH - 100 * 3) / 2 : panelH - 100 * 2;
    }
    if (sectionW(2) <= 0) {
      return { count: 2, floors: 1, len: 0, sectionW: 0, hasRaskosina: false, warn: null, tooNarrow: true };
    }

    let floors = H > 2000 ? 2 : 1;
    if (floors === 1 && angleDeg(2, stojkaLen(1)) > 60) {
      floors = 2;
    }
    const len = stojkaLen(floors);
    let warn = null;

    let angleCount = 2;
    if (len > 0) {
      while (sectionW(angleCount + 1) > 0 && angleDeg(angleCount, len) < 20) {
        angleCount++;
      }
      if (angleDeg(angleCount, len) < 20) {
        warn = `угол раскосины <20° даже при максимуме секций (${angleCount})`;
      }
    }

    let count = Math.max(angleCount, spacingMinCount);
    if (sectionW(count) <= 0) {
      return { count, floors, len: 0, sectionW: 0, hasRaskosina: false, warn: null, tooNarrow: true };
    }
    const hasRaskosina = len > 0;
    return { count, floors, len, sectionW: sectionW(count), hasRaskosina, warn, tooNarrow: false };
  }

  const fillspaceTorec = W + t_stojka * 2;
  const torecFrame = buildFrame(fillspaceTorec, panelHeightFull);
  const fillspaceBok = L; // буквально "длине груза" по тексту источника
  const bokFrame = buildFrame(fillspaceBok, panelHeightFull);

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
  const torecVariant = nearestTorecVariant(torecFrame.count, torecFrame.floors);
  if (!torecVariant.exact) {
    warnings.push(`Щит торцевой: чертёж — ближайшая готовая схема (${torecVariant.count} стойки/${torecVariant.floors} эт.) вместо расчётной (${torecFrame.count} стоек/${torecFrame.floors} эт.); точное количество см. в таблице ниже.`);
  }
  const bokVariant = nearestBokVariant(bokFrame.count, bokFrame.floors);
  if (!bokVariant.exact) {
    warnings.push(`Щит боковой: чертёж — ближайшая готовая схема (${bokVariant.count} стойки/${bokVariant.floors} эт.) вместо расчётной (${bokFrame.count} стоек/${bokFrame.floors} эт.); точное количество см. в таблице ниже.`);
  }

  // --- ЩИТ ТОРЦЕВОЙ (расчёт на 1 щит, далее удвоение) ---
  const t_raskosina = ov('tRaskosina', roundUpToAvailable(t_stojka * 2 / 3), 'Толщина раскосины'), w_raskosina = 100;

  const t30 = t_stojka, w30 = 100, k30 = torecFrame.len, l30 = torecFrame.count * torecFrame.floors;
  const t31 = t_wallbeam, w31 = 100, k31 = W + t_stojka * 2, l31 = torecFrame.floors + 1;
  const k33 = Math.sqrt(Math.pow(torecFrame.sectionW, 2) + Math.pow(torecFrame.len, 2));
  const l33 = torecFrame.hasRaskosina ? (torecFrame.count - 1) * torecFrame.floors : 0;

  const t32 = skin.value, k32 = 100 * 2 + torecFrame.len + t_longbeam;
  // t32Display/sideFrameDisplay - косметическая надбавка +2мм на чертеже
  // крышки при включённой «Оптимизировать размеры» (по образцу t40Display в
  // типе I-3) - на реальные t32/t_stojka/skin.value (идут в таблицу и расход
  // пиломатериала) не влияет.
  const t32Display = optimizeSizes ? t32 + 2 : t32;
  const sideFrameDisplay = t_stojka + skin.value + (optimizeSizes ? 2 : 0);
  const fbTorec = fillBoards(outerW, roundBoardWidths);
  const w32 = 100, l32 = fbTorec.mainQty * torecFrame.floors;
  if (fbTorec.warn) {
    warnings.push('Доска торца: остаток — нестандартная ширина (вне 75–99 мм).');
  }
  if (fbTorec.singleNarrow) {
    warnings.push('Доска торца: одна доска уже менее 100 мм.');
  }

  const endPanel = [
    { name: 'Стойка', t: t30, w: w30, l: k30, qty: l30, overrideKey: 'tStojka' },
    { name: 'Горизонтальный брус', t: t31, w: w31, l: k31, qty: l31, overrideKey: 'tWallbeam' },
  ];
  if (torecFrame.hasRaskosina) endPanel.push({ name: 'Раскосина', t: t_raskosina, w: w_raskosina, l: k33, qty: l33, overrideKey: 'tRaskosina' });
  if (l32 > 0) endPanel.push({ name: 'Доска', t: t32, w: w32, l: k32, qty: l32 });
  fbTorec.extra.forEach((e, i) => {
    endPanel.push({ name: 'Доска (дополнительная) ' + (i + 1), t: t32, w: e.width, l: k32, qty: e.qty * torecFrame.floors });
  });

  const volTorPanel = vol(t30, w30, k30, l30) + vol(t31, w31, k31, l31)
    + vol(t_raskosina, w_raskosina, k33, l33)
    + vol(t32, w32, k32, l32) + fbTorec.extra.reduce((s, e) => s + vol(t32, e.width, k32, e.qty), 0);

  // --- ЩИТ БОКОВОЙ (расчёт на 1 щит, далее удвоение) ---
  const t40 = t_stojka, w40 = 100, k40 = bokFrame.len, l40 = bokFrame.count * bokFrame.floors;
  const t43 = t_wallbeam, w43 = 100, k43 = L, l43 = bokFrame.floors === 2 ? 1 : 0;
  const k42 = Math.sqrt(Math.pow(bokFrame.sectionW, 2) + Math.pow(bokFrame.len, 2));
  const l42 = bokFrame.hasRaskosina ? (bokFrame.count - 1) * bokFrame.floors : 0;

  // Опорная планка (несёт поперечные брусья крышки, физически на боковом
  // щите): толщина - толщина доски обшивки, ширина - ширина стойки[100]
  // минус толщина поперечного бруса крышки, округлено вниз, в пределах
  // 50-75мм; длина - равна длине горизонтального бруса бокового щита.
  const stojkaWidth = 100;
  const w_opora_raw = Math.floor(stojkaWidth - t21);
  const w_opora = Math.min(75, Math.max(50, w_opora_raw));
  const t_opora = skin.value, k_opora = k43, l_opora = 2;

  const t41 = skin.value, k41 = 100 * 2 + bokFrame.len + t_longbeam;
  const fbBok = fillBoards(L, roundBoardWidths);
  const w41 = 100, l41 = fbBok.mainQty * bokFrame.floors;
  if (fbBok.warn) {
    warnings.push('Доска бока: остаток — нестандартная ширина (вне 75–99 мм).');
  }
  if (fbBok.singleNarrow) {
    warnings.push('Доска бока: одна доска уже менее 100 мм.');
  }

  const bokovoy = [
    { name: 'Стойка', t: t40, w: w40, l: k40, qty: l40 },
  ];
  if (l43 > 0) bokovoy.push({ name: 'Горизонтальный брус', t: t43, w: w43, l: k43, qty: l43, overrideKey: 'tWallbeam' });
  if (bokFrame.hasRaskosina) bokovoy.push({ name: 'Раскосина', t: t_raskosina, w: w_raskosina, l: k42, qty: l42 });
  bokovoy.push({ name: 'Опорная планка', t: t_opora, w: w_opora, l: k_opora, qty: l_opora });
  if (l41 > 0) bokovoy.push({ name: 'Доска', t: t41, w: w41, l: k41, qty: l41 });
  fbBok.extra.forEach((e, i) => {
    bokovoy.push({ name: 'Доска (дополнительная) ' + (i + 1), t: t41, w: e.width, l: k41, qty: e.qty * bokFrame.floors });
  });

  const volBokPanel = vol(t40, w40, k40, l40) + vol(t43, w43, k43, l43)
    + vol(t_raskosina, w_raskosina, k42, l42) + vol(t_opora, w_opora, k_opora, l_opora)
    + vol(t41, w41, k41, l41) + fbBok.extra.reduce((s, e) => s + vol(t41, e.width, k41, e.qty), 0);

  // --- Итоговый расход пиломатериала ---
  const totalVolume = volDno + volKryshka + 2 * volTorPanel + 2 * volBokPanel;
  const normaVremeni = roundup(totalVolume * 800 / 60 * 1.2, 1);

  const outerL = k9Base;

  if (roundUpToAvailable.state.exceeded) {
    warnings.push(`Расчётная толщина детали больше максимальной «в наличии» (${availableThicknesses[availableThicknesses.length - 1]} мм) — использовано значение по ГОСТ (нужен пиломатериал большей толщины).`);
  }

  Object.values(belowGost).forEach(b => {
    warnings.push(`${b.label}: вручную указано ${b.value} мм (< расчётных ${Math.round(b.gostValue * 100) / 100} мм по ГОСТ) — использовано введённое значение.`);
  });

  if (overridesApplied > 0) {
    warnings.push('Использованы вручную введённые толщины, а не расчётные по ГОСТ — чертежи ниже могут их не точно отражать.');
  }

  const result = {
    warnings, dno, kryshka, endPanel, bokovoy,
    outerL, outerW, outerH, totalVolume, normaVremeni,
    // Параметры для чертежей (Дно/Крышка/Щит торцевой/Щит боковой - см.
    // frontend/public/js/ii1/*).
    k9Base, W, L, H, t_stojka, skin, t21, t_longbeam, lidLayout,
    torecFrame, bokFrame, panelHeightFull,
    crossBeamCount, longbeamCount, t32Display, edgeDistCross, sideFrameDisplay,
  };
  const negField = findNegativeField(result, '');
  if (negField) {
    return { error: `Расчёт дал отрицательное значение (${negField}) — результат недостоверен, проверьте входные данные.` };
  }
  return result;
}

// Доступные готовые сочетания продольных/поперечных брусьев крышки на
// чертеже (см. frontend/public/js/ii1/diagrams/kryshka.js) - продублировано
// здесь только для формирования текста предупреждения (само число там же
// определяет и то, какое фото показать - см. nearestKryshkaVariant в этом же
// файле compute.js и в клиентском diagrams/kryshka.js, независимые копии по
// принципу "фронтенд/сервер не делят код напрямую" уже принятому в проекте).
const KRYSHKA_LONG_OPTIONS = [0, 2, 3, 4];
const KRYSHKA_CROSS_BY_LONG = { 0: [2, 3, 4], 2: [2, 3], 3: [2, 3, 4], 4: [4] };
function nearestKryshkaVariant(longbeamCount, crossBeamCount) {
  const bestLong = KRYSHKA_LONG_OPTIONS.reduce((a, b) => Math.abs(b - longbeamCount) < Math.abs(a - longbeamCount) ? b : a);
  const crossOptions = KRYSHKA_CROSS_BY_LONG[bestLong];
  const bestCross = crossOptions.reduce((a, b) => Math.abs(b - crossBeamCount) < Math.abs(a - crossBeamCount) ? b : a);
  return { longbeamCount: bestLong, crossBeamCount: bestCross, exact: bestLong === longbeamCount && bestCross === crossBeamCount };
}

// Отражает набор готовых схем в frontend/public/js/ii1/diagrams/torec.js
// (TOREC_VARIANTS) - используется здесь ТОЛЬКО для текста предупреждения
// (какая схема реально показана), сам чертёж рисуется на клиенте.
// Независимая копия по тому же принципу, что и KRYSHKA_LONG_OPTIONS/
// KRYSHKA_CROSS_BY_LONG выше - фронтенд/сервер не делят код напрямую.
const TOREC_VARIANT_OPTIONS = { 1: [2, 3, 4], 2: [2, 3, 4] };
function nearestTorecVariant(count, floors) {
  const floorsAvailable = Object.keys(TOREC_VARIANT_OPTIONS).map(Number);
  const bestFloors = floorsAvailable.includes(floors) ? floors
    : floorsAvailable.reduce((a, b) => Math.abs(b - floors) < Math.abs(a - floors) ? b : a);
  const countOptions = TOREC_VARIANT_OPTIONS[bestFloors];
  const bestCount = countOptions.reduce((a, b) => Math.abs(b - count) < Math.abs(a - count) ? b : a);
  return { count: bestCount, floors: bestFloors, exact: bestCount === count && bestFloors === floors };
}

// Отражает набор готовых схем в frontend/public/js/ii1/diagrams/bok.js
// (BOK_VARIANTS) - используется здесь ТОЛЬКО для текста предупреждения, тот
// же принцип, что и у TOREC_VARIANT_OPTIONS выше.
const BOK_VARIANT_OPTIONS = { 1: [2, 3] };
function nearestBokVariant(count, floors) {
  const floorsAvailable = Object.keys(BOK_VARIANT_OPTIONS).map(Number);
  const bestFloors = floorsAvailable.includes(floors) ? floors
    : floorsAvailable.reduce((a, b) => Math.abs(b - floors) < Math.abs(a - floors) ? b : a);
  const countOptions = BOK_VARIANT_OPTIONS[bestFloors];
  const bestCount = countOptions.reduce((a, b) => Math.abs(b - count) < Math.abs(a - count) ? b : a);
  return { count: bestCount, floors: bestFloors, exact: bestCount === count && bestFloors === floors };
}

module.exports = { computeGost10198II1 };
