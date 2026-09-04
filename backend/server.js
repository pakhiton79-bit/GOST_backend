// ГОСТ 10198-91 - бэкенд: чистые расчётные формулы (тип I-3, тип I-1, тип
// II-1) за HTTP API + раздача статического фронтенда (frontend/public).
// Расчётная логика перенесена из src/app.js, src/i1/calc.js и src/ii1/calc.js
// фронтенд-only репозитория pakhiton79-bit/GOST_10198-91 (см. комментарии в
// src/i3/compute.js, src/i1/compute.js и src/ii1/compute.js) - сама методика
// ГОСТа не менялась.
const path = require('path');
const express = require('express');

const { computeGost10198I3 } = require('./src/i3/compute');
const { computeGost10198I1 } = require('./src/i1/compute');
const { computeGost10198II1 } = require('./src/ii1/compute');
const { AVAILABLE_THICKNESS_OPTIONS } = require('./src/helpers');

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
// II-1 (frontend/public/js/ii1/ui.js) допускает более крупные толщины, чем
// I-1/I-3 (до 250мм - нужны для сечений полозьев/торцового бруса дна по
// Табл.19 при больших массах) - не общий AVAILABLE_THICKNESS_OPTIONS.
const II1_AVAILABLE_THICKNESS_OPTIONS = [16, 19, 22, 25, 32, 40, 50, 60, 75, 100, 125, 150, 175, 200, 225, 250];

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
const II1_OVERRIDE_KEYS = ['skinValue', 't21', 'tStojka', 't10', 'tLongbeam', 'floorBoardT', 'tRaskosina', 't9', 't11', 'tWallbeam'];
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
  };
  res.json(computeGost10198I3(input));
});

app.post('/api/i1/calculate', (req, res) => {
  const b = req.body || {};
  const input = {
    L: toNum(b.L), W: toNum(b.W), H: toNum(b.H), MASS: toNum(b.MASS),
    skidEnabled: !!b.skidEnabled,
    skidThicknessRaw: toNum(b.skidThicknessRaw),
    roundBoardWidths: !!b.roundBoardWidths,
    availableThicknesses: sanitizeThicknesses(b.availableThicknesses),
    manualOverrides: sanitizeManualOverrides(b.manualOverrides, I1_OVERRIDE_KEYS),
  };
  res.json(computeGost10198I1(input));
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
    availableThicknesses: sanitizeThicknesses(b.availableThicknesses, II1_AVAILABLE_THICKNESS_OPTIONS),
    manualOverrides: sanitizeManualOverrides(b.manualOverrides, II1_OVERRIDE_KEYS),
  };
  res.json(computeGost10198II1(input));
});

const FRONTEND_DIR = path.join(__dirname, '..', 'frontend', 'public');
app.use(express.static(FRONTEND_DIR));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`GOST 10198-91 backend listening on port ${PORT}`);
});
