// ГОСТ 10198-91, тип I-1: чертёж "Щит боковой". Вынесено из i1/diagrams.js
// в отдельный файл (по узлам - см. также torec.js, kryshka-dno.js).
const BOK_I1_2_IMG_B64  = "/images/bok_i1_2planks.jpg"; // натуральный размер 1178x876 (2 планки, без раскосины)
const BOK_I1_3_IMG_B64  = "/images/bok_i1_3planks.jpg"; // натуральный размер 1807x884 (3 планки, без раскосины)
const BOK_I1_4_IMG_B64  = "/images/bok_i1_4planks.jpg"; // натуральный размер 2208x834 (4 планки, без раскосины)
const BOK_I1_2R_IMG_B64 = "/images/bok_i1_2planks_1raskosina.jpg"; // натуральный размер 1141x891 (2 планки, 1 раскосина)
const BOK_I1_3R_IMG_B64 = "/images/bok_i1_3planks_2raskosina.jpg"; // натуральный размер 1812x909 (3 планки, 2 раскосины)
const BOK_I1_4R_IMG_B64 = "/images/bok_i1_4planks_3raskosina.jpg"; // натуральный размер 2212x790 (4 планки, 3 раскосины)
// X-образные раскосины (галочка xRaskosina) - те же картинки с отражённой
// раскосиной, спрятанной под исходной; калибровка та же (сгенерированы из
// исходных программно).
const BOK_I1_X_IMG = {
  '1_2': "/images/bok_i1_2planks_1raskosina_x.jpg",
  '1_3': "/images/bok_i1_3planks_2raskosina_x.jpg",
  '1_4': "/images/bok_i1_4planks_3raskosina_x.jpg",
};

// Калибровка по разметке, присланной пользователем для bok_i1_2planks.jpg
// (records с линиями/стрелками для варианта "2 планки, без раскосины") -
// перенесена на остальные 5 фото по аналогии (те же 4 группы стрелок:
// вертикальный размер, толщина у выступающего угла, отступ от края до
// крайней планки, длина доски), координаты которых у каждого фото свои:
// IW/IH - натуральный размер фото; stubL/stubR - центр крайней (не
// выступающей) вертикальной линии по краям щита; p1L - центр левого края
// первой планки; topY/botY - y верхней/нижней линии рамки щита.
//
// p1R/p2L - центр правого края первой планки и левого края второй планки
// (найдены по пиксельным данным самих фото - анализ построчного скана
// тёмных пикселей) - нужны для скобки "расстояние между соседними
// планками" (по запросу пользователя, см. diagramBokPhoto ниже).
//
// Эти же 6 фото и эта же калибровка переиспользуются для Крышки и Дна (по
// указанию пользователя, см. kryshka-dno.js) - у всех трёх деталей
// (Бок/Крышка/Дно) общая раскладка поясов планок (единый plankCount,
// единый edgeDist), поэтому отдельных фото под крышку/дно больше не нужно.
const BOK_I1_GEOM = {
  '0_2': {img: BOK_I1_2_IMG_B64,  IW:1178, IH:876, stubL:71.5, p1L:207.5, p1R:341.5, p2L:853.5, stubR:1123.5, topY:68.5, botY:786.5},
  '0_3': {img: BOK_I1_3_IMG_B64,  IW:1807, IH:884, stubL:55.5, p1L:190.5, p1R:324.5, p2L:836.5, stubR:1752.5, topY:73.5, botY:792.5},
  '0_4': {img: BOK_I1_4_IMG_B64,  IW:2208, IH:834, stubL:73.5, p1L:193.5, p1R:312.5, p2L:767.5, stubR:2153.5, topY:90.5, botY:728.5},
  '1_2': {img: BOK_I1_2R_IMG_B64, IW:1141, IH:891, stubL:32.5, p1L:168.5, p1R:302,   p2L:814,   stubR:1084.5, topY:89.5, botY:807.5},
  '1_3': {img: BOK_I1_3R_IMG_B64, IW:1812, IH:909, stubL:66.5, p1L:201.5, p1R:335,   p2L:847,   stubR:1763.5, topY:95.5, botY:814.5},
  '1_4': {img: BOK_I1_4R_IMG_B64, IW:2212, IH:790, stubL:68.5, p1L:188.5, p1R:307,   p2L:762,   stubR:2148.5, topY:69.5, botY:707.5},
};

