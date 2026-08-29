// ГОСТ 10198-91, тип I-3: чертежи "Щит боковой". Вынесены из diagrams.js в
// отдельный файл (по узлам - см. также dno.js, kryshka.js, end-panel.js).
// Шесть чертежей ниже подобраны по фактическому числу планок бокового щита (l19)
// и наличию раскосины - число раскосин всегда (число планок - 1), т.к. одна
// раскосина ставится на каждую секцию между соседними планками (см. bokHasRaskosina
// в app-i3.js). Подписи размещены по единой схеме на всех шести фото: длина доски бока
// (сверху, горизонтальная), высота груза+доски дна (справа, вертикальная), напуск
// на полоз (снизу справа, у последней планки), отступ до первой планки (снизу
// слева, у первой планки) - координаты у каждого фото свои, т.к. сами фото разного размера.
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

function diagramBokovoy2Planks0Raskosina(boardLenVal, overhangVal, edgeDistVal, heightPlusFloorVal){
  // Фото-чертёж: 2 планки, без раскосины (натуральный размер 855×713).
  const valBoardLen = Math.round(boardLenVal);
  const valOverhang = Math.round(overhangVal);
  const valEdgeDist = Math.round(edgeDistVal);
  const valHeight = Math.round(heightPlusFloorVal);

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

  return renderDiagram(BOKOVOY_2P_0R_IMG_B64, 'Щит боковой (2 планки, без раскосины) - схема расположения деталей', 855, 713, records, null, photoStrokeScale(855));
}

function diagramBokovoy2Planks1Raskosina(boardLenVal, overhangVal, edgeDistVal, heightPlusFloorVal){
  // Фото-чертёж: 2 планки, 1 раскосина (натуральный размер 874×733).
  const valBoardLen = Math.round(boardLenVal);
  const valOverhang = Math.round(overhangVal);
  const valEdgeDist = Math.round(edgeDistVal);
  const valHeight = Math.round(heightPlusFloorVal);

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

  return renderDiagram(BOKOVOY_2P_1R_IMG_B64, 'Щит боковой (2 планки, 1 раскосина) - схема расположения деталей', 874, 733, records, null, photoStrokeScale(874));
}

function diagramBokovoy3Planks0Raskosina(boardLenVal, overhangVal, edgeDistVal, heightPlusFloorVal){
  // Фото-чертёж: 3 планки, без раскосины (натуральный размер 1390×752).
  const valBoardLen = Math.round(boardLenVal);
  const valOverhang = Math.round(overhangVal);
  const valEdgeDist = Math.round(edgeDistVal);
  const valHeight = Math.round(heightPlusFloorVal);

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

  return renderDiagram(BOKOVOY_3P_0R_IMG_B64, 'Щит боковой (3 планки, без раскосины) - схема расположения деталей', 1390, 752, records, null, photoStrokeScale(1390));
}

function diagramBokovoy3Planks2Raskosina(boardLenVal, overhangVal, edgeDistVal, heightPlusFloorVal){
  // Фото-чертёж: 3 планки, 2 раскосины (натуральный размер 1418×781).
  const valBoardLen = Math.round(boardLenVal);
  const valOverhang = Math.round(overhangVal);
  const valEdgeDist = Math.round(edgeDistVal);
  const valHeight = Math.round(heightPlusFloorVal);

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

  return renderDiagram(BOKOVOY_3P_2R_IMG_B64, 'Щит боковой (3 планки, 2 раскосины) - схема расположения деталей', 1418, 781, records, null, photoStrokeScale(1418));
}

function diagramBokovoy4Planks0Raskosina(boardLenVal, overhangVal, edgeDistVal, heightPlusFloorVal){
  // Фото-чертёж: 4 планки, без раскосины (натуральный размер 1900×778).
  const valBoardLen = Math.round(boardLenVal);
  const valOverhang = Math.round(overhangVal);
  const valEdgeDist = Math.round(edgeDistVal);
  const valHeight = Math.round(heightPlusFloorVal);

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

  return renderDiagram(BOKOVOY_4P_0R_IMG_B64, 'Щит боковой (4 планки, без раскосины) - схема расположения деталей', 1900, 778, records, null, photoStrokeScale(1900));
}

