// ГОСТ 10198-91, тип I-3: чистый расчёт - серверный порт computeGost10198I3()
// из src/app.js исходного (фронтенд-only) репозитория pakhiton79-bit/GOST_10198-91.
//
// Отличия от исходника (порт, не изменение методики расчёта):
//   - toлщина "в наличии" (availableThicknesses) и флаг thicknessLimitExceeded
//     были там модульными глобальными переменными (общими на весь процесс) -
//     здесь оба локальны на один вызов (closure через makeRoundUpToAvailable),
//     что и требуется для сервера, обслуживающего параллельные запросы разных
//     пользователей одновременно.
//   - variant ("skid" | "floor_boards") явно передаётся параметром вместо двух
//     раздельных файлов app.js, собираемых build.py из шаблона с плейсхолдером
//     /*__FLOOR_BOARD_CALC__*/ (см. src/variants/floor_board_new.js и
//     src/variants/floor_board_table4.js в исходном репозитории) - сама логика
//     обеих веток перенесена без изменений.
//   - удалён мёртвый код: в исходном computeGost10198I3 был короткий фрагмент,
//     обращавшийся к DOM (document.getElementById(...)), оставшийся от более
//     ранней недоделанной версии разделения "расчёт/рендер" - его результат
//     нигде не использовался (calculate() в src/app.js делает то же самое ещё
//     раз, уже пользуясь этим), поэтому в чистый расчёт он не входит.
const { roundup, ceilInt, vol, fillBoards, makeRoundUpToAvailable, findNegativeField } = require('../helpers');
const {
  subfloorThicknessRaw, wallThickness, polozSection165, selectSkid19, minSkidsByWidth162,
  endBeamSection, floorBoardThicknessNew, floorBoardThickness,
  T4_LOADS, T4_DISTANCES, crossBeamThickness,
} = require('./tables');

