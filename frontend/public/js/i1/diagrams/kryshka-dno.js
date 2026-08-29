// ГОСТ 10198-91, тип I-1: чертежи "Крышка" и "Дно" (общий чертёж -
// конструкция одинаковая, только своя ширина и своя раскосина передаются
// при вызове). Вынесено из i1/diagrams.js в отдельный файл (по узлам - см.
// также torec.js, bokovoy.js).
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
  // на вызывающей стороне (см. js/i1/calc-i1.js).
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
