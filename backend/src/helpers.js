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
// "в наличии" возможно только до одного из этих значений. До 250мм (не
// только 200мм) - совпадает со списком на клиенте у всех трёх типов
// (i1/ui.js, app-i3.js, ii1/ui.js); раньше этот общий бэкендовый список
// заканчивался на 200мм и молча обрезал 225/250мм, выбранные на клиенте
// (I-1 сам список на клиенте уже тоже был без 225/250 - см. i1/ui.js; I-3
// такого разрыва на клиенте не имел, но бэкенд всё равно обрезал бы его
// собственный выбор 225/250мм - реальный, ранее не замеченный баг).
const AVAILABLE_THICKNESS_OPTIONS = [16, 19, 22, 25, 32, 40, 50, 60, 75, 100, 125, 150, 175, 200, 225, 250];

// Норма времени = объём пиломатериала (м³) / базовая производительность
// (м³/ч) × коэффициент времени. Оба параметра настраиваются шестерёнкой у
// плитки "Норма времени" на клиенте (localStorage, см.
// frontend/public/js/common-timesettings.js) и приходят в теле запроса к
// /api/*/calculate - здесь только валидируются (при отсутствии/некорректном
// значении используются те же значения по умолчанию, что и на клиенте).
const TIME_SETTINGS_DEFAULTS = { baseProductivity: 0.06, timeCoeff: 1.0 };
function computeNormaVremeni(totalVolume, baseProductivity, timeCoeff) {
  const bp = Number.isFinite(baseProductivity) && baseProductivity > 0 ? baseProductivity : TIME_SETTINGS_DEFAULTS.baseProductivity;
  const tc = Number.isFinite(timeCoeff) && timeCoeff > 0 ? timeCoeff : TIME_SETTINGS_DEFAULTS.timeCoeff;
  return roundup((totalVolume / bp) * tc, 1);
}

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

// Ручные правки таблицы деталей (tableEdits) - подставляются в строки
// результата после расчёта, итоговый объём корректируется на разницу
// объёмов изменённых строк (с множителем раздела: щиты торцевой/боковой -
// по 2 шт.). Та же логика, что и applyTableEdits в common-print.js
// исходного (фронтенд) репозитория. Строка опознаётся ключом "название#
// порядковый номер среди строк с тем же названием" (см. tableRowKeys).
// Возвращает число изменённых строк.
const TABLE_EDIT_ROLES = ['t', 'w', 'l', 'qty'];
function tableRowKeys(rows) {
  const occ = {};
  return rows.map(r => {
    const n = String(r.name);
    const i = occ[n] || 0;
    occ[n] = i + 1;
    return n + '#' + i;
  });
}
function applyTableEdits(calc, edits, sections) {
  if (!edits || typeof edits !== 'object') return 0;
  const num = v => { const x = parseFloat(v); return Number.isFinite(x) ? x : 0; };
  const rowVol = r => num(r.t) * num(r.w) * num(r.l) / 1e9 * num(r.qty);
  let applied = 0, delta = 0;
  Object.keys(sections).forEach(sec => {
    const rows = calc[sec], secEdits = edits[sec];
    if (!Array.isArray(rows) || !secEdits) return;
    const keys = tableRowKeys(rows);
    rows.forEach((r, i) => {
      const e = secEdits[keys[i]];
      if (!e) return;
      const before = rowVol(r);
      let changed = false;
      TABLE_EDIT_ROLES.forEach(role => {
        if (!(role in e)) return;
        if (role === 't' && r.overrideKey) return; // толщина - через manualOverrides
        r[role] = e[role];
        r.edited = r.edited || {};
        r.edited[role] = true;
        changed = true;
      });
      // role 'text' - свободный текст ячейки (лента обшивки торцов).
      if (sec === 'endTape' && typeof e.text === 'string') { r.text = e.text; r.edited = r.edited || {}; r.edited.text = true; changed = true; }
      if (!changed) return;
      delta += (rowVol(r) - before) * sections[sec];
      applied++;
    });
  });
  if (applied) calc.totalVolume += delta;
  return applied;
}

// Проверка tableEdits из запроса: только известные разделы, ключ - строка
// разумной длины, значения - конечные числа (размеры > 0, кол-во >= 0),
// не больше 500 правок.
function sanitizeTableEdits(raw, sections) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  let count = 0;
  Object.keys(sections).forEach(sec => {
    const s = raw[sec];
    if (!s || typeof s !== 'object') return;
    Object.keys(s).forEach(key => {
      if (typeof key !== 'string' || key.length > 200 || count >= 500) return;
      const e = s[key];
      if (!e || typeof e !== 'object') return;
      const clean = {};
      TABLE_EDIT_ROLES.forEach(role => {
        const v = Number(e[role]);
        if (!(role in e) || !Number.isFinite(v) || v < 0 || v > 1e6 || (v === 0 && role !== 'qty')) return;
        clean[role] = v;
      });
      if (sec === 'endTape' && typeof e.text === 'string' && e.text.trim() && e.text.length <= 200) clean.text = e.text.trim();
      if (Object.keys(clean).length) {
        out[sec] = out[sec] || {};
        out[sec][key] = clean;
        count++;
      }
    });
  });
  return out;
}

module.exports = {
  roundup, ceilInt, vol, fillBoards,
  AVAILABLE_THICKNESS_OPTIONS,
  makeRoundUpToAvailable,
  findNegativeField,
  computeNormaVremeni,
  applyTableEdits,
  sanitizeTableEdits,
  TIME_SETTINGS_DEFAULTS,
};