// Единый масштаб всех чертежей I-1 (по запросу пользователя: раньше ширина
// у всех была одна - 260px (торец - 150px), а высота рамки щита на фото
// разная, поэтому Бок/Крышка/Дно на 2 планки выходили почти вдвое крупнее,
// чем на 4, а торец - то крупнее, то мельче бока). Теперь ширина каждого
// фото подбирается так, чтобы ВЫСОТА РАМКИ щита (topY..botY) на экране была
// одинаковой - I1_FRAME_PX - у всех вариантов (2/3/4 планки, с раскосиной и
// без) и у торца. Ширина планок на исходных фото тоже одинаковая (~120-134px
// при одинаковой высоте рамки), поэтому планки/доски на всех чертежах
// выглядят одного размера, а длина щита - пропорционально числу поясов.
// Слоты всех 4 чертежей объединены в data-size-group="i1-panels" (см.
// js/i1/calc-i1.js): если какому-то чертежу не хватает места и он сжимается, так же
// сжимаются и остальные - масштаб остаётся общим.
const I1_FRAME_PX = 84;
function i1DiagramWidth(IW, frameH){
  return Math.round(I1_FRAME_PX * IW / frameH);
}
// Толщина линий/стрелок на экране - как у обычного чертежа шириной
// DIAGRAM_DEFAULT_WIDTH, независимо от того, насколько узким/широким вышел
// конкретный чертёж (photoStrokeScale рассчитан на ширину 260px).
function i1StrokeScale(IW, widthPx){
  return photoStrokeScale(IW) * DIAGRAM_DEFAULT_WIDTH / widthPx;
}

// Расстояние между соседними планками - до десятых мм (middle/(count-1) не
// всегда целое: отступ от края округляется до целого мм, см. plankCount).
function fmtGapMm(v){
  return String(Math.round(v*10)/10);
}

