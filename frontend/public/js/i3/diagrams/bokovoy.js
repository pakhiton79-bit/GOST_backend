// ГОСТ 10198-91, тип I-3: чертёж «Щит боковой». Фото - на 2-4 планки (1 этаж
// с раскосинами и без, 2 этажа); с X-образными раскосинами или больше 4
// планок - генерируется (diagramBokovoyGen).
const BOKOVOY_2P_0R_IMG_B64 = "/images/bokovoy_2p_0r.jpg"; // натуральный размер 855x713 (2 планки, без раскосины)
const BOKOVOY_2P_1R_IMG_B64 = "/images/bokovoy_2p_1r.jpg"; // натуральный размер 874x733 (2 планки, 1 раскосина)
const BOKOVOY_3P_0R_IMG_B64 = "/images/bokovoy_3p_0r.jpg"; // натуральный размер 1390x752 (3 планки, без раскосины)
const BOKOVOY_3P_2R_IMG_B64 = "/images/bokovoy_3p_2r.jpg"; // натуральный размер 1418x781 (3 планки, 2 раскосины)
const BOKOVOY_4P_0R_IMG_B64 = "/images/bokovoy_4p_0r.jpg"; // натуральный размер 1900x778 (4 планки, без раскосины)
const BOKOVOY_4P_3R_IMG_B64 = "/images/bokovoy_4p_3r.jpg"; // натуральный размер 1877x746 (4 планки, 3 раскосины)

// 2 этажа: та же логика подбора по числу планок (число раскосин = (планок-1)*2,
// т.к. раскосина ставится на каждую секцию на каждом из двух этажей).
const BOKOVOY_2FL_2P_IMG_B64 = "/images/bokovoy_2fl_2r.jpg"; // натуральный размер 966x1361 (2 этажа, 2 планки, 2 раскосины)
const BOKOVOY_2FL_3P_IMG_B64 = "/images/bokovoy_2fl_4r.jpg"; // натуральный размер 1381x1326 (2 этажа, 3 планки, 4 раскосины)
const BOKOVOY_2FL_4P_IMG_B64 = "/images/bokovoy_2fl_6r.jpg"; // натуральный размер 1886x1338 (2 этажа, 4 планки, 6 раскосин)

// Зазор между кромками соседних поясов планок (по указанию пользователя -
// как у типа I-1): размер под щитом, между выступающими вниз концами планок
// (у 4 планок - во второй секции, у 2-3 - в первой: так подпись не
// упирается в подписи отступа и напуска по краям). xL/xR - кромки планок,
// yBottom - низ планок на фото; dy - где размер относительно низа планок
// (отрицательный - между концами планок под щитом, без выносных линий:
// там, где снизу тесно от других подписей).
function bokGapRecords(xL, xR, yBottom, gapVal, dy){
  const y = yBottom + (dy || 45);
  const text = dimLabel(gapVal)+' мм';
  if(dy < 0) return [{type:'double', x1:xL, y1:y, x2:xR, y2:y, lx:(xL+xR)/2, ly:y-6, text}];
  return [
    {type:'line', x1:xL, y1:yBottom+5, x2:xL, y2:y+25},
    {type:'line', x1:xR, y1:yBottom+5, x2:xR, y2:y+25},
    {type:'double', x1:xL, y1:y, x2:xR, y2:y, lx:(xL+xR)/2, ly:y-6, text}
  ];
}

function diagramBokovoy2Planks0Raskosina(boardLenVal, overhangVal, edgeDistVal, heightPlusFloorVal, plankGapVal){
  // Фото-чертёж: 2 планки, без раскосины (натуральный размер 855×713).
  const valBoardLen = dimLabel(boardLenVal);
  const valOverhang = dimLabel(overhangVal);
  const valEdgeDist = dimLabel(edgeDistVal);
  const valHeight = dimLabel(heightPlusFloorVal);

  const records = [
    {type:'line', x1:732, y1:22, x2:947, y2:22},
    {type:'line', x1:734, y1:624, x2:951, y2:624},
    {type:'double', x1:929, y1:22, x2:929, y2:624, lx:941, ly:323, text: valHeight+' мм', vertical:true},
    {type:'line', x1:834, y1:100, x2:835, y2:-109},
    {type:'line', x1:9, y1:92, x2:12, y2:-106},
    {type:'double', x1:12, y1:-89, x2:835, y2:-89, lx:423, ly:-95, text: valBoardLen+' мм'},
    {type:'line', x1:621, y1:707, x2:953, y2:707},
    {type:'line', x1:880, y1:625, x2:881, y2:708},
    {type:'single', x1:683, y1:836, x2:881, y2:666, lx:681, ly:861, text: valOverhang+' мм'},
    {type:'line', x1:125, y1:565, x2:125, y2:793},
    {type:'line', x1:11, y1:566, x2:12, y2:791},
    {type:'line', x1:10, y1:736, x2:126, y2:736},
    {type:'single', x1:-92, y1:534, x2:69, y2:736, lx:-101, ly:516, text: valEdgeDist+' мм'}
  ];

  return renderDiagram(BOKOVOY_2P_0R_IMG_B64, 'Щит боковой (2 планки, без раскосины) - схема расположения деталей', 855, 713, records.concat(bokGapRecords(240, 618, 706, plankGapVal)), null, photoStrokeScale(855));
}

