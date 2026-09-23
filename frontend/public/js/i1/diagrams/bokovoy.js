// ГОСТ 10198-91, тип I-1: чертёж "Щит боковой". Вынесено из i1/diagrams.js
// в отдельный файл (по узлам - см. также torec.js, kryshka-dno.js).
const BOK_I1_2_IMG_B64  = "/images/bok_i1_2planks.jpg"; // натуральный размер 1178x876 (2 планки, без раскосины)
const BOK_I1_3_IMG_B64  = "/images/bok_i1_3planks.jpg"; // натуральный размер 1807x884 (3 планки, без раскосины)
const BOK_I1_4_IMG_B64  = "/images/bok_i1_4planks.jpg"; // натуральный размер 2208x834 (4 планки, без раскосины)
const BOK_I1_2R_IMG_B64 = "/images/bok_i1_2planks_1raskosina.jpg"; // натуральный размер 1141x891 (2 планки, 1 раскосина)
const BOK_I1_3R_IMG_B64 = "/images/bok_i1_3planks_2raskosina.jpg"; // натуральный размер 1812x909 (3 планки, 2 раскосины)
const BOK_I1_4R_IMG_B64 = "/images/bok_i1_4planks_3raskosina.jpg"; // натуральный размер 2212x790 (4 планки, 3 раскосины)

// Калибровка по разметке, присланной пользователем для bok_i1_2planks.jpg
// (records с линиями/стрелками для варианта "2 планки, без раскосины") -
// перенесена на остальные 5 фото по аналогии (те же 4 группы стрелок:
// вертикальный размер, толщина у выступающего угла, отступ от края до
// крайней планки, длина доски), координаты которых у каждого фото свои:
// IW/IH - натуральный размер фото; stubL/stubR - центр крайней (не
// выступающей) вертикальной линии по краям щита; p1L - центр левого края
// первой планки; topY/botY - y верхней/нижней линии рамки щита.
//
// Эти же 6 фото и эта же калибровка переиспользуются для Крышки и Дна (по
// указанию пользователя, см. kryshka-dno.js) - у всех трёх деталей
// (Бок/Крышка/Дно) общая раскладка поясов планок (единый plankCount,
// единый edgeDist), поэтому отдельных фото под крышку/дно больше не нужно.
const BOK_I1_GEOM = {
  '0_2': {img: BOK_I1_2_IMG_B64,  IW:1178, IH:876, stubL:71.5, p1L:207.5, stubR:1123.5, topY:68.5, botY:786.5},
  '0_3': {img: BOK_I1_3_IMG_B64,  IW:1807, IH:884, stubL:55.5, p1L:190.5, stubR:1752.5, topY:73.5, botY:792.5},
  '0_4': {img: BOK_I1_4_IMG_B64,  IW:2208, IH:834, stubL:73.5, p1L:193.5, stubR:2153.5, topY:90.5, botY:728.5},
  '1_2': {img: BOK_I1_2R_IMG_B64, IW:1141, IH:891, stubL:32.5, p1L:168.5, stubR:1084.5, topY:89.5, botY:807.5},
  '1_3': {img: BOK_I1_3R_IMG_B64, IW:1812, IH:909, stubL:66.5, p1L:201.5, stubR:1763.5, topY:95.5, botY:814.5},
  '1_4': {img: BOK_I1_4R_IMG_B64, IW:2212, IH:790, stubL:68.5, p1L:188.5, stubR:2148.5, topY:69.5, botY:707.5},
};