// Чертёж по фото бокового щита - общий для Бока/Крышки/Дна (по уточнению
// пользователя): dimVal - вертикальный размер на фото (у Бока - высота
// груза H, у Крышки/Дна - ширина груза с учётом толщин стенок, см. вызовы
// в js/i1/calc-i1.js); plankTVal - толщина у выступающего верхнего левого
// угла первой планки (одна и та же для всех трёх - calc.wall.value, у
// типа I-1 единая толщина всех досок/планок/раскосов); edgeVal - отступ от
// края доски до кромки крайней планки; gapVal - расстояние между КРОМКАМИ
// соседних планок (calc.plankGap = plank.middle/(plankQty-1), ширина самих
// планок уже вычтена); partTitle - заголовок чертежа ("Щит боковой"/
// "Крышка"/"Дно").
//
// Все отступы подписей от рамки заданы в экранных пикселях (px - сколько
// единиц фото приходится на 1px при базовой ширине чертежа), а не в долях
// IW/IH, как раньше: при общем масштабе (см. I1_FRAME_PX) фото разной
// ширины рисуются с разным коэффициентом, и доли давали бы разные зазоры
// между подписями на разных вариантах.
function diagramBokPhoto(g, dimVal, plankTVal, edgeVal, gapVal, boardLenVal, partTitle){
  const IW = g.IW, IH = g.IH, topY = g.topY, botY = g.botY;
  const stubL = g.stubL, p1L = g.p1L, p1R = g.p1R, p2L = g.p2L, stubR = g.stubR;
  const widthPx = i1DiagramWidth(IW, botY - topY);
  const px = IW / widthPx;

  // Стрелка вертикального размера - у правого внешнего края щита (stubR, а
  // не у последней планки - там она уходила бы слишком далеко вправо, через
  // весь правый торцевой обрез щита), с небольшим отступом за кадр.
  const dimFarX = stubR + 20*px;
  const dblArrowX = stubR + 11*px;

  // Стрелка длины доски - над фото, от края до края щита.
  const topLineY = topY - 24*px;

  // Стрелка толщины - указывает на выступающий верхний левый угол первой
  // планки; подпись - в том же ряду, что и стрелка длины доски, слева.
  // Подпись длины доски - по центру щита, но не ближе 80px к подписи
  // толщины (на узких чертежах, напр. 2 планки, по центру они бы
  // наложились друг на друга).
  const thickTargetY = topY*0.67;
  const thickTailX = p1L - 12*px, thickTailY = topLineY;
  const lenLabelX = Math.max((stubL+stubR)/2, thickTailX + 80*px);

  // Нижнее поле под рамкой щита (снимки содержат запас по высоте специально
  // под скобки): на одном уровне bracketY - скобка "отступ от края до
  // крайней планки" (stubL..p1L) и двойная стрелка "расстояние между
  // соседними планками" (p1R..p2L, между кромками 1-го и 2-го пояса).
  // Подписи - под фото в два ряда: 1-й ряд - зазор между планками (прямо под
  // своей стрелкой), 2-й ряд - отступ от края (со сноской к своей скобке).
  // Раньше стрелка зазора стояла сверху, между рамкой и стрелкой длины
  // доски, и её подпись перекрывалась подписями толщины и длины доски - по
  // репорту пользователя.
  const bracketYStart = botY - 0.085*IH, bracketYEnd = IH;
  const bracketY = botY + 0.44*(IH-botY);
  const bracketMidX = (stubL+p1L)/2;
  const gapMidX = (p1R+p2L)/2;
  const gapLabelY = IH + 14*px;
  const edgeLabelX = stubL + 34*px, edgeLabelY = IH + 42*px;

  const dim = Math.round(dimVal);
  const plankT = Math.round(plankTVal);
  const edge = Math.round(edgeVal);
  const boardLen = Math.round(boardLenVal);

  const records = [
    {type:'line', x1:stubR, y1:topY, x2:dimFarX, y2:topY},
    {type:'line', x1:stubR, y1:botY, x2:dimFarX, y2:botY},
    {type:'double', x1:dblArrowX, y1:topY, x2:dblArrowX, y2:botY, lx:dblArrowX+2*px, ly:(topY+botY)/2, text: dim+' мм', vertical:true},

    {type:'single', x1:thickTailX, y1:thickTailY, x2:p1L, y2:thickTargetY, lx:thickTailX, ly:thickTailY, text: plankT+' мм'},

    {type:'line', x1:stubL, y1:topY, x2:stubL, y2:topLineY},
    {type:'line', x1:stubR, y1:topY, x2:stubR, y2:topLineY},
    {type:'double', x1:stubL, y1:topLineY, x2:stubR, y2:topLineY, lx:lenLabelX, ly:topLineY, text: boardLen+' мм'},

    {type:'line', x1:p1R, y1:bracketYStart, x2:p1R, y2:bracketYEnd},
    {type:'line', x1:p2L, y1:bracketYStart, x2:p2L, y2:bracketYEnd},
    {type:'double', x1:p1R, y1:bracketY, x2:p2L, y2:bracketY, lx:gapMidX, ly:gapLabelY, text: fmtGapMm(gapVal)+' мм'},

    {type:'line', x1:stubL, y1:bracketYStart, x2:stubL, y2:bracketYEnd},
    {type:'line', x1:p1L, y1:bracketYStart, x2:p1L, y2:bracketYEnd},
    {type:'line', x1:stubL, y1:bracketY, x2:p1L, y2:bracketY},
    {type:'single', x1:edgeLabelX, y1:edgeLabelY, x2:bracketMidX, y2:bracketY, lx:edgeLabelX, ly:edgeLabelY, text: edge+' мм'}
  ];

  return renderDiagram(g.img, partTitle + ' - схема расположения деталей', IW, IH, records, widthPx, i1StrokeScale(IW, widthPx));
}

// Фото есть только для 2-4 планок; для большего числа планок показываем
// чертёж с максимальным доступным (4) - предупреждение выводится отдельно
// на вызывающей стороне (см. js/i1/calc-i1.js).
function bokGeomKey(plankQty, hasRaskosinaVal){
  let n = plankQty;
  if(n < 2) n = 2;
  if(n > 4) n = 4;
  return (hasRaskosinaVal ? '1' : '0') + '_' + n;
}

function bokGeom(plankQty, hasRaskosinaVal, xRaskosinaVal){
  const key = bokGeomKey(plankQty, hasRaskosinaVal);
  const g = BOK_I1_GEOM[key];
  return (xRaskosinaVal && BOK_I1_X_IMG[key]) ? Object.assign({}, g, {img: BOK_I1_X_IMG[key]}) : g;
}

function diagramBokovoy(heightVal, plankTVal, edgeVal, gapVal, boardLenVal, plankQty, hasRaskosinaVal, xRaskosinaVal){
  return diagramBokPhoto(bokGeom(plankQty, hasRaskosinaVal, xRaskosinaVal), heightVal, plankTVal, edgeVal, gapVal, boardLenVal, 'Щит боковой');
}
