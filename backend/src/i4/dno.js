// ГОСТ 10198-91, тип I-4: дно - полозья, подполозные доски, торцовые брусья
// и доски дна.
const { vol } = require('../helpers');
const { fillGapBoards } = require('./boards');
const {
  subfloorThicknessRaw, polozSection165, selectSkid19, minSkidsByWidth162,
  endBeamSection, floorBoardThicknessNew, floorBoardThickness, T4_LOADS, T4_DISTANCES,
} = require('../i3/tables');

// Полозья: при сплошном жёстком основании груза - сечение по п.1.6.5 и число
// по ширине (п.1.6.2), иначе - по Табл. 19. Толщина полоза округляется вверх
// до «в наличии», ширина - по таблице.
function chooseSkids(c, skidLen, skidCalcWidth) {
  const { W, MASS, warnings } = c;
  if (c.solidRigidBase) {
    const poloz = polozSection165(MASS);
    if (poloz.exceeded) {
      warnings.push('Масса вне диапазона п.1.6.5 (500–20000 кг) - сечение полоза принято по крайнему значению.');
    }
    const count = Math.max((W > 1100) ? 3 : 2, minSkidsByWidth162(skidCalcWidth, poloz.w));
    return { count, t: c.round(poloz.h, 'Полоз'), w: poloz.w };
  }
  const sel = selectSkid19(MASS, skidLen, skidCalcWidth, c.availableThicknesses);
  if (sel.massSnapped) {
    warnings.push(`Масса ${MASS} кг вне Табл. 19 - принята ближайшая (${sel.massUsed} кг).`);
  }
  if (sel.lengthSnapped) {
    warnings.push(`Длина полоза ${Math.round(skidLen)} мм вне Табл. 19 - принята ближайшая (${sel.lengthUsed} мм).`);
  }
  if (sel.extrapolatedBeyondOne) {
    // +1 полоз сверх таблицы - штатно; больше - уже отклонение от правила.
    warnings.push(`Табл. 19: не хватает полозьев для шага осей ≤1200 мм (п.1.6.2) - добавлен ещё того же сечения (${sel.count} шт. итого).`);
  }
  return { count: sel.count, t: c.round(sel.h, 'Полоз'), w: sel.w };
}

// Толщина доски дна: при креплении к доскам дна - по Табл. 4 (удельная
// нагрузка и шаг осей полозьев), при креплении за полозья - по массе.
function floorBoardGostThickness(c, skid, skidCalcWidth) {
  const { L, W, MASS, warnings } = c;
  if (c.variant !== 'floor_boards') return floorBoardThicknessNew(MASS);
  const skidDistance = skid.count > 1 ? (skidCalcWidth - skid.w) / (skid.count - 1) : skidCalcWidth;
  const floor = floorBoardThickness(MASS, L, W, skidDistance);
  if (floor.exceeded) {
    if (floor.udel > T4_LOADS[T4_LOADS.length - 1]) {
      warnings.push(`Удельная нагрузка на дно ${floor.udel.toFixed(2)} кг/см² вне Табл. 4 - толщина доски дна принята по крайнему значению.`);
    }
    if (skidDistance > T4_DISTANCES[T4_DISTANCES.length - 1]) {
      warnings.push(`Шаг полозьев ${Math.round(skidDistance)} мм вне Табл. 4 - толщина доски дна принята по крайнему значению.`);
    }
  }
  return floor.value;
}

