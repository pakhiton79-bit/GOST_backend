// ГОСТ 10198-91, тип I-1: расчёт ящика.
//
// Порядок расчёта:
//   1. проверка входных данных;
//   2. толщина по ГОСТ (по плотности упаковывания) с понижением на градацию,
//      если зазор между поясами планок попадает в 400-500 мм;
//   3. округление до толщины «в наличии» и ручные правки толщин из таблицы;
//   4. раскладка поясов планок под итоговые толщины;
//   5. детали узлов (дно, крышка, боковой и торцевой щиты, раскосины);
//   6. наружные размеры, объём, масса, норма времени, предупреждения.
const { vol, makeRoundUpToAvailable, findNegativeField, computeNormaVremeni } = require('../helpers');
const { packingDensity, wallThicknessI1, stepDownGrade } = require('./thickness');
const { plankLayout, requestedPlankCount, tooManyPlanksText } = require('./plank-layout');
const parts = require('./parts');

// Плотность древесины по умолчанию, кг/м³ (сухая сосна/ель); на клиенте
// настраивается шестерёнкой у «Массы ящика».
const WOOD_DENSITY_KG_M3 = 700;
const MIN_SKID_T = 50; // полоз тоньше 50 мм не берётся

// Ручные правки толщин из таблицы (manualOverrides): значение подставляется
// вместо расчётного по ГОСТ. Запоминает, сколько правок применено и какие из
// них меньше ГОСТ - для предупреждений.
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

// Толщины всех деталей. По ГОСТ все равны wall, но каждую можно поправить в
// таблице отдельно (доп. доски и раскосины - вместе с основной деталью).
function partThicknesses(ov, wall) {
  return {
    dnoPlanka: ov('tDnoPlanka', wall, 'Толщина планки дна'),
    dnoBoard: ov('tDnoBoard', wall, 'Толщина доски дна'),
    dnoRask: ov('tDnoRask', wall, 'Толщина раскосины дна'),
    krPlanka: ov('tKrPlanka', wall, 'Толщина планки крышки'),
    krBoard: ov('tKrBoard', wall, 'Толщина доски крышки'),
    krRask: ov('tKrRask', wall, 'Толщина раскосины крышки'),
    bokPlanka: ov('tBokPlanka', wall, 'Толщина планки бокового щита'),
    bokBoard: ov('tBokBoard', wall, 'Толщина доски бокового щита'),
    bokRask: ov('tBokRask', wall, 'Толщина раскосины бокового щита'),
    // Вертикальные и горизонтальные планки торца - одна толщина: правка
    // одной меняет и другую (по указанию пользователя).
    torPlanka: ov('tTorPlanka', wall, 'Толщина планок торца'),
    torBoard: ov('tTorBoard', wall, 'Толщина доски торцевого щита'),
    torRask: ov('tTorRask', wall, 'Толщина раскосины торца'),
  };
}

// Текст ошибки «планки не помещаются»: при ручном зазоре или числе поясов
// причина - сама настройка. Длина доски - с учётом выбранных толщин.
function plankLayoutError(kLen, override) {
  if (override && override.mode === 'count') {
    const n = requestedPlankCount(override.value);
    return `${tooManyPlanksText(n)} на доске ${Math.round(kLen)} мм${n > 2 ? ' - уменьшите число поясов' : ''}. Расчёт не выполняется.`;
  }
  if (override && override.mode === 'gap') {
    return `Расстояние между планками ${override.value} мм не помещается на доске ${Math.round(kLen)} мм (2 планки и отступы от края) - расчёт не выполняется.`;
  }
  return `Длина доски ${Math.round(kLen)} мм недостаточна для отступа планок - расчёт не выполняется.`;
}

// Раскладка поясов при толщине стенки w: длина доски = L + 4w (вертикальная
// планка и доска торца с двух сторон), минимальный отступ от края - 4w.
function layoutForWall(L, w, override) {
  const kLen = L + w * 4;
  const plank = plankLayout(kLen, w * 4, override);
  return { kLen, plank };
}

// Шаг 2: толщина по ГОСТ. Если расстояние между поясами планок попадает в
// 400-500 мм, толщина снижается на одну градацию (штатно по ГОСТ, без
// предупреждения) - только один раз (по указанию пользователя), и
// раскладка пересчитывается под неё. Планки не помещаются - { failedWall }
// (толщина, при которой не поместились).
function chooseWallThickness(L, override, wallStart) {
  const first = layoutForWall(L, wallStart, override).plank;
  if (first.count === null) return { failedWall: wallStart };
  const plankGap = first.middle / (first.count - 1);
  const w = (plankGap >= 400 && plankGap <= 500) ? stepDownGrade(wallStart) : wallStart;
  if (w !== wallStart && layoutForWall(L, w, override).plank.count === null) return { failedWall: w };
  return { wallRaw: w };
}

