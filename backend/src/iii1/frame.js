// ГОСТ 10198-91, тип III-1: каркас щита (торцевого или бокового) - стойки,
// этажи и раскосы.
const { minCountByClearGap, clearGapBySpan } = require('./logic');

const STOJKA_W = 100;   // ширина стойки
const MAX_CLEAR_GAP = 800;   // просвет между краями соседних стоек (по указанию пользователя)
const MIN_ANGLE = 20, MAX_ANGLE = 60; // допустимый угол раскоса, ° (п.1.7.7)
const RASKOSINA_MIN_H = 600;  // п.1.7.7: раскосы - при внутренней высоте ящика свыше 600 мм
const TWO_FLOORS_H = 2000;    // п.1.6.16: средние продольные брусья - при внутренней высоте 2000 мм и более

// fillspace - ширина щита под стойки, panelH - высота каркаса щита (высота
// груза без бруса крышки над щитом), H - высота груза (внутренняя высота
// ящика), beamW - ширина горизонтальных брусьев.
// Стойка: 1 этаж - panelH без 2 горизонтальных брусьев, 2 этажа - без 3,
// пополам.
// Раскосы - при H свыше 600 мм или по галочке «Добавить раскосины»
// (forceRaskosina). Этажи: 2 при H от 2000 мм или если на 1 этаже угол
// раскоса при 2 стойках больше 60°. Стоек - не меньше, чем по просвету
// между краями 800 мм, и (при раскосах) столько, чтобы угол раскоса был не
// меньше 20° (пока есть место). manualCount - число стоек, заданное вручную: крайние -
// по краям щита, остальные равномерно между ними; не помещаются -
// sectionW ≤ 0 (проверяет compute.js).
// Возвращает { count, floors, len (длина стойки), sectionW, hasRaskosina,
// warn, tooNarrow }.
function buildFrame(fillspace, panelH, H, beamW, forceRaskosina, manualCount) {
  const spacingMinCount = minCountByClearGap(fillspace, STOJKA_W, MAX_CLEAR_GAP);
  const sectionW = n => clearGapBySpan(fillspace, STOJKA_W, n);
  const angleDeg = (n, h) => Math.atan2(h, sectionW(n)) * 180 / Math.PI;
  const stojkaLen = fl => fl === 2 ? (panelH - beamW * 3) / 2 : panelH - beamW * 2;
  if (sectionW(2) <= 0) {
    return { count: 2, floors: 1, len: 0, sectionW: 0, hasRaskosina: false, warn: null, tooNarrow: true };
  }

  const needRaskosina = H > RASKOSINA_MIN_H || !!forceRaskosina;
  let floors = H >= TWO_FLOORS_H ? 2 : 1;
  if (needRaskosina && floors === 1 && angleDeg(2, stojkaLen(1)) > MAX_ANGLE) floors = 2;
  const len = stojkaLen(floors);
  const hasRaskosina = needRaskosina && len > 0;

  if (manualCount > 0) {
    const count = Math.max(2, Math.round(manualCount));
    return { count, floors, len, sectionW: sectionW(count), hasRaskosina, warn: null, tooNarrow: false };
  }

  let warn = null;
  let angleCount = 2;
  if (hasRaskosina) {
    while (sectionW(angleCount + 1) > 0 && angleDeg(angleCount, len) < MIN_ANGLE) angleCount++;
    if (angleDeg(angleCount, len) < MIN_ANGLE) {
      warn = `угол раскоса <20° даже при максимуме секций (${angleCount})`;
    }
  }

  const count = Math.max(angleCount, spacingMinCount);
  if (sectionW(count) <= 0) {
    return { count, floors, len: 0, sectionW: 0, hasRaskosina: false, warn: null, tooNarrow: true };
  }
  return { count, floors, len, sectionW: sectionW(count), hasRaskosina, warn, tooNarrow: false };
}

// Угол раскоса к горизонтали, °.
function frameAngleDeg(frame) {
  return Math.atan2(frame.len, frame.sectionW) * 180 / Math.PI;
}

// Текст «N стоек не помещаются»: «21 стойка не помещается», «3 стойки не
// помещаются», «5 стоек не помещаются».
function tooManyPostsText(n) {
  const n10 = n % 10, n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return `${n} стойка не помещается`;
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return `${n} стойки не помещаются`;
  return `${n} стоек не помещаются`;
}

module.exports = { buildFrame, frameAngleDeg, tooManyPostsText, STOJKA_W, MIN_ANGLE, MAX_ANGLE };
