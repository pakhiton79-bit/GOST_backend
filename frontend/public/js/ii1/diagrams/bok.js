// ГОСТ 10198-91, тип II-1: чертёж «Щит боковой». Перенесено из
// src/ii1/diagrams.js исходного репозитория pakhiton79-bit/GOST_10198-91.
// Чертёж бокового щита переиспользует фото и разметку линий/стрелок Щита
// торцевого (TOREC_VARIANTS, см. torec.js) один в один - по прямому указанию
// пользователя (свои фото бока со своей раскладкой были ошибкой). Разница -
// только в значениях, которые подставляются в подписи: у бока во 2-й параметр
// (тот, что у торца называется widthVal) идёт lengthVal - длина груза L, а не
// W+t_stojka*2 (по уточнению пользователя - горизонтальный брус бока
// численно равен L, см. k43 в src/ii1/compute.js). Остальные параметры
// (longbeamVal, skinVal, heightVal, floorHeightVal) - те же самые величины,
// что и у торца (bokFrame.floors/.len совпадают с torecFrame.floors/.len -
// обе рамы строятся от одной и той же общей высоты панели). Схема - та же,
// что у торца (panelScheme в torec.js: фото на 2-4 стойки, на 5 и более -
// сгенерированный чертёж). gapVal - расстояние между стойками бока
// (bokFrame.sectionW), см. postGapRecords в torec.js.
// oporaW - ширина опорной планки, мм (из таблицы бока; 0 - не рисуется).
function diagramBok(count, floors, longbeamVal, lengthVal, skinVal, heightVal, floorHeightVal, widthPxOverride, labelScale, xRaskosinaVal, gapVal, hasRaskosinaVal, oporaW){
  const v = panelScheme(count, floors, xRaskosinaVal, hasRaskosinaVal);
  if(!v) return diagramTooDense();
  const records = v.records(dimLabel(longbeamVal), dimLabel(lengthVal), dimLabel(skinVal), dimLabel(heightVal), dimLabel(floorHeightVal))
    .concat(postGapRecords(v, gapVal, widthPxOverride, labelScale));
  // Узкое фото (2 стойки) - подпись левее, иначе наезжает на подпись
  // толщины продольного бруса справа.
  if(oporaW > 0) records.unshift(...oporaRecords(v.IW, v.topBar[1], v.topBar[2], v.topBar[0], v.gap.secTop, oporaW, v.IW < 1200 ? 0.3 : 0.5));
  return renderDiagram(v.img, 'Щит боковой - схема расположения деталей', v.IW, v.IH, records, widthPxOverride, photoStrokeScale(v.IW), labelScale);
}