// Чертёж по фото бокового щита - общий для Бока/Крышки/Дна (по уточнению
// пользователя): dimVal - вертикальный размер на фото (у Бока - высота
// груза H, у Крышки/Дна - ширина груза с учётом толщин стенок, см. вызовы
// в js/i1/calc-i1.js); plankTVal - толщина у выступающего верхнего левого
// угла первой планки (одна и та же для всех трёх - calc.wall.value, у
// типа I-1 единая толщина всех досок/планок/раскосов); partTitle -
// заголовок чертежа ("Щит боковой"/"Крышка"/"Дно").
function diagramBokPhoto(g, dimVal, plankTVal, edgeVal, boardLenVal, partTitle){
  const IW = g.IW, IH = g.IH, topY = g.topY, botY = g.botY;
  const stubL = g.stubL, p1L = g.p1L, stubR = g.stubR;

  // Стрелка вертикального размера - у правого внешнего края щита (stubR, а
  // не у последней планки - там она уходила бы слишком далеко вправо, через
  // весь правый торцевой обрез щита), с небольшим отступом за кадр.
  const extOffset = 0.09*IW;
  const dimFarX = stubR + extOffset;
  const dblArrowX = stubR + extOffset*0.55;

  // Стрелка длины доски - над фото, от края до края щита.
  const topLineY = -0.10*IH;

  // Стрелка толщины - указывает на выступающий верхний левый угол первой
  // планки; идёт сверху, в той же зоне, что и стрелка длины доски (а не
  // слева от кадра, как раньше) - иначе под неё резервируется большой
  // отступ слева, и весь чертёж визуально уезжает вправо от заголовка
  // секции.
  const thickTargetY = topY*0.67;
  const thickTailX = p1L - 0.03*IW, thickTailY = topLineY;

  // Скобка "отступ от края до крайней планки" - в поле под фото (снимки
  // содержат запас по высоте под рамкой щита специально под эту скобку).
  const bracketYStart = botY - 0.085*IH, bracketYEnd = IH;
  const bracketY = botY + 0.44*(IH-botY);
  const bracketMidX = (stubL+p1L)/2;
  const edgeTailX = 0.420*IW, edgeTailY = 1.17*IH;
  const edgeLabelX = 0.497*IW, edgeLabelY = 1.194*IH;

  const dim = Math.round(dimVal);
  const plankT = Math.round(plankTVal);
  const edge = Math.round(edgeVal);
  const boardLen = Math.round(boardLenVal);

  const records = [
    {type:'line', x1:stubR, y1:topY, x2:dimFarX, y2:topY},
    {type:'line', x1:stubR, y1:botY, x2:dimFarX, y2:botY},
    {type:'double', x1:dblArrowX, y1:topY, x2:dblArrowX, y2:botY, lx:dblArrowX+7, ly:(topY+botY)/2, text: dim+' мм', vertical:true},

    {type:'single', x1:thickTailX, y1:thickTailY, x2:p1L, y2:thickTargetY, lx:thickTailX, ly:thickTailY+20, text: plankT+' мм'},

    {type:'line', x1:stubL, y1:bracketYStart, x2:stubL, y2:bracketYEnd},
    {type:'line', x1:p1L, y1:bracketYStart, x2:p1L, y2:bracketYEnd},
    {type:'line', x1:stubL, y1:bracketY, x2:p1L, y2:bracketY},
    {type:'single', x1:edgeTailX, y1:edgeTailY, x2:bracketMidX, y2:bracketY, lx:edgeLabelX, ly:edgeLabelY, text: edge+' мм'},

    {type:'line', x1:stubL, y1:topY, x2:stubL, y2:topLineY},
    {type:'line', x1:stubR, y1:topY, x2:stubR, y2:topLineY},
    {type:'double', x1:stubL, y1:topLineY, x2:stubR, y2:topLineY, lx:(stubL+stubR)/2, ly:topLineY-10, text: boardLen+' мм'}
  ];

  return renderDiagram(g.img, partTitle + ' - схема расположения деталей', IW, IH, records, null, photoStrokeScale(IW));
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

function diagramBokovoy(heightVal, plankTVal, edgeVal, boardLenVal, plankQty, hasRaskosinaVal){
  return diagramBokPhoto(BOK_I1_GEOM[bokGeomKey(plankQty, hasRaskosinaVal)], heightVal, plankTVal, edgeVal, boardLenVal, 'Щит боковой');
}