function diagramBokovoy2Planks1Raskosina(boardLenVal, overhangVal, edgeDistVal, heightPlusFloorVal, plankGapVal){
  // Фото-чертёж: 2 планки, 1 раскосина (натуральный размер 874×733).
  const valBoardLen = dimLabel(boardLenVal);
  const valOverhang = dimLabel(overhangVal);
  const valEdgeDist = dimLabel(edgeDistVal);
  const valHeight = dimLabel(heightPlusFloorVal);

  const records = [
    {type:'line', x1:746, y1:29, x2:961, y2:28},
    {type:'line', x1:748, y1:630, x2:965, y2:630},
    {type:'double', x1:943, y1:28, x2:943, y2:630, lx:955, ly:314, text: valHeight+' мм', vertical:true},
    {type:'line', x1:848, y1:106, x2:849, y2:-103},
    {type:'line', x1:23, y1:98, x2:26, y2:-100},
    {type:'double', x1:26, y1:-83, x2:849, y2:-83, lx:457, ly:-89, text: valBoardLen+' мм'},
    {type:'line', x1:635, y1:713, x2:967, y2:714},
    {type:'line', x1:894, y1:631, x2:895, y2:714},
    {type:'single', x1:697, y1:842, x2:895, y2:672, lx:695, ly:867, text: valOverhang+' мм'},
    {type:'line', x1:139, y1:571, x2:139, y2:799},
    {type:'line', x1:25, y1:572, x2:26, y2:797},
    {type:'line', x1:24, y1:742, x2:140, y2:742},
    {type:'single', x1:-78, y1:540, x2:83, y2:742, lx:-87, ly:522, text: valEdgeDist+' мм'}
  ];

  return renderDiagram(BOKOVOY_2P_1R_IMG_B64, 'Щит боковой (2 планки, 1 раскосина) - схема расположения деталей', 874, 733, records.concat(bokGapRecords(253, 632, 713, plankGapVal)), null, photoStrokeScale(874));
}

function diagramBokovoy3Planks0Raskosina(boardLenVal, overhangVal, edgeDistVal, heightPlusFloorVal, plankGapVal){
  // Фото-чертёж: 3 планки, без раскосины (натуральный размер 1390×752).
  const valBoardLen = dimLabel(boardLenVal);
  const valOverhang = dimLabel(overhangVal);
  const valEdgeDist = dimLabel(edgeDistVal);
  const valHeight = dimLabel(heightPlusFloorVal);

  const records = [
    {type:'line', x1:1239, y1:36, x2:1454, y2:36},
    {type:'line', x1:1241, y1:638, x2:1458, y2:638},
    {type:'double', x1:1436, y1:36, x2:1436, y2:638, lx:1448, ly:337, text: valHeight+' мм', vertical:true},
    {type:'line', x1:1341, y1:114, x2:1342, y2:-95},
    {type:'line', x1:34, y1:106, x2:37, y2:-92},
    {type:'double', x1:37, y1:-75, x2:1342, y2:-75, lx:689, ly:-81, text: valBoardLen+' мм'},
    {type:'line', x1:1128, y1:721, x2:1460, y2:721},
    {type:'line', x1:1387, y1:639, x2:1388, y2:722},
    {type:'single', x1:1190, y1:850, x2:1388, y2:680, lx:1188, ly:875, text: valOverhang+' мм'},
    {type:'line', x1:139, y1:579, x2:139, y2:807},
    {type:'line', x1:36, y1:580, x2:37, y2:805},
    {type:'line', x1:35, y1:750, x2:140, y2:750},
    {type:'single', x1:-67, y1:548, x2:94, y2:750, lx:-76, ly:530, text: valEdgeDist+' мм'}
  ];

  return renderDiagram(BOKOVOY_3P_0R_IMG_B64, 'Щит боковой (3 планки, без раскосины) - схема расположения деталей', 1390, 752, records.concat(bokGapRecords(252, 632, 720, plankGapVal)), null, photoStrokeScale(1390));
}

