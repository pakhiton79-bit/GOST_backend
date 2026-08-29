// ГОСТ 10198-91 - бэкенд: чистые расчётные формулы (тип I-3, тип I-1) за
// HTTP API + раздача статического фронтенда (frontend/public). Расчётная
// логика перенесена из src/app.js и src/i1/calc.js фронтенд-only репозитория
// pakhiton79-bit/GOST_10198-91 (см. комментарии в src/i3/compute.js и
// src/i1/compute.js) - сама методика ГОСТа не менялась.
const path = require('path');
const express = require('express');

const { computeGost10198I3 } = require('./src/i3/compute');
const { computeGost10198I1 } = require('./src/i1/compute');
const { AVAILABLE_THICKNESS_OPTIONS } = require('./src/helpers');

const app = express();
app.use(express.json());

// Толщины "в наличии" приходят от клиента (localStorage на его стороне) -
// на входе в API фильтруем до допустимого сортаментного ряда и сортируем,
// как это раньше делал loadAvailableThicknesses() во фронтенд-коде.
function sanitizeThicknesses(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.filter(v => AVAILABLE_THICKNESS_OPTIONS.includes(v)).sort((a, b) => a - b);
}

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
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
  };
  res.json(computeGost10198I1(input));
});

const FRONTEND_DIR = path.join(__dirname, '..', 'frontend', 'public');
app.use(express.static(FRONTEND_DIR));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`GOST 10198-91 backend listening on port ${PORT}`);
});
