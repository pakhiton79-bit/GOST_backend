// Общий вид ящика (изометрия) - для блока "Итог" на экране и в печати,
// по аналогии с типом I-3 (BOX_IMG_B64 в src/app.js).
const BOX_I1_IMG_B64 = "/images/box_i1.jpg";

// ГОСТ 10198-91, тип I-1: чертежи расположения деталей. Щит торцевой
// полностью совпадает по конструкции с торцом типа I-3 (вариант без
// раскосины и с 1 раскосиной - у типа I-1 их бывает не больше одной),
// поэтому переиспользует готовые чертежи типа I-3
// (diagramPlaceholder/diagramEndPanel1Raskosina/diagramEndPanelNoRaskosina -
// см. src/common-diagrams.js). Ширина торца передаётся своя (I1_TOREC_WIDTH),
// меньше, чем у типа I-3 (210px) - у остальных чертежей I-1 (Дно/Крышка/Бок,
// см. diagramKryshkaDnoPhoto/diagramBokovoyPhoto ниже) фото широкие и
// "приземистые", а у торца - почти квадратное, и при том же 210px оно на их
// фоне выглядело непропорционально крупным.
const I1_TOREC_WIDTH = 150;
function diagramTorec(heightVal, widthVal, hasRaskosinaVal){
  return hasRaskosinaVal
    ? diagramEndPanel1Raskosina(heightVal, widthVal, I1_TOREC_WIDTH)
    : diagramEndPanelNoRaskosina(heightVal, widthVal, I1_TOREC_WIDTH);
}

const BOK_I1_2_IMG_B64  = "/images/bok_i1_2planks.jpg"; // натуральный размер 1178x876 (2 планки, без раскосины)
const BOK_I1_3_IMG_B64  = "/images/bok_i1_3planks.jpg"; // натуральный размер 1807x884 (3 планки, без раскосины)
const BOK_I1_4_IMG_B64  = "/images/bok_i1_4planks.jpg"; // натуральный размер 2208x834 (4 планки, без раскосины)
const BOK_I1_2R_IMG_B64 = "/images/bok_i1_2planks_1raskosina.jpg"; // натуральный размер 1141x891 (2 планки, 1 раскосина)
const BOK_I1_3R_IMG_B64 = "/images/bok_i1_3planks_2raskosina.jpg"; // натуральный размер 1812x909 (3 планки, 2 раскосины)
const BOK_I1_4R_IMG_B64 = "/images/bok_i1_4planks_3raskosina.jpg"; // натуральный размер 2212x790 (4 планки, 3 раскосины)

// Калибровка по разметке, присланной пользователем для bok_i1_2planks.jpg
// (records с линиями/стрелками для варианта "2 планки, без раскосины") -
// перенесена на остальные 5 фото по аналогии (те же 4 группы стрелок:
// высота груза, толщина планки, отступ от края до крайней планки, длина
// доски), координаты которых у каждого фото свои: IW/IH - натуральный размер
// фото; stubL/stubR - центр крайней (не выступающей) вертикальной линии по
// краям щита; p1L - центр левого края первой планки; topY/botY - y верхней/
// нижней линии рамки щита.
const BOK_I1_GEOM = {
  '0_2': {img: BOK_I1_2_IMG_B64,  IW:1178, IH:876, stubL:71.5, p1L:207.5, stubR:1123.5, topY:68.5, botY:786.5},
  '0_3': {img: BOK_I1_3_IMG_B64,  IW:1807, IH:884, stubL:55.5, p1L:190.5, stubR:1752.5, topY:73.5, botY:792.5},
  '0_4': {img: BOK_I1_4_IMG_B64,  IW:2208, IH:834, stubL:73.5, p1L:193.5, stubR:2153.5, topY:90.5, botY:728.5},
  '1_2': {img: BOK_I1_2R_IMG_B64, IW:1141, IH:891, stubL:32.5, p1L:168.5, stubR:1084.5, topY:89.5, botY:807.5},
  '1_3': {img: BOK_I1_3R_IMG_B64, IW:1812, IH:909, stubL:66.5, p1L:201.5, stubR:1763.5, topY:95.5, botY:814.5},
  '1_4': {img: BOK_I1_4R_IMG_B64, IW:2212, IH:790, stubL:68.5, p1L:188.5, stubR:2148.5, topY:69.5, botY:707.5},
};

