// ГОСТ 10198-91 - бэкенд: чистые расчётные формулы (тип I-3, тип I-1, тип
// II-1) за HTTP API + раздача статического фронтенда (frontend/public).
// Расчётная логика перенесена из src/app.js, src/i1/calc.js и src/ii1/calc.js
// фронтенд-only репозитория pakhiton79-bit/GOST_10198-91 (см. комментарии в
// src/i3/compute.js, src/i1/compute.js и src/ii1/compute.js) - сама методика
// ГОСТа не менялась.
const path = require('path');
const express = require('express');

const { computeGost10198I3 } = require('./src/i3/compute');
const { computeGost10198I1, WOOD_DENSITY_KG_M3 } = require('./src/i1/compute');
const { computeGost10198II1 } = require('./src/ii1/compute');
const { AVAILABLE_THICKNESS_OPTIONS, applyTableEdits, sanitizeTableEdits, computeNormaVremeni } = require('./src/helpers');

// Разделы таблицы деталей и их множители в итоговом объёме (щиты
// торцевой/боковой - по 2 шт.) - для ручных правок таблицы (tableEdits).
const I1_TABLE_SECTIONS = { dno: 1, kryshka: 1, torec: 2, bokovoy: 2, endTape: 0 }; // endTape - лента обшивки торцов, в объём не входит
const I3_TABLE_SECTIONS = { dno: 1, kryshka: 1, endPanel: 2, bokovoy: 2 };
const II1_TABLE_SECTIONS = { dno: 1, kryshka: 1, endPanel: 2, bokovoy: 2 };

// Ручные правки таблицы деталей (по указанию пользователя - учитываются
// только при нажатии "Рассчитать", т.е. здесь, на сервере): подставляются в
// строки результата, объём/норма времени (и масса ящика у I-1)
// пересчитываются с их учётом.
function withTableEdits(result, rawEdits, sections, input, extra) {
  if (!result || result.error) return result;
  const edits = sanitizeTableEdits(rawEdits, sections);
  if (applyTableEdits(result, edits, sections)) {
    result.normaVremeni = computeNormaVremeni(result.totalVolume, input.baseProductivity, input.timeCoeff);
    if (extra) extra(result);
  }
  return result;
}

const app = express();
app.use(express.json());

// Толщины "в наличии" приходят от клиента (localStorage на его стороне) -
// на входе в API фильтруем до допустимого сортаментного ряда и сортируем,
// как это раньше делал loadAvailableThicknesses() во фронтенд-коде.
function sanitizeThicknesses(arr, options) {
  if (!Array.isArray(arr)) return [];
  const allowed = options || AVAILABLE_THICKNESS_OPTIONS;
  return arr.filter(v => allowed.includes(v)).sort((a, b) => a - b);
}
function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

// manualOverrides - правки толщины, введённые пользователем прямо в таблице
// деталей (см. src/i1/calc.js/src/app.js исходного репозитория) - объект
// { ключ: число }. На входе в API оставляем только конечные положительные
// числа под известными ключами - произвольные поля из тела запроса дальше в
// расчёт не пропускаются.
const I1_OVERRIDE_KEYS = ['wallValue'];
// I-3: wallValue/t12Value/t21Value/t10Value каскадные (см. ov() в
// computeGost10198I3), t9Value/t11Value (полоз/торцовый брус дна) -
// изолированные (полное объяснение см. computeGost10198I3).
const I3_OVERRIDE_KEYS = ['wallValue', 't9Value', 't10Value', 't11Value', 't12Value', 't21Value'];
// II-1: skinValue/t21/tStojka/t10/tLongbeam/floorBoardT/tRaskosina каскадные
// (см. ov() в computeGost10198II1), t9/t11 (полоз/торцовый брус дна) -
// изолированные (тот же принцип, что и у I3_OVERRIDE_KEYS выше).
const II1_OVERRIDE_KEYS = ['skinValue', 't21', 'tStojka', 't10', 'tLongbeam', 'floorBoardT', 'tRaskosina', 't9', 't11'];
function sanitizeManualOverrides(obj, allowedKeys) {
  const result = {};
  if (!obj || typeof obj !== 'object') return result;
  allowedKeys.forEach(key => {
    const n = Number(obj[key]);
    if (Number.isFinite(n) && n > 0) result[key] = n;
  });
  return result;
}