function diagramBokovoy3Planks2Raskosina(boardLenVal, overhangVal, edgeDistVal, heightPlusFloorVal, plankGapVal){
  // Фото-чертёж: 3 планки, 2 раскосины (натуральный размер 1418×781).
  const valBoardLen = dimLabel(boardLenVal);
  const valOverhang = dimLabel(overhangVal);
  const valEdgeDist = dimLabel(edgeDistVal);
  const valHeight = dimLabel(heightPlusFloorVal);

  const records = [
    {type:'line', x1:1272, y1:71, x2:1487, y2:71},
    {type:'line', x1:1274, y1:673, x2:1491, y2:673},
    {type:'double', x1:1469, y1:71, x2:1469, y2:673, lx:1481, ly:372, text: valHeight+' мм', vertical:true},
    {type:'line', x1:1374, y1:149, x2:1375, y2:-60},
    {type:'line', x1:67, y1:141, x2:70, y2:-57},
    {type:'double', x1:70, y1:-40, x2:1375, y2:-40, lx:722, ly:-46, text: valBoardLen+' мм'},
    {type:'line', x1:1161, y1:756, x2:1493, y2:756},
    {type:'line', x1:1420, y1:674, x2:1421, y2:757},
    {type:'single', x1:1223, y1:885, x2:1421, y2:715, lx:1221, ly:910, text: valOverhang+' мм'},
    {type:'line', x1:172, y1:614, x2:172, y2:842},
    {type:'line', x1:69, y1:615, x2:70, y2:840},
    {type:'line', x1:68, y1:785, x2:173, y2:785},
    {type:'single', x1:-34, y1:583, x2:127, y2:785, lx:-43, ly:565, text: valEdgeDist+' мм'}
  ];

  return renderDiagram(BOKOVOY_3P_2R_IMG_B64, 'Щит боковой (3 планки, 2 раскосины) - схема расположения деталей', 1418, 781, records.concat(bokGapRecords(286, 664, 756, plankGapVal)), null, photoStrokeScale(1418));
}

function diagramBokovoy4Planks0Raskosina(boardLenVal, overhangVal, edgeDistVal, heightPlusFloorVal, plankGapVal){
  // Фото-чертёж: 4 планки, без раскосины (натуральный размер 1900×778).
  const valBoardLen = dimLabel(boardLenVal);
  const valOverhang = dimLabel(overhangVal);
  const valEdgeDist = dimLabel(edgeDistVal);
  const valHeight = dimLabel(heightPlusFloorVal);

  const records = [
    {type:'line', x1:1751, y1:49, x2:1977, y2:49},
    {type:'line', x1:1753, y1:651, x2:1981, y2:651},
    {type:'double', x1:1959, y1:49, x2:1959, y2:651, lx:1971, ly:350, text: valHeight+' мм', vertical:true},
    {type:'line', x1:1864, y1:127, x2:1865, y2:-82},
    {type:'line', x1:40, y1:119, x2:43, y2:-79},
    {type:'double', x1:43, y1:-62, x2:1865, y2:-62, lx:954, ly:-68, text: valBoardLen+' мм'},
    {type:'line', x1:1639, y1:734, x2:1983, y2:734},
    {type:'line', x1:1910, y1:652, x2:1911, y2:735},
    {type:'single', x1:1701, y1:863, x2:1911, y2:693, lx:1699, ly:888, text: valOverhang+' мм'},
    {type:'line', x1:156, y1:592, x2:156, y2:820},
    {type:'line', x1:42, y1:593, x2:43, y2:818},
    {type:'line', x1:41, y1:763, x2:157, y2:763},
    {type:'single', x1:-61, y1:561, x2:100, y2:763, lx:-70, ly:543, text: valEdgeDist+' мм'}
  ];

  return renderDiagram(BOKOVOY_4P_0R_IMG_B64, 'Щит боковой (4 планки, без раскосины) - схема расположения деталей', 1900, 778, records.concat(bokGapRecords(764, 1143, 734, plankGapVal)), null, photoStrokeScale(1900));
}