function diagramBokovoyPhoto(g, heightVal, plankTVal, edgeVal, boardLenVal){
  const IW = g.IW, IH = g.IH, topY = g.topY, botY = g.botY;
  const stubL = g.stubL, p1L = g.p1L, stubR = g.stubR;

  // Стрелка высоты груза - у правого внешнего края щита (stubR, а не у
  // последней планки - там она уходила бы слишком далеко вправо, через
  // весь правый торцевой обрез щита), с небольшим отступом за кадр.
  const extOffset = 0.09*IW;
  const heightFarX = stubR + extOffset;
  const dblArrowX = stubR + extOffset*0.55;

  // Стрелка длины доски - над фото, от края до края щита.
  const topLineY = -0.10*IH;

  // Стрелка толщины планки - указывает на выступающий верхний левый угол
  // первой планки; идёт сверху, в той же зоне, что и стрелка длины доски
  // (а не слева от кадра, как раньше) - иначе под неё резервируется
  // большой отступ слева, и весь чертёж визуально уезжает вправо от
  // заголовка секции.
  const thickTargetY = topY*0.67;
  const thickTailX = p1L - 0.03*IW, thickTailY = topLineY;

  // Скобка "отступ от края до крайней планки" - в поле под фото (снимки
  // содержат запас по высоте под рамкой щита специально под эту скобку).
  const bracketYStart = botY - 0.085*IH, bracketYEnd = IH;
  const bracketY = botY + 0.44*(IH-botY);
  const bracketMidX = (stubL+p1L)/2;
  const edgeTailX = 0.420*IW, edgeTailY = 1.17*IH;
  const edgeLabelX = 0.497*IW, edgeLabelY = 1.194*IH;

  const height = Math.round(heightVal);
  const plankT = Math.round(plankTVal);
  const edge = Math.round(edgeVal);
  const boardLen = Math.round(boardLenVal);

  const records = [
    {type:'line', x1:stubR, y1:topY, x2:heightFarX, y2:topY},
    {type:'line', x1:stubR, y1:botY, x2:heightFarX, y2:botY},
    {type:'double', x1:dblArrowX, y1:topY, x2:dblArrowX, y2:botY, lx:dblArrowX+7, ly:(topY+botY)/2, text: height+' мм', vertical:true},

    {type:'single', x1:thickTailX, y1:thickTailY, x2:p1L, y2:thickTargetY, lx:thickTailX, ly:thickTailY+20, text: plankT+' мм'},

    {type:'line', x1:stubL, y1:bracketYStart, x2:stubL, y2:bracketYEnd},
    {type:'line', x1:p1L, y1:bracketYStart, x2:p1L, y2:bracketYEnd},
    {type:'line', x1:stubL, y1:bracketY, x2:p1L, y2:bracketY},
    {type:'single', x1:edgeTailX, y1:edgeTailY, x2:bracketMidX, y2:bracketY, lx:edgeLabelX, ly:edgeLabelY, text: edge+' мм'},

    {type:'line', x1:stubL, y1:topY, x2:stubL, y2:topLineY},
    {type:'line', x1:stubR, y1:topY, x2:stubR, y2:topLineY},
    {type:'double', x1:stubL, y1:topLineY, x2:stubR, y2:topLineY, lx:(stubL+stubR)/2, ly:topLineY-10, text: boardLen+' мм'}
  ];

  return renderDiagram(g.img, 'Щит боковой - схема расположения деталей', IW, IH, records, null, photoStrokeScale(IW));
}

function diagramBokovoy(heightVal, plankTVal, edgeVal, boardLenVal, plankQty, hasRaskosinaVal){
  // Фото есть только для 2-4 планок; для большего числа планок показываем
  // чертёж с максимальным доступным (4) - предупреждение выводится отдельно
  // на вызывающей стороне (см. src/i1/calc.js).
  let n = plankQty;
  if(n < 2) n = 2;
  if(n > 4) n = 4;
  const key = (hasRaskosinaVal ? '1' : '0') + '_' + n;
  return diagramBokovoyPhoto(BOK_I1_GEOM[key], heightVal, plankTVal, edgeVal, boardLenVal);
}

// --- Крышка / Дно (общий чертёж - конструкция одинаковая, только своя
// ширина и своя раскосина передаются при вызове) ---

const KD_I1_2_IMG_B64  = "/images/kryshkadno_i1_2planks.jpg"; // натуральный размер 1194x778 (2 планки, без раскосины)
const KD_I1_3_IMG_B64  = "/images/kryshkadno_i1_3planks.jpg"; // натуральный размер 1769x772 (3 планки, без раскосины)
const KD_I1_4_IMG_B64  = "/images/kryshkadno_i1_4planks.jpg"; // натуральный размер 2174x728 (4 планки, без раскосины)
const KD_I1_2R_IMG_B64 = "/images/kryshkadno_i1_2planks_1raskosina.jpg"; // натуральный размер 1100x758 (2 планки, 1 раскосина)
const KD_I1_3R_IMG_B64 = "/images/kryshkadno_i1_3planks_2raskosina.jpg"; // натуральный размер 1744x780 (3 планки, 2 раскосины)
const KD_I1_4R_IMG_B64 = "/images/kryshkadno_i1_4planks_3raskosina.jpg"; // натуральный размер 2150x710 (4 планки, 3 раскосины)

