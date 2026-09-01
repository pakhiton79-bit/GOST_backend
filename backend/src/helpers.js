// Общие для типов I-3 и I-1 расчётные утилиты - перенесены как есть из
// src/logic.js и src/i1/logic.js исходного (фронтенд-only) репозитория
// pakhiton79-bit/GOST_10198-91, без изменений в формулах.

function roundup(x, decimals) {
  const f = Math.pow(10, decimals);
  return Math.ceil(x * f - 1e-9) / f;
}

function ceilInt(x) {
  return Math.ceil(x - 1e-9);
}

function vol(t, w, l, qty) { // m3, dims in mm
  return (t * w * l) / 1e9 * qty;
}

// Стандартный ряд толщин пиломатериала (сортаментный ряд) - округление
// "в наличии" возможно только до одного из этих значений.
const AVAILABLE_THICKNESS_OPTIONS = [16, 19, 22, 25, 32, 40, 50, 60, 75, 100, 125, 150, 175, 200];

// fillBoards: заполняет пространство `space` (мм) досками шириной 100мм по максимуму,
// а остаток (если есть) - 1-2 дополнительными досками шириной 75-99мм (могут быть разной
// ширины - выбираются сами, для полного заполнения пространства). Если остаток < 75мм,
// "занимаем" одну доску 100мм и делим (остаток+100) на 2 доски; если из-за этого ширина
// всё равно выходит за 75-99мм - используем как есть и сообщаем через .warn.
function fillBoards(space, roundWidths) {
  space = Math.round(space);
  if (roundWidths) {
    return { mainQty: ceilInt(space / 100), extra: [], warn: false, singleNarrow: false };
  }
  let mainQty = Math.floor(space / 100);
  const remainder = space - mainQty * 100;
  const extra = [];
  let warn = false;
  if (remainder > 0) {
    let placed = false;
    for (let borrow = 0; borrow <= mainQty && !placed; borrow++) {
      const total = remainder + 100 * borrow;
      for (let n = 1; n <= 50 && !placed; n++) {
        if (total < 75 * n || total > 99 * n) continue;
        mainQty -= borrow;
        const base = Math.floor(total / n);
        const rem2 = total - base * n;
        const groups = {};
        for (let i = 0; i < n; i++) {
          const w = base + (i < rem2 ? 1 : 0);
          groups[w] = (groups[w] || 0) + 1;
        }
        Object.keys(groups).map(Number).sort((a, b) => a - b).forEach(w => {
          extra.push({ width: w, qty: groups[w] });
        });
        placed = true;
      }
    }
    if (!placed && mainQty === 0) {
      extra.push({ width: remainder, qty: 1 });
    } else if (!placed) {
      const borrow = Math.min(mainQty, 1);
      mainQty -= borrow;
      const total = remainder + 100 * borrow;
      const w1 = Math.min(99, Math.max(1, total - 75));
      const w2 = total - w1;
      extra.push({ width: w1, qty: 1 });
      if (w2 > 0) extra.push({ width: w2, qty: 1 });
      warn = true;
    }
  }
  const totalExtraQty = extra.reduce((s, e) => s + e.qty, 0);
  const totalBoards = mainQty + totalExtraQty;
  const singleNarrow = totalBoards === 1 && mainQty === 0;
  return { mainQty, extra, warn, singleNarrow };
}

// Округление вверх до ближайшей выбранной толщины "в наличии". availableThicknesses
// пуст -> округление не выполняется, толщина возвращается как есть (строго по ГОСТ).
// Если расчётная толщина превышает даже максимальную из выбранных "в наличии" -
// значение не занижается, а остаётся расчётным по ГОСТ - вызывающая сторона должна
// сама взвести предупреждение, если понадобится (см. makeRoundUpToAvailable).
function makeRoundUpToAvailable(availableThicknesses) {
  const state = { exceeded: false };
  const fn = function (t) {
    if (!availableThicknesses || availableThicknesses.length === 0) return t;
    for (const a of availableThicknesses) { if (t <= a) return a; }
    state.exceeded = true;
    return t;
  };
  fn.state = state;
  return fn;
}

// Ищет первое отрицательное число где угодно в результате расчёта - и в
// таблице деталей, и в параметрах для чертежей (они в том же объекте) - по
// указанию пользователя: отрицательный размер всегда означает ошибку
// формулы или невозможную геометрию, такой результат нельзя показывать
// пользователю ни в каком виде (см. computeGost10198I1/I3). '⚠' (символ, не
// число) - осознанный признак нерасчитанного узла, пропускается, это не
// ошибка. Возвращает путь до первого найденного отрицательного значения
// (для сообщения об ошибке) либо null, если всё в порядке.
function findNegativeField(value, path) {
  if (typeof value === 'number') {
    return (Number.isFinite(value) && value < 0) ? path : null;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const found = findNegativeField(value[i], `${path}[${i}]`);
      if (found) return found;
    }
    return null;
  }
  if (value && typeof value === 'object') {
    for (const key of Object.keys(value)) {
      const found = findNegativeField(value[key], path ? `${path}.${key}` : key);
      if (found) return found;
    }
    return null;
  }
  return null;
}

module.exports = {
  roundup, ceilInt, vol, fillBoards,
  AVAILABLE_THICKNESS_OPTIONS,
  makeRoundUpToAvailable,
  findNegativeField,
};
