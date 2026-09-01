// ГОСТ 10198-91, тип I-1: чистый расчёт - серверный порт computeGost10198I1()
// из src/i1/calc.js исходного репозитория pakhiton79-bit/GOST_10198-91 (см.
// вводный комментарий в ../i3/compute.js о характере отличий порта: только
// избавление от модульного глобального состояния toлщин "в наличии", методика
// расчёта не менялась).
const { roundup, vol, fillBoards, makeRoundUpToAvailable, findNegativeField } = require('../helpers');
const { packingDensity, wallThicknessI1, stepDownGrade, plankCount } = require('./logic');

// input: {L,W,H,MASS,skidEnabled,skidThicknessRaw,roundBoardWidths,availableThicknesses,manualOverrides}.
function computeGost10198I1(input) {
  const { L, W, H, MASS, skidEnabled, skidThicknessRaw, roundBoardWidths } = input;
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
  // изменений методики). У типа I-1 всего один общий параметр - wall.value
  // (толщина всех досок/планок/раскосов), поэтому здесь только одна точка
  // применения (см. ниже, сразу после wall.value).
  const belowGost = {};
  function ov(key, gostValue, label) {
    const v = mo[key];
    if (v === undefined || v === null || Number.isNaN(v) || v <= 0) return gostValue;
    if (v < gostValue) {
      belowGost[key] = { value: v, gostValue, label };
    } else {
      delete belowGost[key];
    }
    return v;
  }
  if (MASS < 200) {
    warnings.push('Масса груза менее 200 кг.');
  }
  if (MASS > 1000) {
    warnings.push('Масса груза более 1000 кг — вне документированного диапазона типа I-1 (200-1000 кг).');
  }

  const density = packingDensity(MASS, L, W, H);
  let wallRaw = wallThicknessI1(density);

  const raskosinaNeeded = H >= 1000 || L > 5000 || density > 3;

  const horizPlankaLen = W - 200;
  if (horizPlankaLen < 0) {
    return { error: `Ширина груза ${W} мм недостаточна для двух вертикальных планок торца (по 100мм) — расчёт не выполняется.` };
  }

  let kLen, plank, plankQty, plankGap;
  for (let i = 0; i < 4; i++) {
    kLen = L + wallRaw * 4;

    plank = plankCount(kLen);
    if (plank.count === null) {
      return { error: `Длина доски ${Math.round(kLen)} мм недостаточна для отступа планок (по 1/6 с каждого края) — расчёт не выполняется.` };
    }
    plankQty = plank.count;
    plankGap = plank.middle / (plankQty - 1);

    const beltGaps = [plankGap, horizPlankaLen, H - 200];
    const beltGapHit = beltGaps.find(g => g >= 400 && g <= 500);
    if (beltGapHit === undefined) break;
    const stepped = stepDownGrade(wallRaw);
    if (stepped === wallRaw) break;
    warnings.push(`Расстояние между планками ${Math.round(beltGapHit)} мм (400-500мм) — толщина досок/планок/раскосов снижена на одну градацию (${wallRaw}→${stepped} мм).`);
    wallRaw = stepped;
  }
  const wall = { value: ov('wallValue', roundUpToAvailable(wallRaw), 'Толщина досок/планок/раскосов') };

  // kLen/plank/plankQty/plankGap выше посчитаны по wallRaw (толщине ДО
  // округления "в наличии") - пересчитываем под итоговую wall.value, чтобы
  // геометрия (длина досок дна/крышки/бока, число и шаг планок - используются
  // и в спецификации деталей, и в параметрах чертежей) точно соответствовала
  // финальной толщине материала, а не промежуточному расчётному значению по
  // ГОСТ. Сам подбор толщины (цикл выше, снижение градации по правилу
  // 400-500мм) не перезапускаем - решение о толщине уже принято по расчётным
  // (не округлённым) зазорам, здесь только синхронизируем геометрию с
  // итоговым материалом.
  kLen = L + wall.value * 4;
  plank = plankCount(kLen);
  if (plank.count === null) {
    return { error: `Длина доски ${Math.round(kLen)} мм недостаточна для отступа планок (по 1/6 с каждого края) — расчёт не выполняется.` };
  }
  plankQty = plank.count;
  plankGap = plank.middle / (plankQty - 1);

  // --- ДНО ---
  const dno = [];
  let dnoWidth;
  if (skidEnabled) {
    // Толщина полоза (t9) - исключение из правила "в наличии" (по уточнению
    // пользователя): берётся как есть, без округления вверх и без
    // предупреждения о превышении - в отличие от всех остальных деталей.
    const t9 = Math.max(skidThicknessRaw, 50);
    if (skidThicknessRaw < 50) {
      warnings.push(`Выбранная толщина полоза ${skidThicknessRaw} мм менее 50 мм — принято 50 мм.`);
    }
    const w9 = 100;
    const k9 = W + wall.value * 2;
    dno.push({ name: 'Полоз', t: t9, w: w9, l: k9, qty: plankQty });
    dnoWidth = k9;
  } else {
    const kPlanka = W + wall.value * 4;
    dno.push({ name: 'Планка', t: wall.value, w: 100, l: kPlanka, qty: plankQty });
    dnoWidth = kPlanka;
  }
  const spanDno = W + wall.value * 2;
  const fbDno = fillBoards(spanDno, roundBoardWidths);
  const w12 = 100, l12 = fbDno.mainQty;
  if (l12 > 0) dno.push({ name: 'Доска дна', t: wall.value, w: w12, l: kLen, qty: l12, overrideKey: 'wallValue' });
  fbDno.extra.forEach((e, i) => {
    dno.push({ name: 'Доска дна (дополнительная) ' + (i + 1), t: wall.value, w: e.width, l: kLen, qty: e.qty });
  });

  // --- КРЫШКА ---
  const kryshka = [];
  const kPlankaKryshka = W + wall.value * 2;
  kryshka.push({ name: 'Планка', t: wall.value, w: 100, l: kPlankaKryshka, qty: plankQty });
  const spanKryshka = W + wall.value * 2;
  const fbKryshka = fillBoards(spanKryshka, roundBoardWidths);
  const w20 = 100, l20 = fbKryshka.mainQty;
  if (l20 > 0) kryshka.push({ name: 'Доска крышки', t: wall.value, w: w20, l: kLen, qty: l20 });
  fbKryshka.extra.forEach((e, i) => {
    kryshka.push({ name: 'Доска крышки (дополнительная) ' + (i + 1), t: wall.value, w: e.width, l: kLen, qty: e.qty });
  });

  // --- БОКОВОЙ ЩИТ (расчёт на 1 щит, далее удвоение) ---
  const bokovoy = [];
  const kPlankaBok = H + wall.value * 4;
  bokovoy.push({ name: 'Планка', t: wall.value, w: 100, l: kPlankaBok, qty: plankQty });
  const fbBok = fillBoards(H, roundBoardWidths);
  const w41 = 100, l41 = fbBok.mainQty;
  if (l41 > 0) bokovoy.push({ name: 'Доска бокового щита', t: wall.value, w: w41, l: kLen, qty: l41 });
  fbBok.extra.forEach((e, i) => {
    bokovoy.push({ name: 'Доска бокового щита (дополнительная) ' + (i + 1), t: wall.value, w: e.width, l: kLen, qty: e.qty });
  });

  // --- ТОРЕЦ (расчёт на 1 щит, далее удвоение) ---
  const torec = [];
  torec.push({ name: 'Вертикальная планка', t: wall.value, w: 100, l: H, qty: 2 });
  torec.push({ name: 'Горизонтальная планка', t: wall.value, w: 100, l: horizPlankaLen, qty: 2 });
  const fbTorec = fillBoards(H, roundBoardWidths);
  const w31 = 100, l31 = fbTorec.mainQty;
  if (l31 > 0) torec.push({ name: 'Доска торцевого щита', t: wall.value, w: w31, l: W, qty: l31 });
  fbTorec.extra.forEach((e, i) => {
    torec.push({ name: 'Доска торцевого щита (дополнительная) ' + (i + 1), t: wall.value, w: e.width, l: W, qty: e.qty });
  });

  // --- Раскосина (укосина) ---
  if (raskosinaNeeded) {
    const torecLegH = H - 200;
    const torecLegW = horizPlankaLen - 200;
    if (torecLegH <= 0 || torecLegW <= 0) {
      return { error: `Недостаточно места для раскосины торца (катеты должны быть >0, получено ${Math.round(torecLegH)}×${Math.round(torecLegW)} мм) — расчёт не выполняется.` };
    }
    const torecRaskosinaLen = Math.sqrt(torecLegH * torecLegH + torecLegW * torecLegW);
    torec.push({ name: 'Раскосина', t: wall.value, w: 100, l: torecRaskosinaLen, qty: 1 });

    const raskosinaQty = plankQty - 1;
    if (raskosinaQty > 0) {
      const bokRaskosinaLen = Math.sqrt(H * H + plankGap * plankGap);
      bokovoy.push({ name: 'Раскосина', t: wall.value, w: 100, l: bokRaskosinaLen, qty: raskosinaQty });

      const kryshkaRaskosinaLen = Math.sqrt(kPlankaKryshka * kPlankaKryshka + plankGap * plankGap);
      kryshka.push({ name: 'Раскосина', t: wall.value, w: 100, l: kryshkaRaskosinaLen, qty: raskosinaQty });

      const dnoLegW = W + wall.value * 2;
      const dnoRaskosinaLen = Math.sqrt(dnoLegW * dnoLegW + plankGap * plankGap);
      dno.push({ name: 'Раскосина', t: wall.value, w: 100, l: dnoRaskosinaLen, qty: raskosinaQty });
    }
  }

  // --- Наружные размеры ---
  // Формула по уточнению пользователя (тот же фикс, что и в src/i1/calc.js
  // исходного репозитория pakhiton79-bit/GOST_10198-91), проверена на
  // контрольном примере (груз 1000×1000×1000, толщина 25мм в наличии →
  // наружные 1100×1100×1100): высота = опора снизу (полоз либо планка) +
  // доска дна + высота груза + доска крышки + планка крышки; длина =
  // (толщина вертикальной планки торца + толщина доски торца)×2 + длина
  // груза; ширина = (толщина планки бока + толщина доски бока)×2 + ширина
  // груза. При полозе в опоре снизу - та же (неокруглённая) толщина, что и
  // t9 выше; при планке - wall.value (планка правилу "в наличии" подчиняется
  // как обычно). Остальные толщины в этих формулах у типа I-1 все общие
  // (wall.value).
  const bottomSupport = skidEnabled ? Math.max(skidThicknessRaw, 50) : wall.value;
  const outerH = bottomSupport + wall.value * 3 + H;
  const outerW = W + wall.value * 4;
  const outerL = L + wall.value * 4;

  // --- Итоговый расход пиломатериала ---
  const volDno = dno.reduce((s, r) => s + vol(r.t, r.w, r.l, r.qty), 0);
  const volKryshka = kryshka.reduce((s, r) => s + vol(r.t, r.w, r.l, r.qty), 0);
  const volBok = bokovoy.reduce((s, r) => s + vol(r.t, r.w, r.l, r.qty), 0);
  const volTorec = torec.reduce((s, r) => s + vol(r.t, r.w, r.l, r.qty), 0);
  const totalVolume = volDno + volKryshka + 2 * volBok + 2 * volTorec;
  const normaVremeni = roundup(totalVolume * 800 / 60 * 1.2, 1);

  if (plankQty > 4) {
    warnings.push(`Число планок (${plankQty}) больше максимального доступного на чертежах дна/крышки/бока (4) — показаны чертежи с 4 планками.`);
  }

  if (roundUpToAvailable.state.exceeded) {
    warnings.push(`Расчётная толщина хотя бы одной детали превышает максимальную из «в наличии» (${availableThicknesses[availableThicknesses.length - 1]} мм) — занижать толщину недопустимо, использовано расчётное значение по ГОСТ (потребуется пиломатериал большей толщины, чем отмечено «в наличии»).`);
  }

  Object.values(belowGost).forEach(b => {
    warnings.push(`${b.label}: введено вручную ${b.value} мм — меньше расчётного по ГОСТ (${Math.round(b.gostValue * 100) / 100} мм). Использовано введённое значение.`);
  });

  const result = {
    warnings, dno, kryshka, bokovoy, torec,
    outerL, outerW, outerH, totalVolume, normaVremeni,
    dnoWidth, kLen, plank, plankQty, raskosinaNeeded, kPlankaKryshka, H, W, wall,
  };
  const negField = findNegativeField(result, '');
  if (negField) {
    return { error: `Расчёт дал отрицательное значение (${negField}) — результат недостоверен, проверьте входные данные.` };
  }
  return result;
}

module.exports = { computeGost10198I1 };
