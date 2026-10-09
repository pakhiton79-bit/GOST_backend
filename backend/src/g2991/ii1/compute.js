// ГОСТ 2991-85, тип II-1 (плотный, торцовые стенки на двух планках; груз до
// 110 кг): расчёт ящика по таблице пользователя («ГОСТ 2991 тип II-1.docx»)
// и таблицам 2-4 ГОСТ.
//
// Толщины:
//   - доски боковых стенок - таблица 2 по внутренней высоте, дна и крышки -
//     по внутренней ширине (п. 1.9); масса больше 110 кг - по строке 125 кг с
//     предупреждением;
//   - поправки (галочки и порода): береза -1 градация, мягкие лиственные +1,
//     сосредоточенная нагрузка +1, пакетные/контейнерные перевозки -1 при
//     толщине от 13 мм;
//   - доски торцовых стенок и планки (толщина × ширина) - таблица 3 по
//     наибольшей из толщин досок боков, дна и крышки (п. 1.16);
//   - затем - вверх до толщин «в наличии» (больше максимальной - по ГОСТ, с
//     предупреждением).
// Детали (таблица пользователя):
//   - дно и крышка: длина = длина груза + 2 доски торца, заполняют ширину
//     груза + 2 доски бока;
//   - бок: длина = длина груза + 2 × (доска торца + планка), заполняет
//     высоту груза;
//   - торец: доски длиной = ширина груза заполняют высоту груза, 2 планки
//     длиной = высота груза;
//   - «Доски торца вертикально» (п. 1.2): доски торца длиной = высота груза
//     заполняют ширину груза, 2 планки горизонтально длиной = ширина груза,
//     бок = длина груза + 2 доски торца (дно и крышка - как обычно);
//   - «Без крышки» (п. 1.2): вместо крышки 2 доски толщиной как у дна,
//     шириной 50 мм, длиной как у крышки.
// Ширина досок: основная - 100 мм (меняется в общих настройках), доборные -
// как в ГОСТ 10198-91 (g2991FillBoards), не уже минимума таблицы 4.
const { vol, findNegativeField, inputLimitsError, makeRoundUpToAvailable, thicknessPartWarnings, computeNormaVremeni } = require('../../helpers');
const T = require('../table2');

const TYPE_II1_MAX_MASS = 110; // таблица 1
const NO_LID_BOARD_W = 50;     // доски вместо крышки (п. 1.2: 40-60 мм; по указанию пользователя - 50)
const WOOD_DENSITY_KG_M3 = 700; // плотность по умолчанию (как у ГОСТ 10198-91)
const SPECIES = ['conifer', 'birch', 'softDeciduous'];

// Строки деталей: основные доски и доборные (как в ГОСТ 10198-91).
function boardRows(name, t, l, fb, mainW) {
  const rows = [];
  if (fb.mainQty > 0) rows.push({ name, t, w: mainW, l, qty: fb.mainQty });
  fb.extra.forEach((e, i) => rows.push({ name: `${name} (дополнительная)${fb.extra.length > 1 ? ' ' + (i + 1) : ''}`, t, w: e.width, l, qty: e.qty }));
  return rows;
}
const rowsVolume = rows => rows.reduce((s, r) => s + vol(r.t, r.w, r.l, r.qty), 0);