// c - контекст расчёта (см. compute.js): входные данные, wall, ov, round,
// warnings. Возвращает строки таблицы, объём и размеры, нужные остальным узлам.
function buildDno(c) {
  const { L, W, MASS, wall, ov, round, warnings, removeSkidBoards, removeFloorBoards } = c;
  const rows = [];
  const skidCalcWidth = W + wall * 2;
  const skidLen = L + (wall + wall) * 2; // длина груза + (планка + доска торца) × 2

  // Полоз. Ручная толщина (t9Value) - и в таблице, и в расчёте (объём,
  // наружная высота, длина планки бока).
  const skid = chooseSkids(c, skidLen, skidCalcWidth);
  skid.t = ov('t9Value', skid.t, 'Толщина полоза');
  rows.push({ name: 'Полоз', t: skid.t, w: skid.w, l: skidLen, qty: skid.count, overrideKey: 't9Value' });

  // Подполозная доска (п.1.6.11): длина = полоз - 400 мм; при погрузке
  // погрузчиком - не тоньше 50 мм и не короче 300 мм. Невозможная длина
  // (≤ 0 или < 300 при погрузчике) - в таблице ⚠ вместо длины.
  const t10Raw = c.forkliftLoading ? Math.max(subfloorThicknessRaw(MASS), 50) : subfloorThicknessRaw(MASS);
  // Ширина подполозной доски - всегда как у полоза (по указанию
  // пользователя; раньше - не больше 150 мм).
  const sub = { t: ov('t10Value', round(t10Raw), 'Толщина подполозной доски'), w: skid.w, l: skidLen - 400, qty: skid.count };
  if (sub.l < 300) {
    warnings.push(`Длина подполозной доски ${Math.round(sub.l)} мм менее 300 мм.`);
  }
  const forkliftFail = c.forkliftLoading && sub.l < 300;
  if (forkliftFail) {
    warnings.push(`Погрузка погрузчиком требует ≥300 мм у подполозной доски (сейчас ${Math.round(sub.l)} мм).`);
  }
  if (!removeSkidBoards) {
    rows.push({ name: 'Подполозная доска', t: sub.t, w: sub.w, l: (sub.l <= 0 || forkliftFail) ? '⚠' : sub.l, qty: sub.qty, overrideKey: 't10Value' });
  }

  // Торцовый брус дна (п.1.6.8). Ручная толщина (t11Value) - и в таблице, и в объёме.
  const endBeam = endBeamSection(MASS);
  if (endBeam.exceeded) {
    warnings.push('Масса вне диапазона п.1.6.8 (≤5000 кг) - сечение торцового бруса дна принято по крайнему значению.');
  }
  const beam = { t: ov('t11Value', round(endBeam.h, 'Торцовый брус дна'), 'Толщина торцового бруса дна'), w: endBeam.w, l: W, qty: 2 };
  rows.push({ name: 'Торцовый брус дна', t: beam.t, w: beam.w, l: beam.l, qty: beam.qty, overrideKey: 't11Value' });

  // Доски дна - между торцовыми брусьями, поперёк ящика.
  const floorGostT = floorBoardGostThickness(c, skid, skidCalcWidth);
  const t12 = removeFloorBoards ? 0 : ov('t12Value', round(floorGostT), 'Толщина доски дна');
  const floorLen = W;
  // Доски дна - с промежутками (boards.js); убраны - без предупреждений.
  const fb = fillGapBoards(L - beam.w * 2, c.roundBoardWidths, c.boardGapMax, 'Дно', removeFloorBoards ? [] : warnings);
  if (!removeFloorBoards) {
    if (fb.mainQty > 0) rows.push({ name: 'Доска дна', t: t12, w: 100, l: floorLen, qty: fb.mainQty, overrideKey: 't12Value' });
    fb.extra.forEach((e, i) => {
      const suffix = fb.extra.length > 1 ? ' ' + (i + 1) : '';
      rows.push({ name: 'Доска дна (дополнительная)' + suffix, t: t12, w: e.width, l: floorLen, qty: e.qty, overrideKey: 't12Value' });
    });
    if (fb.warn) warnings.push('Доска дна: остаток - нестандартная ширина (вне 75–99 мм).');
    if (fb.singleNarrow) warnings.push('Доска дна: одна доска уже менее 100 мм.');
  }

  const volume = vol(skid.t, skid.w, skidLen, skid.count) + (removeSkidBoards ? 0 : vol(sub.t, sub.w, sub.l, sub.qty)) + vol(beam.t, beam.w, beam.l, beam.qty)
    + (removeFloorBoards ? 0 : (vol(t12, 100, floorLen, fb.mainQty)
      + fb.extra.reduce((s, e) => s + vol(t12, e.width, floorLen, e.qty), 0)));

  return { rows, volume, skidLen, skidT: skid.t, subT: sub.t, t12, boardGap: removeFloorBoards ? null : fb.gap };
}

module.exports = { buildDno };