function diagramBokovoy4Planks3Raskosina(boardLenVal, overhangVal, edgeDistVal, heightPlusFloorVal, plankGapVal){
  // Фото-чертёж: 4 планки, 3 раскосины (натуральный размер 1877×746).
  const valBoardLen = dimLabel(boardLenVal);
  const valOverhang = dimLabel(overhangVal);
  const valEdgeDist = dimLabel(edgeDistVal);
  const valHeight = dimLabel(heightPlusFloorVal);

  const records = [
    {type:'line', x1:1737, y1:25, x2:1963, y2:25},
    {type:'line', x1:1739, y1:627, x2:1967, y2:627},
    {type:'double', x1:1945, y1:25, x2:1945, y2:627, lx:1957, ly:326, text: valHeight+' мм', vertical:true},
    {type:'line', x1:1850, y1:103, x2:1851, y2:-106},
    {type:'line', x1:26, y1:95, x2:29, y2:-103},
    {type:'double', x1:29, y1:-86, x2:1851, y2:-86, lx:940, ly:-92, text: valBoardLen+' мм'},
    {type:'line', x1:1625, y1:710, x2:1969, y2:710},
    {type:'line', x1:1896, y1:628, x2:1897, y2:711},
    {type:'single', x1:1687, y1:839, x2:1897, y2:669, lx:1685, ly:864, text: valOverhang+' мм'},
    {type:'line', x1:142, y1:568, x2:142, y2:796},
    {type:'line', x1:28, y1:569, x2:29, y2:794},
    {type:'line', x1:27, y1:739, x2:143, y2:739},
    {type:'single', x1:-75, y1:537, x2:86, y2:739, lx:-84, ly:519, text: valEdgeDist+' мм'}
  ];

  return renderDiagram(BOKOVOY_4P_3R_IMG_B64, 'Щит боковой (4 планки, 3 раскосины) - схема расположения деталей', 1877, 746, records.concat(bokGapRecords(749, 1129, 710, plankGapVal)), null, photoStrokeScale(1877));
}

// Три чертежа ниже - варианты на 2 этажа (средняя горизонтальная планка делит щит
// пополам). Подписи (6 шт.): длина доски бока (сверху), полная высота груза+доски
// дна (справа, целиком на весь щит), напуск на полоз (снизу справа - 2/3 толщины
// полоза, не более 70мм, как и у 1-этажных чертежей), отступ до крайней планки
// (снизу, отдельная подпись ещё правее/ниже overhang), и две подписи слева - длина
// верхней вертикальной планки (k40, чисто планка, от верха щита до верха средней
// горизонтальной планки) и длина нижней планки + ШИРИНА средней горизонтальной
// планки МИНУС напуск (w43+k40-overhang, от ВЕРХА средней планки до линии, где
// планка начинает заходить на полоз - т.е. без учёта самого напуска, он показан
// отдельной подписью).

function diagramBokovoy2Floors2Raskosina(boardLenVal, overhangVal, edgeDistVal, heightPlusFloorVal, upperSpanVal, midPlankWidthVal, plankGapVal){
  // Фото-чертёж: 2 этажа, 2 планки, 2 раскосины (натуральный размер 966×1361).
  const valBoardLen = dimLabel(boardLenVal);
  const valOverhang = dimLabel(overhangVal);
  const valEdgeDist = dimLabel(edgeDistVal);
  const valHeight = dimLabel(heightPlusFloorVal);
  const valUpperSpan = dimLabel(upperSpanVal);
  const valLowerSpan = dimLabel(upperSpanVal + midPlankWidthVal - overhangVal);

  const records = [
    {type:'line', x1:805, y1:47, x2:1073, y2:47},
    {type:'line', x1:807, y1:1250, x2:1083, y2:1249},
    {type:'double', x1:1052, y1:47, x2:1052, y2:1248, lx:1070, ly:647, text: valHeight+' мм', vertical:true},
    {type:'line', x1:907, y1:123, x2:907, y2:-56},
    {type:'line', x1:85, y1:109, x2:85, y2:-66},
    {type:'double', x1:85, y1:-46, x2:908, y2:-46, lx:496, ly:-64, text: valBoardLen+' мм'},
    {type:'line', x1:695, y1:1336, x2:1088, y2:1333},
    {type:'line', x1:966, y1:1250, x2:966, y2:1334},
    {type:'single', x1:731, y1:1471, x2:966, y2:1298, lx:728, ly:1482, text: valOverhang+' мм'},
    {type:'line', x1:197, y1:588, x2:-109, y2:588},
    {type:'line', x1:201, y1:1251, x2:-111, y2:1250},
    {type:'double', x1:-89, y1:588, x2:-89, y2:1250, lx:-103, ly:919, text: valLowerSpan+' мм', vertical:true},
    {type:'line', x1:197, y1:48, x2:-95, y2:46},
    {type:'double', x1:-22, y1:47, x2:-22, y2:588, lx:-75, ly:317, text: valUpperSpan+' мм', vertical:true},
    {type:'line', x1:85, y1:1191, x2:89, y2:1409},
    {type:'line', x1:199, y1:1192, x2:201, y2:1409},
    {type:'line', x1:89, y1:1362, x2:201, y2:1362},
    {type:'single', x1:393, y1:1512, x2:128, y2:1364, lx:399, ly:1532, text: valEdgeDist+' мм'}
  ];

  return renderDiagram(BOKOVOY_2FL_2P_IMG_B64, 'Щит боковой (2 этажа, 2 планки, 2 раскосины) - схема расположения деталей', 966, 1361, records.concat(bokGapRecords(312, 691, 1335, plankGapVal, -45)), null, photoStrokeScale(966));
}