app.post('/api/i3/calculate', (req, res) => {
  const b = req.body || {};
  if (b.variant !== 'skid' && b.variant !== 'floor_boards') {
    return res.status(400).json({ error: 'variant должен быть "skid" или "floor_boards".' });
  }
  const input = {
    variant: b.variant,
    L: toNum(b.L), W: toNum(b.W), H: toNum(b.H), MASS: toNum(b.MASS),
    optimizeSizes: !!b.optimizeSizes,
    removeFloorBoards: !!b.removeFloorBoards,
    removeSkidBoards: !!b.removeSkidBoards,
    roundBoardWidths: !!b.roundBoardWidths,
    solidRigidBase: !!b.solidRigidBase,
    forkliftLoading: !!b.forkliftLoading,
    availableThicknesses: sanitizeThicknesses(b.availableThicknesses),
    manualOverrides: sanitizeManualOverrides(b.manualOverrides, I3_OVERRIDE_KEYS),
    baseProductivity: toNum(b.baseProductivity),
    timeCoeff: toNum(b.timeCoeff),
  };
  res.json(withTableEdits(computeGost10198I3(input), b.tableEdits, I3_TABLE_SECTIONS, input));
});

app.post('/api/i1/calculate', (req, res) => {
  const b = req.body || {};
  const input = {
    L: toNum(b.L), W: toNum(b.W), H: toNum(b.H), MASS: toNum(b.MASS),
    skidEnabled: !!b.skidEnabled,
    skidThicknessRaw: toNum(b.skidThicknessRaw),
    roundBoardWidths: !!b.roundBoardWidths,
    removeLidBottomRaskosina: !!b.removeLidBottomRaskosina,
    addRaskosina: !!b.addRaskosina,
    xRaskosina: !!b.xRaskosina,
    addEndTape: !!b.addEndTape,
    plankLayoutMode: (b.plankLayoutMode === 'count' || b.plankLayoutMode === 'gap') ? b.plankLayoutMode : null,
    plankLayoutValue: toNum(b.plankLayoutValue),
    availableThicknesses: sanitizeThicknesses(b.availableThicknesses),
    manualOverrides: sanitizeManualOverrides(b.manualOverrides, I1_OVERRIDE_KEYS),
    baseProductivity: toNum(b.baseProductivity),
    timeCoeff: toNum(b.timeCoeff),
  };
  res.json(withTableEdits(computeGost10198I1(input), b.tableEdits, I1_TABLE_SECTIONS, input,
    r => { r.crateMass = r.totalVolume * WOOD_DENSITY_KG_M3; }));
});

app.post('/api/ii1/calculate', (req, res) => {
  const b = req.body || {};
  if (b.fasteningType !== 'skid' && b.fasteningType !== 'floor_boards') {
    return res.status(400).json({ error: 'fasteningType должен быть "skid" или "floor_boards".' });
  }
  if (b.lidLayout !== 'longitudinal' && b.lidLayout !== 'transverse') {
    return res.status(400).json({ error: 'lidLayout должен быть "longitudinal" или "transverse".' });
  }
  const input = {
    L: toNum(b.L), W: toNum(b.W), H: toNum(b.H), MASS: toNum(b.MASS),
    fasteningType: b.fasteningType,
    lidLayout: b.lidLayout,
    optimizeSizes: !!b.optimizeSizes,
    removeFloorBoards: !!b.removeFloorBoards,
    removeSkidBoards: !!b.removeSkidBoards,
    roundBoardWidths: !!b.roundBoardWidths,
    solidRigidBase: !!b.solidRigidBase,
    forkliftLoading: !!b.forkliftLoading,
    availableThicknesses: sanitizeThicknesses(b.availableThicknesses),
    manualOverrides: sanitizeManualOverrides(b.manualOverrides, II1_OVERRIDE_KEYS),
    baseProductivity: toNum(b.baseProductivity),
    timeCoeff: toNum(b.timeCoeff),
  };
  res.json(withTableEdits(computeGost10198II1(input), b.tableEdits, II1_TABLE_SECTIONS, input));
});

const FRONTEND_DIR = path.join(__dirname, '..', 'frontend', 'public');
app.use(express.static(FRONTEND_DIR));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`GOST 10198-91 backend listening on port ${PORT}`);
});
