// ГОСТ 10198-91, тип II-1: каркас щита (торцевого или бокового) - стойки,
// этажи и раскосины.
const { minCountBySpan, clearGapBySpan } = require('./logic');

const STOJKA_W = 100;   // ширина стойки
const MAX_AXIS = 800;   // шаг осей стоек
const MIN_ANGLE = 20, MAX_ANGLE = 60; // допустимый угол раскосины, °

// fillspace - ширина щита под стойки, panelH - высота щита, H - высота груза.
// Этажи: 2 при высоте груза больше 2000 мм или если на 1 этаже угол раскосины
// при 2 стойках больше 60°. Стоек - не меньше, чем по шагу осей 800 мм, и
// столько, чтобы угол раскосины был не меньше 20° (пока есть место).
// Возвращает { count, floors, len (длина стойки), sectionW, hasRaskosina,
// warn, tooNarrow }.
function buildFrame(fillspace, panelH, H) {
  const spacingMinCount = minCountBySpan(fillspace, STOJKA_W, MAX_AXIS);
  const sectionW = n => clearGapBySpan(fillspace, STOJKA_W, n);
  const angleDeg = (n, h) => Math.atan2(h, sectionW(n)) * 180 / Math.PI;
  const stojkaLen = fl => fl === 2 ? (panelH - 100 * 3) / 2 : panelH - 100 * 2;
  if (sectionW(2) <= 0) {
    return { count: 2, floors: 1, len: 0, sectionW: 0, hasRaskosina: false, warn: null, tooNarrow: true };
  }

  let floors = H > 2000 ? 2 : 1;
  if (floors === 1 && angleDeg(2, stojkaLen(1)) > MAX_ANGLE) floors = 2;
  const len = stojkaLen(floors);

  let warn = null;
  let angleCount = 2;
  if (len > 0) {
    while (sectionW(angleCount + 1) > 0 && angleDeg(angleCount, len) < MIN_ANGLE) angleCount++;
    if (angleDeg(angleCount, len) < MIN_ANGLE) {
      warn = `угол раскосины <20° даже при максимуме секций (${angleCount})`;
    }
  }

  const count = Math.max(angleCount, spacingMinCount);
  if (sectionW(count) <= 0) {
    return { count, floors, len: 0, sectionW: 0, hasRaskosina: false, warn: null, tooNarrow: true };
  }
  return { count, floors, len, sectionW: sectionW(count), hasRaskosina: len > 0, warn, tooNarrow: false };
}

module.exports = { buildFrame, STOJKA_W };