function computeGost2991II1(input) {
  const { L, W, H, MASS } = input;
  if (![L, W, H, MASS].every(v => v > 0)) return { error: 'Заполните все поля размеров и массы положительными числами.' };
  const limitErr = inputLimitsError(input);
  if (limitErr) return { error: limitErr };

  const warnings = [];
  const opts = { species: SPECIES.includes(input.species) ? input.species : 'conifer', concentrated: !!input.concentrated, packet: !!input.packet };
  const noLid = !!input.noLid, verticalEnd = !!input.verticalEnd;
  const widths = input.availableWidths || [];
  const mainW = T.G2991_WIDTH_OPTIONS.includes(input.mainWidth) ? input.mainWidth : T.G2991_MAIN_WIDTH_DEFAULT;
  const minW = T.g2991MinBoardWidth(MASS);

  // Толщины по ГОСТ (с поправками), затем - «в наличии».
  const bok = T.table2Thickness(MASS, L, H, TYPE_II1_MAX_MASS);
  const dno = T.table2Thickness(MASS, L, W, TYPE_II1_MAX_MASS);
  const bokG = T.g2991Corrected(bok.thickness, opts), dnoG = T.g2991Corrected(dno.thickness, opts);
  const t3 = T.g2991Table3(Math.max(bokG, dnoG));
  const available = input.availableThicknesses || [];
  const round = makeRoundUpToAvailable(available);
  const bokT = round(bokG, 'Доски боковых стенок');
  const dnoT = round(dnoG, 'Доски дна');
  const lidT = round(dnoG, noLid ? 'Доски вместо крышки' : 'Доски крышки');
  const torecT = round(t3.torec, 'Доски торцовых стенок');
  const plankT = round(t3.plankT, 'Планки торца');
  const plankW = T.g2991RoundWidth(t3.plankW, widths);
  warnings.push(...thicknessPartWarnings(round, available));
  if (MASS > TYPE_II1_MAX_MASS) warnings.push(`Тип II-1 - для грузов до ${TYPE_II1_MAX_MASS} кг (таблица 1 ГОСТ 2991-85). Толщины взяты по строке 125 кг.`);
  if (L > 1200 && MASS <= 35) warnings.push('Длина больше 1200 мм: для масс до 35 кг в таблице 2 нет строки «св. 1200», толщины взяты по строке 1200 мм.');

  // Детали.
  const fill = (space, label) => {
    const fb = T.g2991FillBoards(space, mainW, input.roundBoardWidths !== false, minW, widths);
    if (fb.warn) warnings.push(`${label}: доборная доска уже ${minW} мм (минимум по таблице 4 ГОСТ 2991-85).`);
    return fb;
  };
  const dnoLen = L + torecT * 2;
  const dnoRows = boardRows('Доска дна', dnoT, dnoLen, fill(W + bokT * 2, 'Дно'), mainW);
  const lidRows = noLid
    ? [{ name: 'Доска вместо крышки', t: lidT, w: NO_LID_BOARD_W, l: dnoLen, qty: 2 }]
    : boardRows('Доска крышки', lidT, dnoLen, fill(W + bokT * 2, 'Крышка'), mainW);
  const bokLen = verticalEnd ? L + torecT * 2 : L + (torecT + plankT) * 2;
  const bokRows = boardRows('Доска бока', bokT, bokLen, fill(H, 'Бок'), mainW);
  const torecRows = verticalEnd
    ? [...boardRows('Доска торца', torecT, H, fill(W, 'Торец'), mainW), { name: 'Планка торца', t: plankT, w: plankW, l: W, qty: 2 }]
    : [...boardRows('Доска торца', torecT, W, fill(H, 'Торец'), mainW), { name: 'Планка торца', t: plankT, w: plankW, l: H, qty: 2 }];

  const totalVolume = rowsVolume(dnoRows) + rowsVolume(lidRows) + rowsVolume(torecRows) * 2 + rowsVolume(bokRows) * 2;
  const woodDensity = Number.isFinite(input.woodDensity) && input.woodDensity > 0 ? input.woodDensity : WOOD_DENSITY_KG_M3;
  const outerL = L + (torecT + plankT) * 2, outerW = W + bokT * 2, outerH = H + dnoT + lidT;

  const result = {
    L, W, H, mass: MASS, noLid, verticalEnd,
    thickness: { bok: bokT, dno: dnoT, kryshka: lidT, torec: torecT, plank: plankT },
    gost: { bok: bok.thickness, dno: dno.thickness, bokCorrected: bokG, dnoCorrected: dnoG },
    dno: dnoRows, kryshka: lidRows, torec: torecRows, bokovoy: bokRows,
    outerL, outerW, outerH,
    totalVolume, woodDensity,
    crateMass: totalVolume * woodDensity,
    normaVremeni: computeNormaVremeni(totalVolume, input.baseProductivity, input.timeCoeff),
    warnings,
  };
  const negField = findNegativeField(result);
  if (negField) return { error: 'При таких размерах и массе груза получаются недопустимые размеры деталей - рассчитать ящик нельзя.' };
  return result;
}

module.exports = { computeGost2991II1 };
