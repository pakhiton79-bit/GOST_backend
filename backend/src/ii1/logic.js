// ГОСТ 10198-91, тип II-1: формулы, специфичные для этого типа - серверный
// порт из src/ii1/logic.js исходного репозитория pakhiton79-bit/
// GOST_10198-91 (методика не менялась). Общие с типом I-3 таблицы/формулы
// (Табл.4/14/19, subfloorThicknessRaw, polozSection165, floorBoardThicknessNew -
// во фронтенде продублированы байт-в-байт "без изменений из уже проверенной
// реализации типа I-3", см. комментарии в исходном src/ii1/logic.js) здесь
// НЕ дублируются - переиспользуются напрямую из ../i3/data и ../i3/sections
// (см. require() в compute.js). endBeamSection - НЕ общая (диапазон явно
// продлён до 20000кг, в отличие от I-3, где верхняя граница - 5000кг) -
// осталась здесь, отдельно от i3/sections.js.

// Толщина досок обшивки (боковых/торцевых щитов и крышки) по массе груза.
// ЧЕРНОВАЯ таблица - официальную таблицу в тексте ГОСТ не нашли (по прямому
// указанию пользователя, временное решение). Верхняя граница диапазона
// (>600кг) в источнике не указана - применяется 25мм вплоть до 20000кг.
function skinThickness(mass) {
  if (mass <= 400) return 19;
  if (mass <= 600) return 22;
  return 25;
}

// Толщина и ширина стоек по массе груза и наружной высоте ящика (источник -
// "табл. 12"). Ширина всегда 100мм (во всех ячейках источника).
const T_STOJKI_HEIGHTS = [1000, 1500, 2000, 2500, 3000];
const TABLE_STOJKI = [
  { maxMass: 4000, t: [25, 25, 32, 32, 40] },
  { maxMass: 6000, t: [25, 25, 32, 40, 40] },
  { maxMass: 8000, t: [25, 32, 40, 40, 50] },
  { maxMass: 10000, t: [25, 32, 40, 50, 50] },
  { maxMass: 16000, t: [25, 40, 50, 50, 50] },
  { maxMass: 20000, t: [32, 40, 50, 50, 50] },
];
function stojkaSection(mass, outerHmm) {
  let exceeded = false;
  let row = TABLE_STOJKI.find(r => mass <= r.maxMass);
  if (!row) { row = TABLE_STOJKI[TABLE_STOJKI.length - 1]; exceeded = true; }
  let colIdx = T_STOJKI_HEIGHTS.findIndex(h => outerHmm <= h);
  if (colIdx === -1) { colIdx = T_STOJKI_HEIGHTS.length - 1; exceeded = true; }
  return { t: row.t[colIdx], w: 100, exceeded };
}

// Торцовый брус дна - толщина/ширина по массе груза. Диапазон в источнике
// этого типа явно продлён до 20000кг (в отличие от типа I-3, где верхняя
// граница явно не описана дальше 5000кг) - сечение по верхнему диапазону НЕ
// считается выходом за пределы применимости.
function endBeamSection(mass) {
  if (mass <= 1000) return { h: 44, w: 100, exceeded: false };
  if (mass <= 2000) return { h: 60, w: 100, exceeded: false };
  if (mass <= 3500) return { h: 75, w: 100, exceeded: false };
  if (mass <= 5000) return { h: 100, w: 100, exceeded: false };
  if (mass <= 20000) return { h: 125, w: 125, exceeded: false };
  return { h: 125, w: 125, exceeded: true };
}

// Общий принцип для ЛЮБОГО набора одинаковых брусков/стоек/полозьев,
// расставленных по одной оси с шагом между осями не более maxAxis: сами
// бруски - не точки, а тела шириной memberWidth, и КРАЙНИЕ из них не должны
// выступать наружным краем за пределы отведённого пространства space (тот же
// принцип, что и minSkidsByWidth162 для полозьев, п.1.6.2). Используется для
// стоек каркаса, а также по аналогии - для продольных брусьев крышки.
function minCountBySpan(space, memberWidth, maxAxis) {
  const span = Math.max(0, space - (memberWidth || 0));
  return Math.max(2, Math.ceil(span / maxAxis) + 1);
}
// Чистый просвет (без учёта самих осей) между соседними из `count`
// одинаковых элементов шириной memberWidth, равномерно расставленных в
// пространстве space.
function clearGapBySpan(space, memberWidth, count) {
  return (space - memberWidth * count) / (count - 1);
}

// Продольные брусья крышки (только режим "поперечное расположение досок") -
// по массе груза и расстоянию между осями поперечных брусьев крышки; строка
// выбирается по фактическому расстоянию между осями САМИХ продольных
// брусьев (≤750 / >750). "25x75, либо 25x100 при включённой «Округлить
// ширину досок»" - трактовка по уточнению пользователя.
const T_LONGBEAM_CROSS = [500, 600, 700, 800, 900, 1000];
const TABLE_LONGBEAM = [
  { maxAxis: 750, t: [25, 25, 32, 32, 32, 40], wRoundOverride: 100, wRoundBase: 75 },
  { maxAxis: Infinity, t: [25, 32, 32, 32, 40, 40] },
];
function longBeamSection(crossBeamAxisMm, roundBoardWidths, axisSpacingMm) {
  let colIdx = T_LONGBEAM_CROSS.findIndex(v => crossBeamAxisMm <= v);
  let exceeded = false;
  if (colIdx === -1) { colIdx = T_LONGBEAM_CROSS.length - 1; exceeded = true; }
  const row = axisSpacingMm <= 750 ? TABLE_LONGBEAM[0] : TABLE_LONGBEAM[1];
  let w = 100;
  if (row.wRoundOverride && colIdx === 0) {
    w = roundBoardWidths ? row.wRoundOverride : row.wRoundBase;
  }
  return { t: row.t[colIdx], w, exceeded };
}

module.exports = {
  skinThickness, stojkaSection, endBeamSection,
  minCountBySpan, clearGapBySpan, longBeamSection,
};
