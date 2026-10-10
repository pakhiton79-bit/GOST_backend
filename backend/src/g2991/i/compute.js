// ГОСТ 2991-85, тип I (плотный, торцовые стенки без планок; груз до 35 кг):
// расчёт ящика. Детали - по общему виду ящика (рисунок пользователя).
//
// Конструкция (по общему виду): дно и крышка перекрывают всё, бока - между
// дном и крышкой, торцы - между боками.
//   - дно и крышка: длина = длина груза + 2 доски торца, заполняют ширину
//     груза + 2 доски бока;
//   - бок: длина = длина груза + 2 доски торца, заполняет высоту груза;
//   - торец: доски горизонтально, длиной = ширина груза, заполняют высоту
//     груза (см. torecLayout);
//   - «Без крышки» (п. 1.2): вместо крышки 2 доски толщиной как у дна,
//     шириной 50 мм (как у II-1), длиной как у крышки.
// Толщины (решения пользователя):
//   - таблица 2 с поправками п. 1.9-1.13, как у II-1 (порода, сосредоточенная
//     нагрузка, пакетные перевозки); расчётный размер: для боков - высота
//     груза, для дна и крышки - ширина груза (п. 1.9);
//   - масса больше 35 кг - по строке 35 кг с предупреждением; длина больше
//     1200 мм - по строке 1200;
//   - торец - 1,5 толщины бока (с поправками), вверх по ряду
//     9/13/16/19/22/25 (п. 1.14);
//   - затем - вверх до толщин «в наличии» (больше максимальной - по ГОСТ, с
//     предупреждением).
// Ширины досок - g2991BoardWidths (boards.js): основная - выбор внутри типа
// (по умолчанию 100 мм), доски торца - 150 мм, обе вверх до ширины «в
// наличии»; доборные - не уже минимума таблицы 4.
const { findNegativeField, inputLimitsError, makeRoundUpToAvailable, thicknessPartWarnings, computeNormaVremeni } = require('../../helpers');
const T = require('../table2');
const B = require('../boards');

const TYPE_I_MAX_MASS = 35;     // таблица 1
const NO_LID_BOARD_W = 50;      // доски вместо крышки (п. 1.2: 40-60 мм; как у II-1 - 50)
const WOOD_DENSITY_KG_M3 = 700; // плотность по умолчанию (как у ГОСТ 10198-91)
const SPECIES = ['conifer', 'birch', 'softDeciduous'];
const JOINT_CLEARANCE = 20;     // стык торца - не ближе стольких мм к стыку бока

// Доски торца снизу вверх (по указанию пользователя): по возможности цельный
// торец - одна доска (высота до ширины доски торца torecW); иначе нижняя
// доска w0, k средних шириной m и верхняя top (не уже minW, не шире m), и
// все стыки торца - не ближе JOINT_CLEARANCE к стыкам бока (п. 1.2: стык
// торца перекрыт доской боковой стенки). Перебор: средние - torecW, затем
// уже (по ширинам «в наличии» или через 5 мм); нижняя - как можно шире, по
// ширинам через 5 мм (её распускают из доски «в наличии»).
// Результат: { single } | { w0, m, k, top } | { clash } - развести не удалось.
function torecLayout(H, torecW, bokJoints, minW, widths) {
  if (H <= torecW) return { single: true };
  const narrower = (widths.length ? widths : T.G2991_WIDTH_OPTIONS).filter(w => w >= minW && w < torecW);
  const mains = [torecW, ...narrower.sort((a, b) => b - a)];
  const clear = j => bokJoints.every(s => Math.abs(j - s) >= JOINT_CLEARANCE);
  for (const m of mains) {
    for (const w0 of T.G2991_WIDTH_OPTIONS.filter(w => w >= minW && w <= m).reverse()) {
      const k = Math.max(0, Math.ceil((H - w0 - m) / m - 1e-9));
      const top = H - w0 - k * m;
      if (top < minW || top > m) continue;
      const joints = Array.from({ length: k + 1 }, (_, i) => w0 + i * m);
      if (joints.every(clear)) return { w0, m, k, top };
    }
  }
  return { clash: true };
}