function sumVolume(rows) {
  return rows.reduce((s, r) => s + vol(r.t, r.w, r.l, r.qty), 0);
}

// input: { L, W, H, MASS, skidEnabled, skidThicknessRaw, roundBoardWidths,
//   removeLidBottomRaskosina, addRaskosina, xRaskosina, addEndTape,
//   addParchment, plankLayoutMode, plankLayoutValue, availableThicknesses,
//   manualOverrides, baseProductivity, timeCoeff, woodDensity }.
function computeGost10198I1(input) {
  const { L, W, H, MASS, skidEnabled, skidThicknessRaw, roundBoardWidths, removeLidBottomRaskosina, addRaskosina, xRaskosina, addEndTape, addParchment, plankLayoutMode, plankLayoutValue, baseProductivity, timeCoeff, woodDensity } = input;
  const availableThicknesses = input.availableThicknesses || [];
  const manualOverrides = input.manualOverrides || {};

  // --- 1. Входные данные ---
  if (!L || !W || !H || !MASS || L <= 0 || W <= 0 || H <= 0 || MASS <= 0) {
    return { error: 'Заполните все поля положительными числами.' };
  }
  const warnings = [];
  if (MASS < 200) warnings.push('Масса груза вне диапазона типа I-1 (200–1000 кг): менее 200 кг.');
  if (MASS > 1000) warnings.push('Масса груза вне диапазона типа I-1 (200–1000 кг): более 1000 кг.');

  const density = packingDensity(MASS, L, W, H);
  // Раскосины: по ГОСТ (высота от 1000, длина больше 5000, плотность больше
  // 3) либо по галочке «Добавить раскосины».
  const raskosinaNeeded = addRaskosina || H >= 1000 || L > 5000 || density > 3;

  const horizPlankaLen = W - 200; // между двумя вертикальными планками торца
  if (horizPlankaLen < 0) {
    return { error: `Ширина груза ${W} мм недостаточна для двух вертикальных планок торца (по 100мм) - расчёт не выполняется.` };
  }

  // --- 2. Толщина по ГОСТ ---
  const plankOverride = (plankLayoutMode === 'count' || plankLayoutMode === 'gap')
    ? { mode: plankLayoutMode, value: plankLayoutValue }
    : null;
  const roundUpToAvailable = makeRoundUpToAvailable(availableThicknesses);

  // Штатная раскладка считается всегда - её число поясов и зазор клиент
  // показывает центром ползунков ручной настройки.
  // Длина доски в тексте ошибки - с выбранными толщинами («в наличии» и
  // ручные толщины вертикальной планки и доски торца), как в таблице.
  const boardLenForError = w => {
    const t = key => (manualOverrides[key] > 0 ? manualOverrides[key] : roundUpToAvailable(w));
    return L + (t('tTorPlanka') + t('tTorBoard')) * 2;
  };
  const standardPass = chooseWallThickness(L, null, wallThicknessI1(density));
  if (standardPass.failedWall !== undefined) return { error: plankLayoutError(boardLenForError(standardPass.failedWall), null) };
  const standardWall = roundUpToAvailable(standardPass.wallRaw);
  const standardPlank = layoutForWall(L, standardWall, null).plank;
  const standardPlankCount = standardPlank.count;
  const standardPlankGap = standardPlank.count > 1 ? standardPlank.middle / (standardPlank.count - 1) : 0;

  const mainPass = plankOverride
    ? chooseWallThickness(L, plankOverride, wallThicknessI1(density))
    : standardPass;
  if (mainPass.failedWall !== undefined) return { error: plankLayoutError(boardLenForError(mainPass.failedWall), plankOverride) };

  // --- 3. Итоговые толщины ---
  const wall = { value: roundUpToAvailable(mainPass.wallRaw) };
  const { ov, belowGost, appliedCount } = makeThicknessOverrides(manualOverrides);
  const T = partThicknesses(ov, wall.value);

  // --- 4. Раскладка поясов под итоговые толщины ---
  // Толщина уже выбрана по расчётной (неокруглённой) раскладке; здесь только
  // геометрия под итоговый материал.
  const torecWall = (T.torPlanka + T.torBoard) * 2;
  const kLen = L + torecWall; // длина досок дна, крышки и бокового щита
  const plank = plankLayout(kLen, torecWall, plankOverride);
  if (plank.count === null) return { error: plankLayoutError(kLen, plankOverride) };
  const plankQty = plank.count;
  const plankGap = plank.middle / (plankQty - 1); // между кромками соседних планок

  // Полоз: не тоньше 50 мм и, в отличие от остальных деталей, без
  // округления до «в наличии».
  let skidT = null;
  if (skidEnabled) {
    skidT = ov('t9Value', Math.max(skidThicknessRaw, MIN_SKID_T), 'Толщина полоза');
    if (skidThicknessRaw < MIN_SKID_T && !(manualOverrides.t9Value > 0)) {
      warnings.push(`Толщина полоза ${skidThicknessRaw} мм менее 50 - принято 50 мм.`);
    }
  }

  // --- 5. Детали ---
  const g = { L, W, H, T, skidT, kLen, plankQty, horizPlankaLen, roundBoardWidths };
  const dno = parts.buildDno(g);
  const p = {
    dno: dno.rows,
    kryshka: parts.buildKryshka(g),
    bokovoy: parts.buildBokovoy(g),
    torec: parts.buildTorec(g),
  };
  if (raskosinaNeeded) {
    const err = parts.addRaskosiny(p, g, plankGap, !removeLidBottomRaskosina, xRaskosina);
    if (err) return { error: err };
  }
  // Раскосины на чертежах крышки и дна - с учётом галочки «Убрать раскосины
  // крышки и дна» (торец и бок рисуются по raskosinaNeeded).
  const kryshkaDnoHasRaskosina = raskosinaNeeded && !removeLidBottomRaskosina;

  // --- 6. Итог ---
  // Наружные размеры: высота = опора (полоз или планка дна) + доска дна +
  // груз + доска и планка крышки; ширина - планка и доска бока с двух
  // сторон; длина - вертикальная планка и доска торца с двух сторон.
  const bottomSupport = skidEnabled ? skidT : T.dnoPlanka;
  const outerH = bottomSupport + T.dnoBoard + H + T.krBoard + T.krPlanka;
  const outerW = W + (T.bokPlanka + T.bokBoard) * 2;
  const outerL = L + (T.torPlanka + T.torBoard) * 2;

  const totalVolume = sumVolume(p.dno) + sumVolume(p.kryshka) + 2 * sumVolume(p.bokovoy) + 2 * sumVolume(p.torec);
  const normaVremeni = computeNormaVremeni(totalVolume, baseProductivity, timeCoeff);
  const woodRho = woodDensity > 0 ? woodDensity : WOOD_DENSITY_KG_M3;
  const crateMass = totalVolume * woodRho;

  if (roundUpToAvailable.state.exceeded) {
    warnings.push(`Расчётная толщина детали больше максимальной «в наличии» (${availableThicknesses[availableThicknesses.length - 1]} мм) - использовано значение по ГОСТ (нужен пиломатериал большей толщины).`);
  }
  Object.values(belowGost).forEach(b => {
    warnings.push(`${b.label}: вручную указано ${b.value} мм (< расчётных ${Math.round(b.gostValue * 100) / 100} мм по ГОСТ) - использовано введённое значение.`);
  });
  if (appliedCount() > 0) {
    warnings.push('Использованы вручную введённые толщины, а не расчётные по ГОСТ - чертежи ниже могут их не точно отражать.');
  }

  const result = {
    warnings, dno: p.dno, kryshka: p.kryshka, bokovoy: p.bokovoy, torec: p.torec,
    outerL, outerW, outerH, totalVolume, normaVremeni, crateMass, woodDensity: woodRho,
    // Параметры чертежей.
    dnoWidth: dno.width, kLen, plank, plankQty, plankGap, raskosinaNeeded, kryshkaDnoHasRaskosina,
    xRaskosina: !!xRaskosina, kPlankaKryshka: parts.kryshkaPlankLen(g), H, W, wall,
    // Толщина, подписанная у выступающего угла планки: у дна - доска бокового
    // щита, у крышки - планка крышки, у бока сверху - доска крышки, снизу -
    // полоз (без полоза - планка дна).
    drawPlankT: { dno: T.bokBoard, kryshka: T.krPlanka, bokovoy: T.krBoard, bokovoyBottom: skidEnabled ? skidT : T.dnoPlanka },
    standardPlankCount, standardPlankGap,
    endTape: addEndTape ? parts.endTapeRows(g) : [],
    parchment: addParchment ? parts.parchmentRows(g) : [],
  };

  // Отрицательное число в любом поле - невозможная геометрия.
  const negField = findNegativeField(result, '');
  if (negField) {
    console.warn('Расчёт дал отрицательное значение:', negField);
    return { error: 'При таких размерах и массе груза получаются недопустимые (отрицательные) размеры деталей - рассчитать ящик нельзя. Проверьте введённые размеры и массу груза.' };
  }
  return result;
}

module.exports = { computeGost10198I1, WOOD_DENSITY_KG_M3 };