function diagramBokovoy2Floors3Planks(boardLenVal, overhangVal, edgeDistVal, heightPlusFloorVal, upperSpanVal, midPlankWidthVal, plankGapVal){
  // Фото-чертёж: 2 этажа, 3 планки, 4 раскосины (натуральный размер 1381×1326).
  const valBoardLen = dimLabel(boardLenVal);
  const valOverhang = dimLabel(overhangVal);
  const valEdgeDist = dimLabel(edgeDistVal);
  const valHeight = dimLabel(heightPlusFloorVal);
  const valUpperSpan = dimLabel(upperSpanVal);
  const valLowerSpan = dimLabel(upperSpanVal + midPlankWidthVal - overhangVal);

  const records = [
    {type:'line', x1:1236, y1:21, x2:1504, y2:21},
    {type:'line', x1:1238, y1:1224, x2:1514, y2:1223},
    {type:'double', x1:1483, y1:21, x2:1483, y2:1222, lx:1501, ly:621, text: valHeight+' мм', vertical:true},
    {type:'line', x1:1338, y1:97, x2:1338, y2:-82},
    {type:'line', x1:34, y1:83, x2:34, y2:-92},
    {type:'double', x1:34, y1:-72, x2:1339, y2:-72, lx:686, ly:-90, text: valBoardLen+' мм'},
    {type:'line', x1:1126, y1:1309, x2:1519, y2:1306},
    {type:'line', x1:1397, y1:1224, x2:1397, y2:1307},
    {type:'single', x1:1162, y1:1444, x2:1397, y2:1272, lx:1159, ly:1455, text: valOverhang+' мм'},
    {type:'line', x1:135, y1:564, x2:-160, y2:564},
    {type:'line', x1:139, y1:1225, x2:-162, y2:1224},
    {type:'double', x1:-140, y1:564, x2:-140, y2:1224, lx:-154, ly:894, text: valLowerSpan+' мм', vertical:true},
    {type:'line', x1:135, y1:22, x2:-146, y2:20},
    {type:'double', x1:-73, y1:21, x2:-73, y2:564, lx:-126, ly:292, text: valUpperSpan+' мм', vertical:true},
    {type:'line', x1:34, y1:1165, x2:38, y2:1382},
    {type:'line', x1:137, y1:1166, x2:139, y2:1382},
    {type:'line', x1:38, y1:1335, x2:139, y2:1335},
    {type:'single', x1:331, y1:1485, x2:66, y2:1337, lx:337, ly:1505, text: valEdgeDist+' мм'}
  ];

  return renderDiagram(BOKOVOY_2FL_3P_IMG_B64, 'Щит боковой (2 этажа, 3 планки, 4 раскосины) - схема расположения деталей', 1381, 1326, records.concat(bokGapRecords(249, 628, 1307, plankGapVal)), null, photoStrokeScale(1381));
}