// Калибровка по разметке, присланной пользователем для kryshkadno_i1_2planks_1raskosina.jpg
// (records для варианта "2 планки, 1 раскосина") - перенесена на остальные
// 5 фото по аналогии. В отличие от бокового щита, планки здесь НЕ выступают
// за рамку (единый y-диапазон top_y..bot_y у всех вертикальных линий).
const KD_I1_GEOM = {
  '0_2': {img: KD_I1_2_IMG_B64,  IW:1194, IH:778, stubL:83.5, p1L:219.5, stubR:1135.5, topY:24.5, botY:742.5},
  '0_3': {img: KD_I1_3_IMG_B64,  IW:1769, IH:772, stubL:38.5, p1L:173.5, stubR:1735.5, topY:42.5, botY:761.5},
  '0_4': {img: KD_I1_4_IMG_B64,  IW:2174, IH:728, stubL:62.5, p1L:182.5, stubR:2142.5, topY:48.5, botY:686.5},
  '1_2': {img: KD_I1_2R_IMG_B64, IW:1100, IH:758, stubL:37.5, p1L:173.5, stubR:1089.5, topY:21.5, botY:739.5},
  '1_3': {img: KD_I1_3R_IMG_B64, IW:1744, IH:780, stubL:28.5, p1L:163.5, stubR:1725.5, topY:47.5, botY:766.5},
  '1_4': {img: KD_I1_4R_IMG_B64, IW:2150, IH:710, stubL:38.5, p1L:158.5, stubR:2118.5, topY:37.5, botY:675.5},
};

function diagramKryshkaDnoPhoto(g, widthVal, boardLenVal, edgeVal){
  const IW = g.IW, IH = g.IH, topY = g.topY, botY = g.botY;
  const stubL = g.stubL, p1L = g.p1L, stubR = g.stubR;

  // Стрелка ширины - у правого внешнего края щита (stubR), с небольшим
  // отступом за кадр (тот же приём, что и у высоты бокового щита - см.
  // diagramBokovoyPhoto, там же объяснение, почему не у последней планки).
  const extOffset = 0.09*IW;
  const widthFarX = stubR + extOffset;
  const dblArrowX = stubR + extOffset*0.55;

  // Скобка "отступ от края до крайней планки" - над фото.
  const edgeBracketY = topY + 0.1332*IH;
  const edgeBracketMidX = (stubL+p1L)/2;
  const edgeTailX = 0.1009*IW, edgeTailY = -0.1847*IH;
  const edgeLabelX = edgeTailX, edgeLabelY = -0.1861*IH;

  // Скобка "длина доски крышки/дна" - под фото, от края до края щита.
  const lenBracketYStart = botY - 0.1761*IH, lenBracketYEnd = 1.1741*IH;
  const lenArrowY = 1.1253*IH;
  const lenLabelY = 1.1359*IH;

  const width = Math.round(widthVal);
  const boardLen = Math.round(boardLenVal);
  const edge = Math.round(edgeVal);

  const records = [
    {type:'line', x1:stubR, y1:topY, x2:widthFarX, y2:topY},
    {type:'line', x1:stubR, y1:botY, x2:widthFarX, y2:botY},
    {type:'double', x1:dblArrowX, y1:topY, x2:dblArrowX, y2:botY, lx:dblArrowX+7, ly:(topY+botY)/2, text: width+' мм', vertical:true},

    {type:'line', x1:stubL, y1:edgeBracketY, x2:p1L, y2:edgeBracketY},
    {type:'single', x1:edgeTailX, y1:edgeTailY, x2:edgeBracketMidX, y2:edgeBracketY, lx:edgeLabelX, ly:edgeLabelY, text: edge+' мм'},

    {type:'line', x1:stubL, y1:lenBracketYStart, x2:stubL, y2:lenBracketYEnd},
    {type:'line', x1:stubR, y1:lenBracketYStart, x2:stubR, y2:lenBracketYEnd},
    {type:'double', x1:stubL, y1:lenArrowY, x2:stubR, y2:lenArrowY, lx:(stubL+stubR)/2, ly:lenLabelY, text: boardLen+' мм'}
  ];

  return renderDiagram(g.img, 'Крышка/Дно - схема расположения деталей', IW, IH, records, null, photoStrokeScale(IW));
}

function diagramKryshkaDno(widthVal, boardLenVal, edgeVal, plankQty, hasRaskosinaVal){
  // Фото есть только для 2-4 планок; для большего числа планок показываем
  // чертёж с максимальным доступным (4) - предупреждение выводится отдельно
  // на вызывающей стороне (см. src/i1/calc.js).
  let n = plankQty;
  if(n < 2) n = 2;
  if(n > 4) n = 4;
  const key = (hasRaskosinaVal ? '1' : '0') + '_' + n;
  return diagramKryshkaDnoPhoto(KD_I1_GEOM[key], widthVal, boardLenVal, edgeVal);
}
function diagramKryshka(widthVal, boardLenVal, edgeVal, plankQty, hasRaskosinaVal){
  return diagramKryshkaDno(widthVal, boardLenVal, edgeVal, plankQty, hasRaskosinaVal);
}
function diagramDno(widthVal, boardLenVal, edgeVal, plankQty, hasRaskosinaVal){
  return diagramKryshkaDno(widthVal, boardLenVal, edgeVal, plankQty, hasRaskosinaVal);
}