function diagramBokovoy4Planks3Raskosina(boardLenVal, overhangVal, edgeDistVal, heightPlusFloorVal){
  // Фото-чертёж: 4 планки, 3 раскосины (натуральный размер 1877×746).
  const valBoardLen = Math.round(boardLenVal);
  const valOverhang = Math.round(overhangVal);
  const valEdgeDist = Math.round(edgeDistVal);
  const valHeight = Math.round(heightPlusFloorVal);

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

  return renderDiagram(BOKOVOY_4P_3R_IMG_B64, 'Щит боковой (4 планки, 3 раскосины) - схема расположения деталей', 1877, 746, records, null, photoStrokeScale(1877));
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

function diagramBokovoy2Floors2Raskosina(boardLenVal, overhangVal, edgeDistVal, heightPlusFloorVal, upperSpanVal, midPlankWidthVal){
  // Фото-чертёж: 2 этажа, 2 планки, 2 раскосины (натуральный размер 966×1361).
  const valBoardLen = Math.round(boardLenVal);
  const valOverhang = Math.round(overhangVal);
  const valEdgeDist = Math.round(edgeDistVal);
  const valHeight = Math.round(heightPlusFloorVal);
  const valUpperSpan = Math.round(upperSpanVal);
  const valLowerSpan = Math.round(upperSpanVal + midPlankWidthVal - overhangVal);

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

  return renderDiagram(BOKOVOY_2FL_2P_IMG_B64, 'Щит боковой (2 этажа, 2 планки, 2 раскосины) - схема расположения деталей', 966, 1361, records, null, photoStrokeScale(966));
}

function diagramBokovoy2Floors3Planks(boardLenVal, overhangVal, edgeDistVal, heightPlusFloorVal, upperSpanVal, midPlankWidthVal){
  // Фото-чертёж: 2 этажа, 3 планки, 4 раскосины (натуральный размер 1381×1326).
  const valBoardLen = Math.round(boardLenVal);
  const valOverhang = Math.round(overhangVal);
  const valEdgeDist = Math.round(edgeDistVal);
  const valHeight = Math.round(heightPlusFloorVal);
  const valUpperSpan = Math.round(upperSpanVal);
  const valLowerSpan = Math.round(upperSpanVal + midPlankWidthVal - overhangVal);

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

  return renderDiagram(BOKOVOY_2FL_3P_IMG_B64, 'Щит боковой (2 этажа, 3 планки, 4 раскосины) - схема расположения деталей', 1381, 1326, records, null, photoStrokeScale(1381));
}

function diagramBokovoy2Floors4Planks(boardLenVal, overhangVal, edgeDistVal, heightPlusFloorVal, upperSpanVal, midPlankWidthVal){
  // Фото-чертёж: 2 этажа, 4 планки, 6 раскосин (натуральный размер 1886×1338).
  const valBoardLen = Math.round(boardLenVal);
  const valOverhang = Math.round(overhangVal);
  const valEdgeDist = Math.round(edgeDistVal);
  const valHeight = Math.round(heightPlusFloorVal);
  const valUpperSpan = Math.round(upperSpanVal);
  const valLowerSpan = Math.round(upperSpanVal + midPlankWidthVal - overhangVal);

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

  return renderDiagram(BOKOVOY_2FL_4P_IMG_B64, 'Щит боковой (2 этажа, 4 планки, 6 раскосин) - схема расположения деталей', 1886, 1338, records, null, photoStrokeScale(1886));
}

function diagramBokovoy(Hmm, t12val, t41val, k41val, overhangVal, edgeDistVal, raskosinCountVal, floorsVal, floorSpanVal, plankCountVal, plankLenVal, midPlankWidthVal){
  const hasRaskosina = raskosinCountVal > 0;
  const plankCount = Math.min(plankCountVal, 4);
  const heightPlusFloor = Hmm + t12val;

  if(floorsVal === 2){
    // Выбор идёт по числу планок, как и на 1 этаже - раскосина у 2-этажного щита
    // есть почти всегда (см. bokHasRaskosina в app-i3.js), отдельных фото «без
    // раскосины» на 2 этажа не присылали.
    if(plankCount <= 2){
      return diagramBokovoy2Floors2Raskosina(k41val, overhangVal, edgeDistVal, heightPlusFloor, plankLenVal, midPlankWidthVal);
    }
    if(plankCount === 3){
      return diagramBokovoy2Floors3Planks(k41val, overhangVal, edgeDistVal, heightPlusFloor, plankLenVal, midPlankWidthVal);
    }
    return diagramBokovoy2Floors4Planks(k41val, overhangVal, edgeDistVal, heightPlusFloor, plankLenVal, midPlankWidthVal);
  }
  // Выбор фото идёт по числу планок (plankCountVal = l19) и наличию раскосины
  // (raskosinCountVal > 0 <=> bokHasRaskosina). Для 5+ планок фото ещё нет —
  // показываем чертёж с максимальным доступным числом планок (4): расположение
  // то же самое, просто на фото меньше планок, чем в реальном ящике.
  if(plankCount <= 2){
    return hasRaskosina
      ? diagramBokovoy2Planks1Raskosina(k41val, overhangVal, edgeDistVal, heightPlusFloor)
      : diagramBokovoy2Planks0Raskosina(k41val, overhangVal, edgeDistVal, heightPlusFloor);
  }
  if(plankCount === 3){
    return hasRaskosina
      ? diagramBokovoy3Planks2Raskosina(k41val, overhangVal, edgeDistVal, heightPlusFloor)
      : diagramBokovoy3Planks0Raskosina(k41val, overhangVal, edgeDistVal, heightPlusFloor);
  }
  return hasRaskosina
    ? diagramBokovoy4Planks3Raskosina(k41val, overhangVal, edgeDistVal, heightPlusFloor)
    : diagramBokovoy4Planks0Raskosina(k41val, overhangVal, edgeDistVal, heightPlusFloor);
}