function diagramBokovoy2Floors4Planks(boardLenVal, overhangVal, edgeDistVal, heightPlusFloorVal, upperSpanVal, midPlankWidthVal, plankGapVal){
  // Фото-чертёж: 2 этажа, 4 планки, 6 раскосин (натуральный размер 1886×1338).
  const valBoardLen = dimLabel(boardLenVal);
  const valOverhang = dimLabel(overhangVal);
  const valEdgeDist = dimLabel(edgeDistVal);
  const valHeight = dimLabel(heightPlusFloorVal);
  const valUpperSpan = dimLabel(upperSpanVal);
  const valLowerSpan = dimLabel(upperSpanVal + midPlankWidthVal - overhangVal);

  const records = [
    {type:'line', x1:1737, y1:33, x2:2016, y2:33},
    {type:'line', x1:1739, y1:1237, x2:2026, y2:1236},
    {type:'double', x1:1995, y1:33, x2:1995, y2:1235, lx:2013, ly:634, text: valHeight+' мм', vertical:true},
    {type:'line', x1:1850, y1:109, x2:1850, y2:-70},
    {type:'line', x1:29, y1:95, x2:29, y2:-80},
    {type:'double', x1:29, y1:-60, x2:1851, y2:-60, lx:940, ly:-78, text: valBoardLen+' мм'},
    {type:'line', x1:1627, y1:1322, x2:2031, y2:1319},
    {type:'line', x1:1909, y1:1237, x2:1909, y2:1320},
    {type:'single', x1:1663, y1:1457, x2:1909, y2:1285, lx:1660, ly:1468, text: valOverhang+' мм'},
    {type:'line', x1:142, y1:580, x2:-165, y2:580},
    {type:'line', x1:146, y1:1238, x2:-167, y2:1237},
    {type:'double', x1:-145, y1:580, x2:-145, y2:1237, lx:-159, ly:908, text: valLowerSpan+' мм', vertical:true},
    {type:'line', x1:142, y1:34, x2:-151, y2:32},
    {type:'double', x1:-78, y1:33, x2:-78, y2:580, lx:-131, ly:306, text: valUpperSpan+' мм', vertical:true},
    {type:'line', x1:29, y1:1178, x2:33, y2:1395},
    {type:'line', x1:144, y1:1179, x2:146, y2:1395},
    {type:'line', x1:33, y1:1348, x2:146, y2:1348},
    {type:'single', x1:338, y1:1498, x2:73, y2:1350, lx:344, ly:1518, text: valEdgeDist+' мм'}
  ];

  return renderDiagram(BOKOVOY_2FL_4P_IMG_B64, 'Щит боковой (2 этажа, 4 планки, 6 раскосин) - схема расположения деталей', 1886, 1338, records.concat(bokGapRecords(750, 1130, 1321, plankGapVal)), null, photoStrokeScale(1886));
}

function diagramBokovoy(Hmm, t12val, t41val, k41val, overhangVal, edgeDistVal, raskosinCountVal, floorsVal, floorSpanVal, plankCountVal, plankLenVal, midPlankWidthVal, plankGapVal){
  const hasRaskosina = raskosinCountVal > 0;
  const plankCount = Math.min(plankCountVal, 4);
  const heightPlusFloor = Hmm + t12val;

  if(floorsVal === 2){
    // Выбор идёт по числу планок, как и на 1 этаже - раскосина у 2-этажного щита
    // есть почти всегда (см. hasRaskosina в backend/src/i3/bokovoy.js), отдельных фото «без
    // раскосины» на 2 этажа не присылали.
    if(plankCount <= 2){
      return diagramBokovoy2Floors2Raskosina(k41val, overhangVal, edgeDistVal, heightPlusFloor, plankLenVal, midPlankWidthVal, plankGapVal);
    }
    if(plankCount === 3){
      return diagramBokovoy2Floors3Planks(k41val, overhangVal, edgeDistVal, heightPlusFloor, plankLenVal, midPlankWidthVal, plankGapVal);
    }
    return diagramBokovoy2Floors4Planks(k41val, overhangVal, edgeDistVal, heightPlusFloor, plankLenVal, midPlankWidthVal, plankGapVal);
  }
  // Выбор фото идёт по числу планок (plankCountVal = l19) и наличию раскосины
  // (raskosinCountVal > 0 <=> bokHasRaskosina). Для 5+ планок фото ещё нет —
  // показываем чертёж с максимальным доступным числом планок (4): расположение
  // то же самое, просто на фото меньше планок, чем в реальном ящике.
  if(plankCount <= 2){
    return hasRaskosina
      ? diagramBokovoy2Planks1Raskosina(k41val, overhangVal, edgeDistVal, heightPlusFloor, plankGapVal)
      : diagramBokovoy2Planks0Raskosina(k41val, overhangVal, edgeDistVal, heightPlusFloor, plankGapVal);
  }
  if(plankCount === 3){
    return hasRaskosina
      ? diagramBokovoy3Planks2Raskosina(k41val, overhangVal, edgeDistVal, heightPlusFloor, plankGapVal)
      : diagramBokovoy3Planks0Raskosina(k41val, overhangVal, edgeDistVal, heightPlusFloor, plankGapVal);
  }
  return hasRaskosina
    ? diagramBokovoy4Planks3Raskosina(k41val, overhangVal, edgeDistVal, heightPlusFloor, plankGapVal)
    : diagramBokovoy4Planks0Raskosina(k41val, overhangVal, edgeDistVal, heightPlusFloor, plankGapVal);
}