// input: {variant, L,W,H,MASS,optimizeSizes,removeFloorBoards,removeSkidBoards,
//         roundBoardWidths,solidRigidBase,forkliftLoading,availableThicknesses}.
// variant: 'skid' (крепление за полозья, GOST10198_91POLOZIA) или
//          'floor_boards' (крепление к доскам дна, GOST10198_91DOSKI_DNA).
function computeGost10198I3(input) {
  const {
    variant, L, W, H, MASS, optimizeSizes, removeFloorBoards, removeSkidBoards,
    roundBoardWidths, solidRigidBase, forkliftLoading,
  } = input;
  const availableThicknesses = input.availableThicknesses || [];

  const roundUpToAvailable = makeRoundUpToAvailable(availableThicknesses);

  if (!L || !W || !H || !MASS || L <= 0 || W <= 0 || H <= 0 || MASS <= 0) {
    return { error: 'Заполните все поля положительными числами.' };
  }

  let warnings = [];
  if (L <= 1200 || W <= 800) {
    // По уточнению пользователя расчёт больше не блокируется здесь - только
    // предупреждение: при таких габаритах формально применяется ГОСТ 21140,
    // а не 10198-91, результат нужно проверить с его учётом (тот же фикс,
    // что и в src/app.js исходного репозитория).
    warnings.push(`Габариты ${L}×${W} мм ≤ 1200×800 — формально действует ГОСТ 21140. Расчёт по ГОСТ 10198-91 продолжен, но результат нужно сверить с ГОСТ 21140.`);
  }

  // Ручной ввод толщины в таблице (см. computeGost10198I1/ov() для того же
  // приёма) - подставляется вместо расчётного по ГОСТ значения. У wall.value/
  // t12 (доска дна)/t21 (внутр. поперечный брус крышки)/t10 (подполозная
  // доска) override каскадно применяется везде, где значение дальше
  // используется - у t9 (полоз)/t11 (торцовый брус дна) НЕТ каскада (оба
  // сечения выбираются из таблицы ГОСТа парой толщина+ширина сразу, override
  // только толщины без пересчёта ширины нарушил бы табличную связку) -
  // override меняет ТОЛЬКО отображаемое число в этой одной ячейке (см.
  // t9Display/t11Display ниже), не толщину, которая участвует в остальных
  // формулах (расход пиломатериала, наружные размеры и т.п. считаются по
  // чистому расчётному t9/t11, как если бы override не было).
  const belowGost = {};
  let overridesApplied = 0;
  const mo = input.manualOverrides || {};
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

  const wallRaw = wallThickness(MASS); // п.1.6.15
  const wall = { value: ov('wallValue', roundUpToAvailable(wallRaw.value), 'Толщина досок/планок/раскосов'), exceeded: wallRaw.exceeded };
  if (MASS > 3000) {
    warnings.push('Масса груза вне диапазона типа I-3 (Табл. 1, ≤3000 кг) — расчёт продолжен по крайнему значению.');
  }
  if (wall.exceeded) {
    warnings.push('Масса вне диапазона п.1.6.15 — толщина стенок принята по крайнему значению (25 мм).');
  }

  // --- ДНО ---
  const dno = [];
  const skidCalcWidth = W + wall.value * 2;

  const t_doska_torca = wall.value, t_planka_torca = wall.value;
  const k9Base = L + (t_planka_torca + t_doska_torca) * 2;

  let l9, t9, w9;
  if (solidRigidBase) {
    const l9_default = (W > 1100) ? 3 : 2;
    l9 = l9_default;
    const poloz = polozSection165(MASS); // п.1.6.5
    if (poloz.exceeded) {
      warnings.push('Масса вне диапазона п.1.6.5 (500–20000 кг) — сечение полоза принято по крайнему значению.');
    }
    const minNeeded165 = minSkidsByWidth162(skidCalcWidth, poloz.w);
    if (l9_default < minNeeded165) {
      l9 = minNeeded165;
    }
    // Толщина полоза (t9) - исключение из правила "в наличии" (по уточнению
    // пользователя): полоз всегда берётся точным расчётным значением по
    // ГОСТ, без округления вверх до ближайшего доступного номинала и без
    // предупреждения о превышении - в отличие от всех остальных деталей.
    t9 = poloz.h; w9 = poloz.w;
  } else {
    const sel = selectSkid19(MASS, k9Base, skidCalcWidth, availableThicknesses);
    // t9 - тот же принцип исключения, что и в ветке solidRigidBase выше.
    l9 = sel.count; t9 = sel.h; w9 = sel.w;
    if (sel.massSnapped) {
      warnings.push(`Масса ${MASS} кг вне Табл. 19 — принята ближайшая (${sel.massUsed} кг).`);
    }
    if (sel.lengthSnapped) {
      warnings.push(`Длина полоза ${Math.round(k9Base)} мм вне Табл. 19 — принята ближайшая (${sel.lengthUsed} мм).`);
    }
    if (sel.extrapolatedBeyondOne) {
      // По уточнению пользователя: достройка сверх таблицы разрешена
      // максимум на 1 полоз (тем же сечением, без понижения градации) - это
      // штатно и не требует предупреждения. Если для шага осей ≤1200мм
      // (п.1.6.2) не хватает даже +1 - добавляем ещё (тем же сечением), но
      // это уже отклонение от документированного правила, поэтому здесь
      // предупреждение.
      warnings.push(`Табл. 19: не хватает полозьев для шага осей ≤1200 мм (п.1.6.2) — добавлен ещё того же сечения (${sel.count} шт. итого).`);
    }
  }
  // t9Display - изолированный override (см. комментарий у ov() выше): t9 сам
  // по себе НЕ переопределяется и используется дальше (volDno, outerH)
  // расчётным по ГОСТ, override виден только в этой ячейке таблицы.
  const t9Display = ov('t9Value', t9, 'Толщина полоза');
  dno.push({ name: 'Полоз', t: t9Display, w: w9, l: k9Base, qty: l9, overrideKey: 't9Value' });

  const t10Raw = forkliftLoading ? Math.max(subfloorThicknessRaw(MASS), 50) : subfloorThicknessRaw(MASS);
  const t10 = ov('t10Value', roundUpToAvailable(t10Raw), 'Толщина подполозной доски'), w10 = Math.min(w9, 150), k10 = k9Base - 400, l10 = l9;
  if (k10 < 300) {
    warnings.push(`Длина подполозной доски ${Math.round(k10)} мм менее 300 мм.`);
  }
  const subfloorForkliftFail = forkliftLoading && k10 < 300;
  if (subfloorForkliftFail) {
    warnings.push(`Погрузка погрузчиком требует ≥300 мм у подполозной доски (сейчас ${Math.round(k10)} мм).`);
  }
  if (!removeSkidBoards) {
    dno.push({
      name: 'Подполозная доска',
      t: subfloorForkliftFail ? '⚠' : t10,
      w: subfloorForkliftFail ? '⚠' : w10,
      l: subfloorForkliftFail ? '⚠' : k10,
      qty: subfloorForkliftFail ? '⚠' : l10,
      overrideKey: subfloorForkliftFail ? undefined : 't10Value',
    });
  }

  const endBeam = endBeamSection(MASS); // п.1.6.8
  if (endBeam.exceeded) {
    warnings.push('Масса вне диапазона п.1.6.8 (≤5000 кг) — сечение торцового бруса дна принято по крайнему значению.');
  }
  const t11 = roundUpToAvailable(endBeam.h), w11 = endBeam.w, k11 = W, l11 = 2;
  // t11Display - тот же изолированный override, что и у t9Display выше: t11
  // сам по себе не используется дальше нигде, кроме этой строки.
  const t11Display = ov('t11Value', t11, 'Толщина торцового бруса дна');
  dno.push({ name: 'Торцовый брус дна', t: t11Display, w: w11, l: k11, qty: l11, overrideKey: 't11Value' });

  // Толщина доски дна - зависит от варианта комплектации (см. вводный комментарий).
  let t12, k12;
  if (variant === 'floor_boards') {
    // Крепление к доскам дна - Таблица 4 (п.1.6.9): по удельной нагрузке на дно
    // и фактическому расстоянию между осями смежных полозьев.
    const floorSkidDistance = l9 > 1 ? (skidCalcWidth - w9) / (l9 - 1) : skidCalcWidth;
    const floor = floorBoardThickness(MASS, L, W, floorSkidDistance); // Таблица 4
    if (floor.exceeded) {
      const loadExceeded = floor.udel > T4_LOADS[T4_LOADS.length - 1];
      const distExceeded = floorSkidDistance > T4_DISTANCES[T4_DISTANCES.length - 1];
      if (loadExceeded) {
        warnings.push(`Удельная нагрузка на дно ${floor.udel.toFixed(2)} кг/см² вне Табл. 4 — толщина доски дна принята по крайнему значению.`);
      }
      if (distExceeded) {
        warnings.push(`Шаг полозьев ${Math.round(floorSkidDistance)} мм вне Табл. 4 — толщина доски дна принята по крайнему значению.`);
      }
    }
    t12 = removeFloorBoards ? 0 : ov('t12Value', roundUpToAvailable(floor.value), 'Толщина доски дна'); k12 = W;
  } else {
    // Крепление за полозья ("новое правило", действует всегда, независимо от
    // галочки "сплошное жёсткое основание груза").
    t12 = removeFloorBoards ? 0 : ov('t12Value', roundUpToAvailable(floorBoardThicknessNew(MASS)), 'Толщина доски дна'); k12 = W;
  }

  const fbDno = fillBoards(L - w11 * 2, roundBoardWidths);
  const w12 = 100, l12 = fbDno.mainQty;
  if (!removeFloorBoards) {
    if (l12 > 0) dno.push({ name: 'Доска дна', t: t12, w: w12, l: k12, qty: l12, overrideKey: 't12Value' });
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
    + (removeFloorBoards ? 0 : (vol(t12, w12, k12, l12)
      + fbDno.extra.reduce((s, e) => s + vol(t12, e.width, k12, e.qty), 0)));

  // --- Наружные размеры ---
  const outerL = k9Base;
  const outerW = W + wall.value * 4;
  const outerH = (removeSkidBoards ? 0 : t10) + t9 + t12 + wall.value + wall.value + H;

  // --- КРЫШКА ---
  const kryshka = [];

  const t19 = wall.value, w19 = 100, k19 = W + wall.value * 2;
  const edgeDistKryshka = Math.min(k9Base / 6, 1000);
  const middleKryshka = k9Base - edgeDistKryshka * 2;
  let l19;
  if (middleKryshka < 0) {
    warnings.push(`Планка крышки: длины ${Math.round(k9Base)} мм не хватает на отступ — принят минимум (2 шт.).`);
    l19 = 2;
  } else {
    l19 = ceilInt(middleKryshka / 1000) + 1;
  }
  kryshka.push({ name: 'Планка', t: t19, w: w19, l: k19, qty: l19 });

  const bokSectionW = l19 > 1 ? middleKryshka / (l19 - 1) : 0;

  const t20 = wall.value, k20 = k9Base;
  const fbKryshka = fillBoards(W + wall.value * 2, roundBoardWidths);
  const w20 = 100, l20 = fbKryshka.mainQty;
  if (l20 > 0) kryshka.push({ name: 'Доска крышки', t: t20, w: w20, l: k20, qty: l20 });
  fbKryshka.extra.forEach((e, i) => {
    kryshka.push({ name: 'Доска крышки (дополнительная) ' + (i + 1), t: t20, w: e.width, l: k20, qty: e.qty });
  });
  if (fbKryshka.warn) {
    warnings.push('Доска крышки: остаток — нестандартная ширина (вне 75–99 мм).');
  }
  if (fbKryshka.singleNarrow) {
    warnings.push('Доска крышки: одна доска уже менее 100 мм.');
  }

  const crossBeam = crossBeamThickness(MASS, outerW); // Табл. 14
  if (crossBeam.exceeded) {
    warnings.push('Масса или ширина ящика вне Табл. 14 — брус крышки принят по крайнему значению.');
  }
  const t21 = ov('t21Value', roundUpToAvailable(crossBeam.value), 'Толщина внутреннего поперечного бруса крышки'), w21 = 100, k21 = W - (optimizeSizes ? 4 : 0), l21 = ceilInt(L / 800);
  kryshka.push({ name: 'Внутренний поперечный брус', t: t21, w: w21, l: k21, qty: l21, overrideKey: 't21Value' });

  const volKryshka = vol(t19, w19, k19, l19) + vol(t20, w20, k20, l20) + vol(t21, w21, k21, l21)
    + fbKryshka.extra.reduce((s, e) => s + vol(t20, e.width, k20, e.qty), 0);

  // --- ЩИТ ТОРЦЕВОЙ (расчёт на 1 щит, далее удвоение) ---
  // Число "этажей" щита торцевого/бокового считается по высоте ГРУЗА H (поле
  // «Высота»), а не по наружной высоте ящика outerH: до 2000мм включительно -
  // 1 этаж, свыше 2000мм - 2 этажа (средняя горизонтальная планка делит щит
  // пополам). Верхнего предела по высоте нет (искусственный потолок в
  // 4000мм убран по уточнению пользователя) - свыше 2000мм расчёт
  // продолжается по той же схеме 2 этажей, размеры деталей растут линейно
  // вместе с высотой.
  const torecFloors = H > 2000 ? 2 : 1;

  const t31 = wall.value, w31 = 100, k31_ = W, l31 = torecFloors === 2 ? 3 : 2;

  const t30 = wall.value, w30 = 100;
  const k30 = torecFloors === 2
    ? ((H + t12) - w31 * 3) / 2
    : (H + t12) - w31 * 2;

  function torecSectionWidth(sections) {
    return (W - w30 * (sections + 1)) / sections;
  }
  function torecAngleDeg(sections) {
    return Math.atan2(k30, torecSectionWidth(sections)) * 180 / Math.PI;
  }
  let torecSections = 1;
  if (H > 600 && W > 600) {
    while (torecAngleDeg(torecSections) < 20 && torecSectionWidth(torecSections + 1) > 0) {
      torecSections++;
    }
    if (torecAngleDeg(torecSections) < 20) {
      warnings.push(`Щит торцевой: угол раскосины <20° даже при максимуме секций (${torecSections}) — больше не добавить, не хватает места (по ${w30} мм на планку).`);
    }
  }
  const torecHasRaskosina = H > 600 && W > 600 && !(torecSections === 1 && torecAngleDeg(1) > 60);
  if (torecHasRaskosina && torecSections > 3) {
    warnings.push(`Щит торцевой: чертёж — макс. 3 секции (расчётных ${torecSections}, раскладка та же); точное количество см. в таблице ниже.`);
  }

  const l30 = (torecSections + 1) * torecFloors;

  const t33 = wall.value, w33 = 100;
  const torecSectionW = torecSectionWidth(torecSections);
  const k33 = Math.sqrt(Math.pow(torecSectionW, 2) + Math.pow(k30, 2));
  const l33 = torecHasRaskosina ? torecSections * torecFloors : 0;

  const t32 = wall.value, k32 = W;
  const fbTorec = fillBoards(H + t12, roundBoardWidths);
  const w32 = 100, l32 = fbTorec.mainQty;
  if (fbTorec.warn) {
    warnings.push('Доска торца: остаток — нестандартная ширина (вне 75–99 мм).');
  }
  if (fbTorec.singleNarrow) {
    warnings.push('Доска торца: одна доска уже менее 100 мм.');
  }

  const endPanel = [
    { name: 'Вертикальная планка', t: t30, w: w30, l: k30, qty: l30 },
    { name: 'Горизонтальная планка', t: t31, w: w31, l: k31_, qty: l31 },
  ];
  if (torecHasRaskosina) endPanel.push({ name: 'Раскосина', t: t33, w: w33, l: k33, qty: l33 });
  if (l32 > 0) endPanel.push({ name: 'Доска торца', t: t32, w: w32, l: k32, qty: l32 });
  fbTorec.extra.forEach((e, i) => {
    endPanel.push({ name: 'Доска торца (дополнительная) ' + (i + 1), t: t32, w: e.width, l: k32, qty: e.qty });
  });

  // --- ЩИТ БОКОВОЙ (расчёт на 1 щит, далее удвоение) ---
  // Порог >2000мм - та же высота ГРУЗА H, что и у torecFloors (не outerH),
  // ЛИБО, если угол укосины при 1 этаже вышел бы за 60° - боковой щит
  // переводится на 2 этажа именно из-за угла, даже если торец остаётся на 1-м.
  const bokHasRaskosina = H > 600 && l19 > 1;
  const bokAngle1FloorDeg = bokSectionW > 0 ? Math.atan2(H + t12, bokSectionW) * 180 / Math.PI : null;
  const bokFloors = (H > 2000 || (bokHasRaskosina && bokAngle1FloorDeg !== null && bokAngle1FloorDeg > 60)) ? 2 : 1;

  const t43 = wall.value, w43 = 100, k43 = k9Base, l43 = bokFloors === 2 ? 1 : 0;

  const t40 = wall.value, w40 = 100;
  const bokOverhang = Math.min(t9 * 2 / 3, 70);
  const bokPlankFull = H + t12 + bokOverhang;
  const k40 = bokFloors === 2 ? (bokPlankFull - w43) / 2 : bokPlankFull;
  const l40 = l19 * bokFloors;

  const t41 = wall.value, k41 = k9Base;
  const fbBok = fillBoards(H + t12, roundBoardWidths);
  const w41 = 100, l41 = fbBok.mainQty;
  if (fbBok.warn) {
    warnings.push('Доска бока: остаток — нестандартная ширина (вне 75–99 мм).');
  }
  if (fbBok.singleNarrow) {
    warnings.push('Доска бока: одна доска уже менее 100 мм.');
  }

  const t42 = wall.value, w42 = 100;
  const bokVertSpan = bokFloors === 2 ? ((H + t12) - w43) / 2 : H + t12;
  const k42 = Math.sqrt(Math.pow(bokSectionW, 2) + Math.pow(bokVertSpan, 2));
  const l42 = bokHasRaskosina ? (l19 - 1) * bokFloors : 0;

  if (bokHasRaskosina && bokSectionW > 0) {
    const bokAngleDeg = Math.atan2(bokVertSpan, bokSectionW) * 180 / Math.PI;
    if (bokAngleDeg < 20 || bokAngleDeg > 60) {
      warnings.push(`Угол раскосины бокового щита ${Math.round(bokAngleDeg)}° вне 20–60° — нужна консультация конструктора.`);
    }
  }

  const volBokPanel = vol(t40, w40, k40, l40) + vol(t41, w41, k41, l41)
    + fbBok.extra.reduce((s, e) => s + vol(t41, e.width, k41, e.qty), 0)
    + vol(t42, w42, k42, l42) + vol(t43, w43, k43, l43);

  const bokovoy = [
    { name: 'Вертикальная планка', t: t40, w: w40, l: k40, qty: l40 },
  ];
  if (l41 > 0) bokovoy.push({ name: 'Доска бока', t: t41, w: w41, l: k41, qty: l41, overrideKey: 'wallValue' });
  fbBok.extra.forEach((e, i) => {
    bokovoy.push({ name: 'Доска бока (дополнительная) ' + (i + 1), t: t41, w: e.width, l: k41, qty: e.qty });
  });
  if (l43 > 0) bokovoy.push({ name: 'Горизонтальная планка', t: t43, w: w43, l: k43, qty: l43 });
  if (bokHasRaskosina) bokovoy.push({ name: 'Раскосина', t: t42, w: w42, l: k42, qty: l42 });

  // --- Итоговый расход пиломатериала ---
  const totalVolume = volDno + volKryshka + 2 * volTorPanelOf(t30, w30, k30, l30, t31, w31, k31_, l31, t32, w32, k32, l32, fbTorec, t33, w33, k33, l33) + 2 * volBokPanel;
  const normaVremeni = roundup(totalVolume * 800 / 60 * 1.2, 1);

  const torecNoRaskosinaDiagram = !torecHasRaskosina && (H <= 600 || W > 600);
  const t40Display = optimizeSizes ? t40 + 2 : t40;

  if (torecFloors === 2 && !torecHasRaskosina) {
    warnings.push('Щит торцевой (2 этажа, без раскосины): чертёж приблизительный — показан чертёж одного этажа.');
  }

  if (roundUpToAvailable.state.exceeded) {
    warnings.push(`Расчётная толщина детали больше максимальной «в наличии» (${availableThicknesses[availableThicknesses.length - 1]} мм) — использовано значение по ГОСТ (нужен пиломатериал большей толщины).`);
  }

  Object.values(belowGost).forEach(b => {
    warnings.push(`${b.label}: вручную указано ${b.value} мм (< расчётных ${Math.round(b.gostValue * 100) / 100} мм по ГОСТ) — использовано введённое значение.`);
  });

  // Только на экране - warnings в печать не попадают вообще (фронтенд не
  // включает их в buildPrintHtml(), бэкенд-фронтенд наследует ту же вёрстку).
  if (overridesApplied > 0) {
    warnings.push('Использованы вручную введённые толщины, а не расчётные по ГОСТ — чертежи ниже могут их не точно отражать.');
  }

  const result = {
    warnings, dno, kryshka, endPanel, bokovoy,
    outerL, outerW, outerH, totalVolume, normaVremeni,
    k9Base, t41, t40, torecFrameThickness: t_doska_torca + t_planka_torca,
    W, L, t30, t32, t40Display, edgeDistKryshka, l21, w21, l19, bokSectionW,
    k32, torecSections, torecHasRaskosina, HplusT12: H + t12, torecNoRaskosinaDiagram, torecFloors, k30plusW31: k30 + w31,
    H, t12, k41, bokOverhang, l42, bokFloors, bokVertSpan, k40, w43,
  };
  const negField = findNegativeField(result, '');
  if (negField) {
    return { error: `Расчёт дал отрицательное значение (${negField}) — результат недостоверен, проверьте входные данные.` };
  }
  return result;
}

function volTorPanelOf(t30, w30, k30, l30, t31, w31, k31_, l31, t32, w32, k32, l32, fbTorec, t33, w33, k33, l33) {
  return vol(t30, w30, k30, l30) + vol(t31, w31, k31_, l31)
    + vol(t32, w32, k32, l32) + fbTorec.extra.reduce((s, e) => s + vol(t32, e.width, k32, e.qty), 0)
    + vol(t33, w33, k33, l33);
}

module.exports = { computeGost10198I3 };
