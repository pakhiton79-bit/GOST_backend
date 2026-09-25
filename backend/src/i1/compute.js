// ГОСТ 10198-91, тип I-1: чистый расчёт - серверный порт computeGost10198I1()
// из src/i1/calc.js исходного репозитория pakhiton79-bit/GOST_10198-91 (см.
// вводный комментарий в ../i3/compute.js о характере отличий порта: только
// избавление от модульного глобального состояния toлщин "в наличии", методика
// расчёта не менялась).
const { roundup, vol, fillBoards, makeRoundUpToAvailable, findNegativeField, computeNormaVremeni } = require('../helpers');
const { packingDensity, wallThicknessI1, stepDownGrade, plankCount } = require('./logic');

// Плотность древесины для перевода объёма пиломатериала (м³) в массу
// ящика (кг) - по уточнению пользователя, типовое значение для сухой
// сосны/ели.
const WOOD_DENSITY_KG_M3 = 500;

// input: {L,W,H,MASS,skidEnabled,skidThicknessRaw,roundBoardWidths,removeLidBottomRaskosina,addRaskosina,xRaskosina,plankLayoutMode,plankLayoutValue,availableThicknesses,manualOverrides,baseProductivity,timeCoeff}.
function computeGost10198I1(input) {
  const { L, W, H, MASS, skidEnabled, skidThicknessRaw, roundBoardWidths, removeLidBottomRaskosina, addRaskosina, xRaskosina, addEndTape, plankLayoutMode, plankLayoutValue, baseProductivity, timeCoeff } = input;
  const availableThicknesses = input.availableThicknesses || [];
  const roundUpToAvailable = makeRoundUpToAvailable(availableThicknesses);
  const mo = input.manualOverrides || {};

  if (!L || !W || !H || !MASS || L <= 0 || W <= 0 || H <= 0 || MASS <= 0) {
    return { error: 'Заполните все поля положительными числами.' };
  }

  let warnings = [];

  // Ручной ввод толщины в таблице (клиент шлёт его в manualOverrides) -
  // подставляется вместо расчётного по ГОСТ значения везде, где оно дальше
  // используется (перенесено из src/i1/calc.js исходного репозитория без
  // изменений методики). У типа I-1 у каждой детали своя
  // толщина (ключи tDnoPlanka…tTorRask, см. T ниже; по ГОСТ все = wall.value)
  // плюс толщина полоза (ключ t9Value).
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
  if (MASS < 200) {
    warnings.push('Масса груза вне диапазона типа I-1 (200–1000 кг): менее 200 кг.');
  }
  if (MASS > 1000) {
    warnings.push('Масса груза вне диапазона типа I-1 (200–1000 кг): более 1000 кг.');
  }

  const density = packingDensity(MASS, L, W, H);

  // Галочка "Добавить раскосины" (addRaskosina, по запросу пользователя) -
  // добавляет раскосины на все детали независимо от условий ГОСТ ниже (ещё
  // один источник true в общем условии). Не конфликтует с
  // removeLidBottomRaskosina - см. kryshkaDnoHasRaskosina ниже.
  const raskosinaNeeded = addRaskosina || H >= 1000 || L > 5000 || density > 3;

  const horizPlankaLen = W - 200;
  if (horizPlankaLen < 0) {
    return { error: `Ширина груза ${W} мм недостаточна для двух вертикальных планок торца (по 100мм) — расчёт не выполняется.` };
  }

  // Текст ошибки "планки не помещаются": при ручном зазоре (он ставится
  // ровно, см. plankCount в logic.js) причина - сам зазор, пишем об этом
  // прямо, а не только про длину доски.
  function plankLayoutError(kLen, override) {
    if (override && override.mode === 'gap') {
      return `Расстояние между планками ${override.value} мм не помещается на доске ${Math.round(kLen)} мм (2 планки и отступы от края) — расчёт не выполняется.`;
    }
    return `Длина доски ${Math.round(kLen)} мм недостаточна для отступа планок — расчёт не выполняется.`;
  }

  // Раскладка поясов планок (plankCount) по умолчанию штатная - см. logic.js.
  // По галочкам "Настроить число поясов"/"Настроить расстояние между краями
  // поясов" (plankLayoutMode: 'count'|'gap', по запросу пользователя)
  // пользователь может задать своё значение - тогда отступ от края тоже
  // меняется (см. комментарий у plankCount в logic.js). Правило 400-500мм
  // работает как обычно в обоих случаях - переопределяется только САМА
  // раскладка (число/шаг), а не то, следим ли мы за попаданием зазора в
  // 400-500мм.
  function stabilizePlankLayout(override, wallStart) {
    let w = wallStart, kLen, plank, plankQty, plankGap;
    for (let i = 0; i < 4; i++) {
      kLen = L + w * 4;
      plank = plankCount(kLen, w * 4, override); // мин. отступ = (верт. планка торца + доска торца)*2
      if (plank.count === null) {
        return { error: plankLayoutError(kLen, override) };
      }
      plankQty = plank.count;
      plankGap = plank.middle / (plankQty - 1);
      const beltGaps = [plankGap, horizPlankaLen, H - 200];
      const beltGapHit = beltGaps.find(g => g >= 400 && g <= 500);
      if (beltGapHit === undefined) break;
      const stepped = stepDownGrade(w);
      if (stepped === w) break;
      // Снижение градации по правилу 400-500мм - штатное поведение,
      // предусмотренное самим ГОСТом (не отклонение/проблема) - предупреждение
      // не выводим (по указанию пользователя).
      w = stepped;
    }
    return { wallRaw: w, kLen, plank, plankQty, plankGap };
  }

  const plankOverride = (plankLayoutMode === 'count' || plankLayoutMode === 'gap')
    ? { mode: plankLayoutMode, value: plankLayoutValue }
    : null;

  // Стандартная (штатная, без ручных настроек) раскладка - считается всегда,
  // независимо от галочек, только чтобы показать "текущее стандартное
  // значение" в ползунках обеих новых галочек на клиенте.
  const standardPass = stabilizePlankLayout(null, wallThicknessI1(density));
  if (standardPass.error) return { error: standardPass.error };
  const standardWallValue = roundUpToAvailable(standardPass.wallRaw);
  const standardFinalPlank = plankCount(L + standardWallValue * 4, standardWallValue * 4, null);
  const standardPlankCount = standardFinalPlank.count;
  const standardPlankGap = standardFinalPlank.count > 1 ? standardFinalPlank.middle / (standardFinalPlank.count - 1) : 0;

  const mainPass = plankOverride ? stabilizePlankLayout(plankOverride, wallThicknessI1(density)) : standardPass;
  if (mainPass.error) return { error: mainPass.error };
  let { wallRaw, kLen, plank, plankQty, plankGap } = mainPass;

  const wall = { value: roundUpToAvailable(wallRaw) };

  // Толщины деталей по отдельности (по указанию пользователя): по ГОСТ все
  // они = wall.value (единая толщина досок/планок/раскосов типа I-1), но
  // ручная правка толщины в таблице меняет только свою деталь (доп. доски -
  // вместе с основной доской своего элемента, доп. раскосина - вместе с
  // основной раскосиной), а все формулы, где эта
  // толщина участвует (наружные размеры, длины других деталей, отступ
  // крайних планок), пересчитываются.
  const T = {
    dnoPlanka: ov('tDnoPlanka', wall.value, 'Толщина планки дна'),
    dnoBoard: ov('tDnoBoard', wall.value, 'Толщина доски дна'),
    dnoRask: ov('tDnoRask', wall.value, 'Толщина раскосины дна'),
    krPlanka: ov('tKrPlanka', wall.value, 'Толщина планки крышки'),
    krBoard: ov('tKrBoard', wall.value, 'Толщина доски крышки'),
    krRask: ov('tKrRask', wall.value, 'Толщина раскосины крышки'),
    bokPlanka: ov('tBokPlanka', wall.value, 'Толщина планки бокового щита'),
    bokBoard: ov('tBokBoard', wall.value, 'Толщина доски бокового щита'),
    bokRask: ov('tBokRask', wall.value, 'Толщина раскосины бокового щита'),
    torVert: ov('tTorVert', wall.value, 'Толщина вертикальной планки торца'),
    torHoriz: ov('tTorHoriz', wall.value, 'Толщина горизонтальной планки торца'),
    torBoard: ov('tTorBoard', wall.value, 'Толщина доски торцевого щита'),
    torRask: ov('tTorRask', wall.value, 'Толщина раскосины торца'),
  };

  // kLen/plank/plankQty/plankGap выше посчитаны по wallRaw (толщине ДО
  // округления "в наличии") - пересчитываем под итоговую wall.value, чтобы
  // геометрия (длина досок дна/крышки/бока, число и шаг планок - используются
  // и в спецификации деталей, и в параметрах чертежей) точно соответствовала
  // финальной толщине материала, а не промежуточному расчётному значению по
  // ГОСТ. Сам подбор толщины (цикл выше, снижение градации по правилу
  // 400-500мм) не перезапускаем - решение о толщине уже принято по расчётным
  // (не округлённым) зазорам, здесь только синхронизируем геометрию с
  // итоговым материалом.
  kLen = L + (T.torVert + T.torBoard) * 2; // длина груза + (верт. планка торца + доска торца)*2
  plank = plankCount(kLen, (T.torVert + T.torBoard) * 2, plankOverride); // мин. отступ = (верт. планка торца + доска торца)*2
  if (plank.count === null) {
    return { error: plankLayoutError(kLen, plankOverride) };
  }
  plankQty = plank.count;
  plankGap = plank.middle / (plankQty - 1);

  // --- ДНО ---
  const dno = [];
  let dnoWidth;
  let skidT = null;
  if (skidEnabled) {
    // Толщина полоза (t9) - исключение из правила "в наличии" (по уточнению
    // пользователя): берётся как есть, без округления вверх и без
    // предупреждения о превышении - в отличие от всех остальных деталей.
    // Ручная правка толщины полоза в таблице (ключ t9Value) заменяет
    // выбранное значение целиком - и в строке «Полоз», и в наружной высоте.
    const t9 = ov('t9Value', Math.max(skidThicknessRaw, 50), 'Толщина полоза');
    skidT = t9;
    if (skidThicknessRaw < 50 && !(mo.t9Value > 0)) {
      warnings.push(`Толщина полоза ${skidThicknessRaw} мм менее 50 — принято 50 мм.`);
    }
    const w9 = 100;
    const k9 = W + T.bokBoard * 2; // ширина груза + толщина доски бокового щита*2
    dno.push({ name: 'Полоз', t: t9, w: w9, l: k9, qty: plankQty, overrideKey: 't9Value' });
    dnoWidth = k9;
  } else {
    const kPlanka = W + (T.bokBoard + T.bokPlanka) * 2; // ширина груза + (толщина доски бок.щита + толщина планки бок.щита)*2
    dno.push({ name: 'Планка', t: T.dnoPlanka, w: 100, l: kPlanka, qty: plankQty, overrideKey: 'tDnoPlanka' });
    dnoWidth = kPlanka;
  }
  const spanDno = W + T.bokBoard * 2; // ширина груза + толщина доски бок.щита*2 (как у крышки)
  const fbDno = fillBoards(spanDno, roundBoardWidths);
  const w12 = 100, l12 = fbDno.mainQty;
  if (l12 > 0) dno.push({ name: 'Доска дна', t: T.dnoBoard, w: w12, l: kLen, qty: l12, overrideKey: 'tDnoBoard' });
  fbDno.extra.forEach((e, i) => {
    const suffix = fbDno.extra.length > 1 ? ' ' + (i + 1) : '';
    dno.push({ name: 'Доска дна (дополнительная)' + suffix, t: T.dnoBoard, w: e.width, l: kLen, qty: e.qty, overrideKey: 'tDnoBoard' });
  });

  // --- КРЫШКА ---
  const kryshka = [];
  const kPlankaKryshka = W + (T.bokBoard + T.bokPlanka) * 2; // ширина груза + (толщина доски бок.щита + толщина планки бок.щита)*2
  kryshka.push({ name: 'Планка', t: T.krPlanka, w: 100, l: kPlankaKryshka, qty: plankQty, overrideKey: 'tKrPlanka' });
  const spanKryshka = W + T.bokBoard * 2; // ширина груза + толщина доски бок.щита*2
  const fbKryshka = fillBoards(spanKryshka, roundBoardWidths);
  const w20 = 100, l20 = fbKryshka.mainQty;
  if (l20 > 0) kryshka.push({ name: 'Доска крышки', t: T.krBoard, w: w20, l: kLen, qty: l20, overrideKey: 'tKrBoard' });
  fbKryshka.extra.forEach((e, i) => {
    const suffix = fbKryshka.extra.length > 1 ? ' ' + (i + 1) : '';
    kryshka.push({ name: 'Доска крышки (дополнительная)' + suffix, t: T.krBoard, w: e.width, l: kLen, qty: e.qty, overrideKey: 'tKrBoard' });
  });

  // --- БОКОВОЙ ЩИТ (расчёт на 1 щит, далее удвоение) ---
  const bokovoy = [];
  const kPlankaBok = H + T.krBoard + T.dnoBoard + T.krPlanka + (skidEnabled ? skidT : T.dnoPlanka); // высота груза + доска крышки + доска дна + планка крышки + (полоз либо планка дна)
  bokovoy.push({ name: 'Планка', t: T.bokPlanka, w: 100, l: kPlankaBok, qty: plankQty, overrideKey: 'tBokPlanka' });
  const fbBok = fillBoards(H, roundBoardWidths);
  const w41 = 100, l41 = fbBok.mainQty;
  if (l41 > 0) bokovoy.push({ name: 'Доска бокового щита', t: T.bokBoard, w: w41, l: kLen, qty: l41, overrideKey: 'tBokBoard' });
  fbBok.extra.forEach((e, i) => {
    const suffix = fbBok.extra.length > 1 ? ' ' + (i + 1) : '';
    bokovoy.push({ name: 'Доска бокового щита (дополнительная)' + suffix, t: T.bokBoard, w: e.width, l: kLen, qty: e.qty, overrideKey: 'tBokBoard' });
  });

  // --- ТОРЕЦ (расчёт на 1 щит, далее удвоение) ---
  const torec = [];
  torec.push({ name: 'Вертикальная планка', t: T.torVert, w: 100, l: H, qty: 2, overrideKey: 'tTorVert' });
  torec.push({ name: 'Горизонтальная планка', t: T.torHoriz, w: 100, l: horizPlankaLen, qty: 2, overrideKey: 'tTorHoriz' });
  const fbTorec = fillBoards(H, roundBoardWidths);
  const w31 = 100, l31 = fbTorec.mainQty;
  if (l31 > 0) torec.push({ name: 'Доска торцевого щита', t: T.torBoard, w: w31, l: W, qty: l31, overrideKey: 'tTorBoard' });
  fbTorec.extra.forEach((e, i) => {
    const suffix = fbTorec.extra.length > 1 ? ' ' + (i + 1) : '';
    torec.push({ name: 'Доска торцевого щита (дополнительная)' + suffix, t: T.torBoard, w: e.width, l: W, qty: e.qty, overrideKey: 'tTorBoard' });
  });

  // --- Раскосина (укосина) ---
  // X-образные раскосины (галочка xRaskosina): к каждой обычной раскосине
  // добавляется встречная из двух кусков, упирающихся в неё - кусков вдвое
  // больше, длина каждого = (длина обычной раскосины - её ширина)/2.
  const RASKOSINA_W = 100;
  function pushXRaskosina(arr, len, qty, t, key) {
    if (!xRaskosina) return;
    arr.push({ name: 'Раскосина (дополнительная)', t: t, w: RASKOSINA_W, l: (len - RASKOSINA_W) / 2, qty: qty * 2, overrideKey: key });
  }
  if (raskosinaNeeded) {
    const torecLegH = H - 200;
    const torecLegW = horizPlankaLen - 200;
    if (torecLegH <= 0 || torecLegW <= 0) {
      return { error: `Недостаточно места для раскосины торца (катеты должны быть >0, получено ${Math.round(torecLegH)}×${Math.round(torecLegW)} мм) — расчёт не выполняется.` };
    }
    const torecRaskosinaLen = Math.sqrt(torecLegH * torecLegH + torecLegW * torecLegW);
    torec.push({ name: 'Раскосина', t: T.torRask, w: RASKOSINA_W, l: torecRaskosinaLen, qty: 1, overrideKey: 'tTorRask' });
    pushXRaskosina(torec, torecRaskosinaLen, 1, T.torRask, 'tTorRask');

    // Раскосины крышки и дна можно убрать отдельной галочкой
    // (removeLidBottomRaskosina) - раскосины торца и бокового щита эта
    // галочка не затрагивает.
    const raskosinaQty = plankQty - 1;
    if (raskosinaQty > 0) {
      const bokRaskosinaLen = Math.sqrt(H * H + plankGap * plankGap);
      bokovoy.push({ name: 'Раскосина', t: T.bokRask, w: RASKOSINA_W, l: bokRaskosinaLen, qty: raskosinaQty, overrideKey: 'tBokRask' });
      pushXRaskosina(bokovoy, bokRaskosinaLen, raskosinaQty, T.bokRask, 'tBokRask');

      if (!removeLidBottomRaskosina) {
        const kryshkaRaskosinaLen = Math.sqrt(kPlankaKryshka * kPlankaKryshka + plankGap * plankGap);
        kryshka.push({ name: 'Раскосина', t: T.krRask, w: RASKOSINA_W, l: kryshkaRaskosinaLen, qty: raskosinaQty, overrideKey: 'tKrRask' });
        pushXRaskosina(kryshka, kryshkaRaskosinaLen, raskosinaQty, T.krRask, 'tKrRask');

        const dnoLegW = W + T.bokBoard * 2; // ширина груза + толщина доски бок.щита*2 (как у крышки)
        const dnoRaskosinaLen = Math.sqrt(dnoLegW * dnoLegW + plankGap * plankGap);
        dno.push({ name: 'Раскосина', t: T.dnoRask, w: RASKOSINA_W, l: dnoRaskosinaLen, qty: raskosinaQty, overrideKey: 'tDnoRask' });
        pushXRaskosina(dno, dnoRaskosinaLen, raskosinaQty, T.dnoRask, 'tDnoRask');
      }
    }
  }
  // Флаг для чертежей крышки/дна - в отличие от raskosinaNeeded (общее
  // условие ГОСТа), учитывает ещё и галочку "Убрать раскосины крышки и
  // дна". Чертежи торца/бокового щита по-прежнему используют raskosinaNeeded.
  const kryshkaDnoHasRaskosina = raskosinaNeeded && !removeLidBottomRaskosina;

  // --- Наружные размеры ---
  // Формула по уточнению пользователя (тот же фикс, что и в src/i1/calc.js
  // исходного репозитория pakhiton79-bit/GOST_10198-91), проверена на
  // контрольном примере (груз 1000×1000×1000, толщина 25мм в наличии →
  // наружные 1100×1100×1100): высота = опора снизу (полоз либо планка) +
  // доска дна + высота груза + доска крышки + планка крышки; длина =
  // (толщина вертикальной планки торца + толщина доски торца)×2 + длина
  // груза; ширина = (толщина планки бока + толщина доски бока)×2 + ширина
  // груза. При полозе в опоре снизу - та же (неокруглённая) толщина, что и
  // t9 выше; при планке - толщина планки дна (планка правилу "в наличии"
  // подчиняется как обычно). Каждая толщина - своей детали (T выше).
  const bottomSupport = skidEnabled ? skidT : T.dnoPlanka;
  const outerH = bottomSupport + T.dnoBoard + H + T.krBoard + T.krPlanka;
  const outerW = W + (T.bokPlanka + T.bokBoard) * 2;
  const outerL = L + (T.torVert + T.torBoard) * 2;

  // --- Итоговый расход пиломатериала ---
  const volDno = dno.reduce((s, r) => s + vol(r.t, r.w, r.l, r.qty), 0);
  const volKryshka = kryshka.reduce((s, r) => s + vol(r.t, r.w, r.l, r.qty), 0);
  const volBok = bokovoy.reduce((s, r) => s + vol(r.t, r.w, r.l, r.qty), 0);
  const volTorec = torec.reduce((s, r) => s + vol(r.t, r.w, r.l, r.qty), 0);
  const totalVolume = volDno + volKryshka + 2 * volBok + 2 * volTorec;
  const normaVremeni = computeNormaVremeni(totalVolume, baseProductivity, timeCoeff);
  // Масса ящика (тары, без груза) - объём пиломатериала × плотность
  // древесины (по уточнению пользователя: 500 кг/м³, типовое значение для
  // сухой сосны/ели).
  const crateMass = totalVolume * WOOD_DENSITY_KG_M3;


  if (roundUpToAvailable.state.exceeded) {
    warnings.push(`Расчётная толщина детали больше максимальной «в наличии» (${availableThicknesses[availableThicknesses.length - 1]} мм) — использовано значение по ГОСТ (нужен пиломатериал большей толщины).`);
  }

  Object.values(belowGost).forEach(b => {
    warnings.push(`${b.label}: вручную указано ${b.value} мм (< расчётных ${Math.round(b.gostValue * 100) / 100} мм по ГОСТ) — использовано введённое значение.`);
  });

  if (overridesApplied > 0) {
    warnings.push('Использованы вручную введённые толщины, а не расчётные по ГОСТ — чертежи ниже могут их не точно отражать.');
  }

  // Лента обшивки торцов (галочка «Добавить ленту обшивки торцов», по
  // указанию пользователя): длина одной ленты = ((ширина груза + толщина
  // доски бока*2) + (высота груза + толщина доски крышки*2))*2; лент 2
  // (выводится "… мм × 2" под всеми элементами, см. calculate() в frontend/public/js/i1/calc-i1.js). В объём
  // пиломатериала, массу ящика и норму времени не входит - это не
  // пиломатериал. Толщины - доски бокового щита и доски крышки (T выше).
  // Строка отдельного раздела endTape (а не одно число) - чтобы на неё
  // распространялся общий механизм ручных правок таблицы (tableEdits,
  // withTableEdits в server.js с множителем раздела 0 - в объём не входит).
  const endTape = addEndTape ? [{ name: 'Обшивочная лента', l: Math.ceil(((W + T.bokBoard * 2) + (H + T.krBoard * 2)) * 2 - 1e-9), qty: 2 }] : [];

  const result = {
    warnings, dno, kryshka, bokovoy, torec,
    outerL, outerW, outerH, totalVolume, normaVremeni, crateMass,
    dnoWidth, kLen, plank, plankQty, plankGap, raskosinaNeeded, kryshkaDnoHasRaskosina, xRaskosina: !!xRaskosina, kPlankaKryshka, H, W, wall,
    // Толщина у выступающего угла первой планки на чертежах Дна/Крышки/Бока
    // (своя у каждого щита: у дна - полоз либо планка дна).
    drawPlankT: { dno: skidEnabled ? skidT : T.dnoPlanka, kryshka: T.krPlanka, bokovoy: T.bokPlanka },
    standardPlankCount, standardPlankGap, endTape,
  };
  const negField = findNegativeField(result, '');
  if (negField) {
    // negField - внутренний путь до поля, только для отладки в консоли -
    // пользователю техническое имя переменной не показываем.
    console.warn('Расчёт дал отрицательное значение:', negField);
    return { error: 'При таких размерах и массе груза получаются недопустимые (отрицательные) размеры деталей — рассчитать ящик нельзя. Проверьте введённые размеры и массу груза.' };
  }
  return result;
}

module.exports = { computeGost10198I1, WOOD_DENSITY_KG_M3 };