// Строки торца по раскладке torecLayout (снизу вверх). Верхняя доска - по
// остатку (вверх до ширины «в наличии»), сумма ширин равна высоте груза.
function torecRows(layout, ctx) {
  const { t, W, H, torecW, minW, widths, warnings } = ctx;
  const row = (name, w, qty) => ({ name, t, w, l: W, qty });
  if (layout.single) return [row('Доска торца', T.g2991RoundWidth(H, widths), 1)];
  if (layout.clash) {
    warnings.push('Торец: не удалось развести стыки досок торца и бока - часть стыков торца совпадает со стыками бока (п. 1.2).');
    const fb = T.g2991FillBoards(H, torecW, minW, widths);
    if (fb.warn) warnings.push(`Торец: доборная доска уже ${minW} мм (минимум по таблице 4 ГОСТ 2991-85).`);
    return B.g2991BoardRows('Доска торца', t, W, fb, torecW);
  }
  const { w0, m, k, top } = layout;
  const topW = T.g2991RoundWidth(top, widths);
  const middle = k + (w0 === m ? 1 : 0) + (topW === m ? 1 : 0);
  return [
    ...(w0 !== m ? [row('Доска торца (нижняя)', w0, 1)] : []),
    ...(middle > 0 ? [row('Доска торца', m, middle)] : []),
    ...(topW !== m ? [row('Доска торца (верхняя)', topW, 1)] : []),
  ];
}

function computeGost2991I(input) {
  const { L, W, H, MASS } = input;
  if (![L, W, H, MASS].every(v => v > 0)) return { error: 'Заполните все поля размеров и массы положительными числами.' };
  const limitErr = inputLimitsError(input);
  if (limitErr) return { error: limitErr };

  const warnings = [];
  const opts = { species: SPECIES.includes(input.species) ? input.species : 'conifer', concentrated: !!input.concentrated, packet: !!input.packet };
  const noLid = !!input.noLid;
  const widths = input.availableWidths || [];
  const bw = B.g2991BoardWidths(input.mainWidth, widths);
  const minW = T.g2991MinBoardWidth(MASS);

  // Толщины по ГОСТ (с поправками), затем - «в наличии».
  const bok = T.table2Thickness(MASS, L, H, TYPE_I_MAX_MASS);
  const dno = T.table2Thickness(MASS, L, W, TYPE_I_MAX_MASS);
  const bokG = T.g2991Corrected(bok.thickness, opts), dnoG = T.g2991Corrected(dno.thickness, opts);
  const torecG = T.g2991RoundUp(bokG * 1.5);
  const available = input.availableThicknesses || [];
  const round = makeRoundUpToAvailable(available);
  const bokT = round(bokG, 'Доски боковых стенок');
  const dnoT = round(dnoG, 'Доски дна');
  const lidT = round(dnoG, noLid ? 'Доски вместо крышки' : 'Доски крышки');
  const torecT = round(torecG, 'Доски торцовых стенок');
  if (MASS > TYPE_I_MAX_MASS) warnings.push(`Тип I - для грузов до ${TYPE_I_MAX_MASS} кг (таблица 1 ГОСТ 2991-85). Толщины взяты по строке ${TYPE_I_MAX_MASS} кг.`);
  warnings.push(...thicknessPartWarnings(round, available));
  if (L > 1200) warnings.push('Длина больше 1200 мм: для масс до 35 кг в таблице 2 нет строки «св. 1200», толщины взяты по строке 1200 мм.');

  // Детали.
  const fill = (space, label) => {
    const fb = T.g2991FillBoards(space, bw.main, minW, widths);
    if (fb.warn) warnings.push(`${label}: доборная доска уже ${minW} мм (минимум по таблице 4 ГОСТ 2991-85).`);
    return fb;
  };
  const len = L + torecT * 2; // дно, крышка и бока
  const dnoRows = B.g2991BoardRows('Доска дна', dnoT, len, fill(W + bokT * 2, 'Дно'), bw.main);
  const lidRows = noLid
    ? [{ name: 'Доска вместо крышки', t: lidT, w: NO_LID_BOARD_W, l: len, qty: 2 }]
    : B.g2991BoardRows('Доска крышки', lidT, len, fill(W + bokT * 2, 'Крышка'), bw.main);
  const bokFill = fill(H, 'Бок');
  const bokRows = B.g2991BoardRows('Доска бока', bokT, len, bokFill, bw.main);
  const bokJoints = B.g2991Joints(B.g2991LayoutWidths(bokFill, bw.main), H);
  const torec = torecRows(torecLayout(H, bw.torec, bokJoints, minW, widths),
    { t: torecT, W, H, torecW: bw.torec, minW, widths, warnings });

  const totalVolume = B.g2991RowsVolume(dnoRows) + B.g2991RowsVolume(lidRows) + B.g2991RowsVolume(torec) * 2 + B.g2991RowsVolume(bokRows) * 2;
  const woodDensity = Number.isFinite(input.woodDensity) && input.woodDensity > 0 ? input.woodDensity : WOOD_DENSITY_KG_M3;

  const result = {
    L, W, H, mass: MASS, noLid,
    thickness: { bok: bokT, dno: dnoT, kryshka: lidT, torec: torecT },
    gost: { bok: bok.thickness, dno: dno.thickness, bokCorrected: bokG, dnoCorrected: dnoG, torec: torecG },
    dno: dnoRows, kryshka: lidRows, torec, bokovoy: bokRows,
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
