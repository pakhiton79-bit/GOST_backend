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
// обе рамы строятся от одной и той же общей высоты панели). Подбор схемы
// (какое фото - 2/3/4 стойки, 1/2 этажа - показать при расчётном количестве
// стоек бока) не менялся - тот же приём, что и раньше (nearestBokVariant),
// просто теперь ищет вариант среди TOREC_VARIANTS.
function diagramBok(count, floors, longbeamVal, lengthVal, skinVal, heightVal, floorHeightVal, widthPxOverride, labelScale){
  const variant = nearestBokVariant(count, floors);
  const v = TOREC_VARIANTS[variant.floors][variant.count];
  const records = v.records(dimLabel(longbeamVal), dimLabel(lengthVal), dimLabel(skinVal), dimLabel(heightVal), dimLabel(floorHeightVal));
  return renderDiagram(v.img, 'Щит боковой - схема расположения деталей', v.IW, v.IH, records, widthPxOverride, photoStrokeScale(v.IW), labelScale);
}

// Тот же приём, что и у nearestTorecVariant (сперва ближайшая доступная
// этажность, затем ближайшее число стоек внутри неё) - ищет среди
// TOREC_VARIANTS, т.к. чертёж бока переиспользует фото торца (см. diagramBok
// выше). Раньше искала среди отдельной BOK_VARIANTS (свои фото бока,
// удалены) - структура доступных ключей (этажи/стойки) была идентична
// TOREC_VARIANTS, так что сам подбор не изменился.
function nearestBokVariant(count, floors){
  const floorsAvailable = Object.keys(TOREC_VARIANTS).map(Number);
  const bestFloors = floorsAvailable.includes(floors) ? floors
    : floorsAvailable.reduce((a,b)=> Math.abs(b-floors)<Math.abs(a-floors) ? b : a);
  const countOptions = Object.keys(TOREC_VARIANTS[bestFloors]).map(Number);
  const bestCount = countOptions.reduce((a,b)=> Math.abs(b-count)<Math.abs(a-count) ? b : a);
  return {count: bestCount, floors: bestFloors, exact: bestCount===count && bestFloors===floors};
}
