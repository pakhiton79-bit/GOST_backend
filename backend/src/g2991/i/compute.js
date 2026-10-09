// ГОСТ 2991-85, тип I (плотный, торцовые стенки без планок; груз до 35 кг):
// расчёт ящика. Детали - по общему виду ящика (рисунок пользователя), как у
// II-1, но без планок торца.
//
// Решения пользователя:
//   - ввод - как в ГОСТ 10198-91: размеры груза (= внутренние размеры ящика)
//     и масса;
//   - толщины - строго по таблице 2, без поправок п. 1.9-1.15 (порода,
//     пакетные перевозки, сосредоточенная нагрузка, пояса);
//   - расчётный размер: для боковых стенок - внутренняя высота, для дна и
//     крышки - внутренняя ширина (п. 1.9);
//   - масса больше 35 кг - считается по строке 35 кг с предупреждением;
//   - длина больше 1200 мм - по строке 1200;
//   - торец - 1,5 толщины боковой стенки, округление вверх по ряду
//     9/13/16/19/22/25 (п. 1.14);
//   - толщины «в наличии»: толщина по ГОСТ округляется вверх до ближайшей в
//     наличии; больше максимальной - толщина по ГОСТ с предупреждением;
//     ничего не выбрано - строго по ГОСТ.
// Детали (по общему виду: торцы - между боками, бока - между дном и крышкой,
// дно и крышка перекрывают всё):
//   - дно и крышка: длина = длина груза + 2 доски торца, заполняют ширину
//     груза + 2 доски бока;
//   - бок: длина = длина груза + 2 доски торца, заполняет высоту груза;
//   - торец: доски длиной = ширина груза заполняют высоту груза;
//   - «Без крышки» (п. 1.2): вместо крышки 2 доски толщиной как у дна,
//     шириной 50 мм (как у II-1), длиной как у крышки.
// Ширина досок - как у II-1: основная 100 мм (общие настройки), доборные не
// уже минимума таблицы 4.
const { vol, findNegativeField, inputLimitsError, makeRoundUpToAvailable, thicknessPartWarnings, computeNormaVremeni } = require('../../helpers');
const T = require('../table2');

const TYPE_I_MAX_MASS = 35;     // таблица 1
const NO_LID_BOARD_W = 50;      // доски вместо крышки (п. 1.2: 40-60 мм; как у II-1 - 50)
const WOOD_DENSITY_KG_M3 = 700; // плотность по умолчанию (как у ГОСТ 10198-91)

// Строки деталей: основные доски и доборные (как в ГОСТ 10198-91).
function boardRows(name, t, l, fb, mainW) {
  const rows = [];
  if (fb.mainQty > 0) rows.push({ name, t, w: mainW, l, qty: fb.mainQty });
  fb.extra.forEach((e, i) => rows.push({ name: `${name} (дополнительная)${fb.extra.length > 1 ? ' ' + (i + 1) : ''}`, t, w: e.width, l, qty: e.qty }));
  return rows;
}
const rowsVolume = rows => rows.reduce((s, r) => s + vol(r.t, r.w, r.l, r.qty), 0);

function computeGost2991I(input) {
  const { L, W, H, MASS } = input;
  if (![L, W, H, MASS].every(v => v > 0)) return { error: 'Заполните все поля размеров и массы положительными числами.' };
  const limitErr = inputLimitsError(input);
  if (limitErr) return { error: limitErr };

  const warnings = [];
  const noLid = !!input.noLid;
  const widths = input.availableWidths || [];
  const mainW = T.G2991_WIDTH_OPTIONS.includes(input.mainWidth) ? input.mainWidth : T.G2991_MAIN_WIDTH_DEFAULT;
  const minW = T.g2991MinBoardWidth(MASS);

  // Толщины по ГОСТ, затем - «в наличии».
  const bok = T.table2Thickness(MASS, L, H, TYPE_I_MAX_MASS);
  const dno = T.table2Thickness(MASS, L, W, TYPE_I_MAX_MASS);
  const torecGost = T.g2991RoundUp(bok.thickness * 1.5);
  const available = input.availableThicknesses || [];
  const round = makeRoundUpToAvailable(available);
  const bokT = round(bok.thickness, 'Доски боковых стенок');
  const dnoT = round(dno.thickness, 'Доски дна');
  const lidT = round(dno.thickness, noLid ? 'Доски вместо крышки' : 'Доски крышки');
  const torecT = round(torecGost, 'Доски торцовых стенок');
  if (MASS > TYPE_I_MAX_MASS) warnings.push(`Тип I - для грузов до ${TYPE_I_MAX_MASS} кг (таблица 1 ГОСТ 2991-85). Толщины взяты по строке ${TYPE_I_MAX_MASS} кг.`);
  warnings.push(...thicknessPartWarnings(round, available));
  if (L > 1200) warnings.push('Длина больше 1200 мм: для масс до 35 кг в таблице 2 нет строки «св. 1200», толщины взяты по строке 1200 мм.');

  // Детали.
  const fill = (space, label) => {
    const fb = T.g2991FillBoards(space, mainW, input.roundBoardWidths !== false, minW, widths);
    if (fb.warn) warnings.push(`${label}: доборная доска уже ${minW} мм (минимум по таблице 4 ГОСТ 2991-85).`);
    return fb;
  };
  const len = L + torecT * 2; // дно, крышка и бока
  const dnoRows = boardRows('Доска дна', dnoT, len, fill(W + bokT * 2, 'Дно'), mainW);
  const lidRows = noLid
    ? [{ name: 'Доска вместо крышки', t: lidT, w: NO_LID_BOARD_W, l: len, qty: 2 }]
    : boardRows('Доска крышки', lidT, len, fill(W + bokT * 2, 'Крышка'), mainW);
  const bokRows = boardRows('Доска бока', bokT, len, fill(H, 'Бок'), mainW);
  const torecRows = boardRows('Доска торца', torecT, W, fill(H, 'Торец'), mainW);

  const totalVolume = rowsVolume(dnoRows) + rowsVolume(lidRows) + rowsVolume(torecRows) * 2 + rowsVolume(bokRows) * 2;
  const woodDensity = Number.isFinite(input.woodDensity) && input.woodDensity > 0 ? input.woodDensity : WOOD_DENSITY_KG_M3;

  const result = {
    L, W, H, mass: MASS, noLid,
    thickness: { bok: bokT, dno: dnoT, kryshka: lidT, torec: torecT },
    gost: { bok: bok.thickness, dno: dno.thickness, torec: torecGost },
    dno: dnoRows, kryshka: lidRows, torec: torecRows, bokovoy: bokRows,
    // Размеры для чертежей: дно и крышка - длина × ширина, щиты - длина × высота.
    drawing: { dnoL: len, dnoW: W + bokT * 2, bokL: len, torecW: W, H },
    outerL: len, outerW: W + bokT * 2, outerH: H + dnoT + lidT,
    totalVolume, woodDensity,
    crateMass: totalVolume * woodDensity,
    normaVremeni: computeNormaVremeni(totalVolume, input.baseProductivity, input.timeCoeff),
    warnings,
  };
  const negField = findNegativeField(result);
  if (negField) return { error: 'При таких размерах и массе груза получаются недопустимые размеры деталей - рассчитать ящик нельзя.' };
  return result;
}

module.exports = { computeGost2991I };