// --- Щит боковой: P планок (P-1 секций), 1 или 2 этажа ---
function diagramBokovoyGen(boardLenVal, overhangVal, edgeDistVal, heightPlusFloorVal, plankCount, floors, xMode, upperSpanVal, midPlankWidthVal, sectionWmm, lidBoardTVal, hasBraces, plankGapVal){
  const P = Math.max(2, Math.round(plankCount)), F = floors === 2 ? 2 : 1;
  const PH = floors === 2 ? 1300 : 800, pw = 100, stub = 100, hp = 100; // средняя планка - той же ширины
  const ovh = 80;                                   // напуск планок ниже щита (на полоз)
  const innerH = F === 2 ? (PH - hp)/2 : PH;
  const realInH = F === 2 ? (heightPlusFloorVal - (midPlankWidthVal||100))/2 : heightPlusFloorVal;
  // Ширина секции - по реальной пропорции, но весь чертёж не длиннее ~4
  // (2 этажа - ~2.4) своих высот: иначе у очень длинного щита (10+ м) чертёж
  // превращается в тонкую полосу, а подписи наезжают друг на друга.
  const maxIW = (F === 2 ? 2.4 : 4) * (45 + PH + 80);
  // И не уже, чем фото бокового щита с 2 планками (1 этаж - 874×733, 2 этажа -
  // 966×1361): по замечанию пользователя, при 2 планках (особенно на 2 этажах)
  // чертёж выходил узким и высоким и занимал много места по вертикали.
  const minIW = (F === 2 ? 966/1361 : 874/733) * (45 + PH + 80);
  const sw = Math.max(1.2*pw, (minIW - 2*stub - P*pw) / (P-1),
    Math.min(innerH * i3aspect(sectionWmm - 100, realInH), (maxIW - 2*stub - P*pw) / (P-1)));
  const panelW = 2*stub + P*pw + (P-1)*sw;
  const up = 45;                                    // планки чуть выступают над щитом (как в I-1)
  const IW = Math.round(panelW), IH = up + PH + ovh;
  const px = i => stub + i*(pw + sw);
  let shapes = `<g transform="translate(0,${up})">` + i3rect(0, 0, IW, PH); // доски бока - сплошной щит
  for(let fl=0; fl<F && hasBraces !== false; fl++){  // hasBraces=false - щит без раскосин
    const top = fl*(innerH + hp), bot = top + innerH;
    const upper = F === 2 && fl === 0;
    for(let i=0; i<P-1; i++){
      const leftHalf = i < Math.ceil((P-1)/2);
      shapes += i3cross(px(i)+pw, px(i+1), top, bot, upper ? !leftHalf : leftHalf, xMode, pw, F === 2 && fl === 1, F === 2 && fl === 0);
    }
  }
  shapes += '</g>';
  for(let i=0; i<P; i++) shapes += i3rect(px(i), 0, pw, IH);
  if(F === 2) shapes += i3rect(0, up + innerH, IW, hp);

  const lastR = px(P-1) + pw;
  const IHp = PH + ovh; // (записи ниже - в координатах щита, затем сдвиг на up)
  const k = IW / 260;   // единиц картинки на 1px при базовой ширине чертежа
  const records = [
    {type:'line', x1:IW, y1:0, x2:IW+215, y2:0},
    {type:'line', x1:IW, y1:PH, x2:IW+215, y2:PH},
    {type:'double', x1:IW+195, y1:0, x2:IW+195, y2:PH, lx:IW+207, ly:PH/2, text: dimLabel(heightPlusFloorVal)+' мм', vertical:true},
    {type:'line', x1:IW, y1:80, x2:IW, y2:-120},
    {type:'line', x1:0, y1:80, x2:0, y2:-120},
    {type:'double', x1:0, y1:-95, x2:IW, y2:-95, lx:Math.max(IW/2, px(0) + 150*k), ly:-101, text: dimLabel(boardLenVal)+' мм'},
    // Стрелка к выступающему верхнему левому углу первой планки - толщина
    // доски крышки (по указанию пользователя, как у чертежей типа I-1). У 2 этажей
    // подпись на ряд выше - слева под ней вертикальная подпись верхнего этажа.
    {type:'single', x1:px(0) - 12*k, y1:F === 2 ? -95 - 34*k : -95, x2:px(0), y2:-up*0.33, lx:px(0) - 12*k, ly:F === 2 ? -101 - 34*k : -101, text: dimLabel(lidBoardTVal)+' мм'},
    // Напуск: на сколько планки выступают ниже щита - выносные линии на уровне
    // низа щита и низа планки справа от щита, между ними - размер, подпись
    // под ним (по замечанию пользователя: раньше сноска уходила влево-вниз).
    {type:'line', x1:IW, y1:PH, x2:IW+150*Math.max(1, k/4), y2:PH},
    {type:'line', x1:lastR, y1:IHp, x2:IW+150*Math.max(1, k/4), y2:IHp},
    {type:'line', x1:IW+100*Math.max(1, k/4), y1:PH, x2:IW+100*Math.max(1, k/4), y2:IHp},
    // стрелка - под углом, от подписи (правее и ниже) в середину отрезка
    {type:'single', x1:IW+100*Math.max(1, k/4) + 10*k, y1:IHp+14*k, x2:IW+100*Math.max(1, k/4), y2:(PH+IHp)/2, lx:IW+100*Math.max(1, k/4) + 10*k, ly:IHp+18*k, text: dimLabel(overhangVal)+' мм'},
    {type:'line', x1:px(0), y1:PH-60, x2:px(0), y2:IHp+90},
    {type:'line', x1:0, y1:PH-60, x2:0, y2:IHp+90},
    {type:'line', x1:0, y1:IHp+60, x2:px(0), y2:IHp+60},
    F === 2
      ? (P >= 4 // у широкого щита - правее первой планки, чтобы не слипаться с подписями этажей слева
        ? {type:'single', x1:px(0)+60*k, y1:IHp+190, x2:px(0)/2, y2:IHp+60, lx:px(0)+62*k, ly:IHp+215, text: dimLabel(edgeDistVal)+' мм'}
        : {type:'single', x1:-60, y1:IHp+190, x2:px(0)/2, y2:IHp+60, lx:-70, ly:IHp+215, text: dimLabel(edgeDistVal)+' мм'})
      : {type:'single', x1:-100, y1:PH-100, x2:px(0)/2, y2:IHp+60, lx:-110, ly:PH-118, text: dimLabel(edgeDistVal)+' мм'}
  ];
  if(F === 2){
    records.push(
      // подписи этажей - в два столбика (разнос - в пикселях экрана, через k),
      // иначе на широком (сильно уменьшенном) щите они наезжают друг на друга
      {type:'line', x1:px(0), y1:innerH, x2:-Math.max(160, 30*k), y2:innerH},
      {type:'line', x1:px(0), y1:PH, x2:-Math.max(160, 12*k), y2:PH},
      {type:'double', x1:-Math.max(120, 8*k), y1:innerH, x2:-Math.max(120, 8*k), y2:PH, lx:-Math.max(135, 9*k), ly:(innerH+PH)/2, text: dimLabel(upperSpanVal + midPlankWidthVal - overhangVal)+' мм', vertical:true},
      {type:'line', x1:px(0), y1:0, x2:-Math.max(150, 30*k), y2:0},
      {type:'double', x1:-Math.max(40, 27*k), y1:0, x2:-Math.max(40, 27*k), y2:innerH, lx:-Math.max(100, 28*k), ly:innerH/2, text: dimLabel(upperSpanVal)+' мм', vertical:true}
    );
  }
  // Зазор между кромками соседних поясов (по указанию пользователя, как у
  // типа I-1) - под щитом, между концами планок средней секции.
  if(P > 1){
    const gi = Math.floor((P-1)/2), xa = px(gi) + pw, xb = px(gi+1), yg = IHp + 60;
    records.push(
      {type:'line', x1:xa, y1:IHp+5, x2:xa, y2:yg+25},
      {type:'line', x1:xb, y1:IHp+5, x2:xb, y2:yg+25},
      {type:'double', x1:xa, y1:yg, x2:xb, y2:yg, lx:(xa+xb)/2, ly:yg-6, text: dimLabel(plankGapVal)+' мм'}
    );
  }
  records.forEach(r=>{ ['y1','y2','ly'].forEach(k=>{ if(typeof r[k]==='number') r[k] += up; }); });
  const title = `Щит боковой (${F} эт., ${P} планок${hasBraces === false ? ', без раскосин' : xMode ? ', X-раскосины' : ''}) - схема расположения деталей`;
  return i3render(title, IW, IH, shapes, records);
}

// Чертёж бокового щита для результата расчёта.
function diagramBokovoyFor(calc){
  if((calc.xRaskosina && calc.l42 > 0) || calc.l19 > 4){
    return diagramBokovoyGen(calc.k41, calc.bokOverhang, calc.edgeDistKryshka, calc.HplusT12, calc.l19, calc.bokFloors, calc.xRaskosina, calc.k40, calc.w43, calc.bokSectionW, calc.t20, calc.l42 > 0, calc.plankGap);
  }
  return diagramBokovoy(calc.H, calc.t12, calc.t41, calc.k41, calc.bokOverhang, calc.edgeDistKryshka, calc.l42, calc.bokFloors, calc.bokVertSpan, calc.l19, calc.k40, calc.w43, calc.plankGap);
}
