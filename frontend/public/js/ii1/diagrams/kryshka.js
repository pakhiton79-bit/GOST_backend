// ГОСТ 10198-91, тип II-1: чертёж «Крышка». Перенесено из
// src/ii1/diagrams.js исходного репозитория pakhiton79-bit/GOST_10198-91 -
// 9 готовых схем по числу продольных/поперечных брусьев (0/2/3/4 продольных,
// 2/3/4 поперечных, не любое сочетание - см. KRYSHKA_LONG_OPTIONS/
// KRYSHKA_CROSS_BY_LONG/nearestKryshkaVariant ниже). Геометрия (координаты
// стрелок и подписей в натуральных пикселях фото) - из присланных заказчиком
// схем, независимая запись per-вариант (без общей формулы).
const KRYSHKA_0L_2P_IMG_B64 = "/images/kryshka_0l_2p.jpg";
const KRYSHKA_0L_3P_IMG_B64 = "/images/kryshka_0l_3p.jpg";
const KRYSHKA_0L_4P_IMG_B64 = "/images/kryshka_0l_4p.jpg";
const KRYSHKA_2L_2P_IMG_B64 = "/images/kryshka_2l_2p.jpg";
const KRYSHKA_2L_3P_IMG_B64 = "/images/kryshka_2l_3p.jpg";
const KRYSHKA_3L_2P_IMG_B64 = "/images/kryshka_3l_2p.jpg";
const KRYSHKA_3L_3P_IMG_B64 = "/images/kryshka_3l_3p.jpg";
const KRYSHKA_3L_4P_IMG_B64 = "/images/kryshka_3l_4p.jpg";
const KRYSHKA_4L_4P_IMG_B64 = "/images/kryshka_4l_4p.jpg";

const KRYSHKA_VARIANTS = {
  '4_4': {
    img: KRYSHKA_4L_4P_IMG_B64, IW: 1209, IH: 840,
    records: function(torecBoardVal, sideFrameVal, widthVal, lengthVal, edgeDistVal) { return [
      {type:'line', x1:49, y1:511, x2:49, y2:830},
      {type:'line', x1:11, y1:332, x2:11, y2:953},
      {type:'line', x1:11, y1:744, x2:49, y2:744},
      {type:'single', x1:31, y1:1002, x2:31, y2:744, lx:31, ly:1003, text:torecBoardVal+' мм'},
      {type:'line', x1:158, y1:49, x2:231, y2:49},
      {type:'line', x1:159, y1:12, x2:231, y2:11},
      {type:'line', x1:207, y1:12, x2:207, y2:49},
      {type:'single', x1:-134, y1:32, x2:208, y2:32, lx:-145, ly:32, text:sideFrameVal+' мм'},
      {type:'line', x1:1046, y1:12, x2:1343, y2:10},
      {type:'line', x1:1046, y1:829, x2:1352, y2:829},
      {type:'double', x1:1312, y1:10, x2:1313, y2:829, lx:1313, ly:308, text:widthVal+' мм', vertical:true},
      {type:'line', x1:1195, y1:752, x2:1198, y2:930},
      {type:'double', x1:11, y1:911, x2:1198, y2:910, lx:611, ly:912, text:lengthVal+' мм'},
      {type:'line', x1:159, y1:331, x2:158, y2:509},
      {type:'line', x1:10, y1:372, x2:159, y2:373},
      {type:'single', x1:-105, y1:517, x2:87, y2:374, lx:-121, ly:534, text:edgeDistVal+' мм'},
    ]; }
  },
  '3_4': {
    img: KRYSHKA_3L_4P_IMG_B64, IW: 1221, IH: 849,
    records: function(torecBoardVal, sideFrameVal, widthVal, lengthVal, edgeDistVal) { return [
      {type:'line', x1:58, y1:761, x2:58, y2:836},
      {type:'line', x1:19, y1:466, x2:20, y2:836},
      {type:'line', x1:20, y1:792, x2:59, y2:792},
      {type:'single', x1:39, y1:968, x2:39, y2:792, lx:38, ly:994, text:torecBoardVal+' мм'},
      {type:'line', x1:167, y1:54, x2:240, y2:53},
      {type:'line', x1:19, y1:16, x2:242, y2:16},
      {type:'line', x1:204, y1:16, x2:204, y2:55},
      {type:'single', x1:-135, y1:37, x2:204, y2:36, lx:-179, ly:37, text:sideFrameVal+' мм'},
      {type:'line', x1:167, y1:462, x2:167, y2:602},
      {type:'line', x1:19, y1:496, x2:167, y2:496},
      {type:'single', x1:-67, y1:602, x2:96, y2:496, lx:-93, ly:600, text:edgeDistVal+' мм'},
      {type:'line', x1:19, y1:90, x2:19, y2:-88},
      {type:'line', x1:1205, y1:92, x2:1205, y2:-92},
      {type:'double', x1:19, y1:-64, x2:1205, y2:-66, lx:611, ly:-78, text:lengthVal+' мм'},
      {type:'line', x1:1058, y1:17, x2:1346, y2:18},
      {type:'line', x1:1058, y1:835, x2:1359, y2:836},
      {type:'double', x1:1320, y1:19, x2:1322, y2:837, lx:1337, ly:427, text:widthVal+' мм', vertical:true},
    ]; }
  },
  '3_3': {
    img: KRYSHKA_3L_3P_IMG_B64, IW: 1203, IH: 845,
    records: function(torecBoardVal, sideFrameVal, widthVal, lengthVal, edgeDistVal) { return [
      {type:'line', x1:48, y1:897, x2:49, y2:758},
      {type:'line', x1:11, y1:479, x2:11, y2:998},
      {type:'line', x1:11, y1:871, x2:49, y2:871},
      {type:'single', x1:-124, y1:968, x2:31, y2:871, lx:-149, ly:982, text:torecBoardVal+' мм'},
      {type:'line', x1:271, y1:51, x2:-67, y2:52},
      {type:'line', x1:271, y1:14, x2:-68, y2:14},
      {type:'line', x1:-44, y1:15, x2:-44, y2:52},
      {type:'single', x1:-173, y1:160, x2:-44, y2:34, lx:-175, ly:187, text:sideFrameVal+' мм'},
      {type:'line', x1:196, y1:476, x2:196, y2:624},
      {type:'line', x1:11, y1:500, x2:196, y2:500},
      {type:'single', x1:-124, y1:608, x2:110, y2:500, lx:-141, ly:634, text:edgeDistVal+' мм'},
      {type:'line', x1:1195, y1:756, x2:1198, y2:993},
      {type:'double', x1:11, y1:972, x2:1198, y2:971, lx:625, ly:980, text:lengthVal+' мм'},
      {type:'line', x1:1044, y1:15, x2:1356, y2:13},
      {type:'line', x1:1048, y1:832, x2:1371, y2:832},
      {type:'double', x1:1315, y1:14, x2:1315, y2:832, lx:1319, ly:432, text:widthVal+' мм', vertical:true},
    ]; }
  },
  '3_2': {
    img: KRYSHKA_3L_2P_IMG_B64, IW: 1210, IH: 847,
    records: function(torecBoardVal, sideFrameVal, widthVal, lengthVal, edgeDistVal) { return [
      {type:'line', x1:47, y1:761, x2:47, y2:900},
      {type:'line', x1:11, y1:463, x2:12, y2:980},
      {type:'line', x1:12, y1:870, x2:47, y2:870},
      {type:'single', x1:-145, y1:965, x2:31, y2:871, lx:-151, ly:989, text:torecBoardVal+' мм'},
      {type:'line', x1:196, y1:462, x2:196, y2:614},
      {type:'line', x1:11, y1:491, x2:196, y2:491},
      {type:'single', x1:-129, y1:668, x2:116, y2:491, lx:-133, ly:688, text:edgeDistVal+' мм'},
      {type:'line', x1:269, y1:53, x2:-93, y2:55},
      {type:'line', x1:267, y1:16, x2:-94, y2:16},
      {type:'line', x1:-61, y1:16, x2:-61, y2:54},
      {type:'single', x1:-152, y1:187, x2:-62, y2:36, lx:-151, ly:216, text:sideFrameVal+' мм'},
      {type:'line', x1:1195, y1:756, x2:1194, y2:976},
      {type:'double', x1:13, y1:945, x2:1192, y2:946, lx:641, ly:945, text:lengthVal+' мм'},
      {type:'line', x1:1011, y1:835, x2:1343, y2:832},
      {type:'line', x1:1342, y1:15, x2:1009, y2:17},
      {type:'double', x1:1311, y1:16, x2:1313, y2:832, lx:1320, ly:427, text:widthVal+' мм', vertical:true},
    ]; }
  },
  '2_3': {
    img: KRYSHKA_2L_3P_IMG_B64, IW: 1203, IH: 839,
    records: function(torecBoardVal, sideFrameVal, widthVal, lengthVal, edgeDistVal) { return [
      {type:'line', x1:9, y1:424, x2:8, y2:998},
      {type:'line', x1:46, y1:758, x2:47, y2:906},
      {type:'line', x1:9, y1:857, x2:46, y2:857},
      {type:'single', x1:-143, y1:940, x2:30, y2:857, lx:-143, ly:963, text:torecBoardVal+' мм'},
      {type:'line', x1:193, y1:423, x2:193, y2:571},
      {type:'line', x1:9, y1:487, x2:193, y2:485},
      {type:'single', x1:-122, y1:298, x2:109, y2:486, lx:-123, ly:272, text:edgeDistVal+' мм'},
      {type:'line', x1:267, y1:50, x2:-78, y2:50},
      {type:'line', x1:266, y1:12, x2:-79, y2:12},
      {type:'line', x1:-43, y1:12, x2:-43, y2:51},
      {type:'single', x1:-139, y1:138, x2:-44, y2:34, lx:-139, ly:165, text:sideFrameVal+' мм'},
      {type:'line', x1:1193, y1:752, x2:1193, y2:976},
      {type:'double', x1:9, y1:958, x2:1193, y2:955, lx:605, ly:974, text:lengthVal+' мм'},
      {type:'line', x1:1009, y1:829, x2:1343, y2:828},
      {type:'line', x1:1007, y1:12, x2:1341, y2:12},
      {type:'double', x1:1297, y1:12, x2:1297, y2:829, lx:1309, ly:432, text:widthVal+' мм', vertical:true},
    ]; }
  },
  '2_2': {
    img: KRYSHKA_2L_2P_IMG_B64, IW: 1215, IH: 850,
    records: function(torecBoardVal, sideFrameVal, widthVal, lengthVal, edgeDistVal) { return [
      {type:'line', x1:54, y1:760, x2:55, y2:912},
      {type:'line', x1:15, y1:456, x2:14, y2:986},
      {type:'line', x1:14, y1:868, x2:54, y2:868},
      {type:'single', x1:-114, y1:960, x2:34, y2:868, lx:-122, ly:973, text:torecBoardVal+' мм'},
      {type:'line', x1:200, y1:453, x2:200, y2:608},
      {type:'line', x1:15, y1:514, x2:200, y2:512},
      {type:'single', x1:-126, y1:353, x2:118, y2:513, lx:-126, ly:324, text:edgeDistVal+' мм'},
      {type:'line', x1:274, y1:54, x2:-91, y2:53},
      {type:'line', x1:274, y1:16, x2:-89, y2:16},
      {type:'line', x1:-38, y1:16, x2:-38, y2:54},
      {type:'single', x1:-134, y1:170, x2:-38, y2:33, lx:-142, ly:206, text:sideFrameVal+' мм'},
      {type:'line', x1:1198, y1:758, x2:1199, y2:980},
      {type:'double', x1:15, y1:950, x2:1198, y2:950, lx:604, ly:951, text:lengthVal+' мм'},
      {type:'line', x1:1015, y1:833, x2:1358, y2:833},
      {type:'line', x1:1356, y1:13, x2:1013, y2:15},
      {type:'double', x1:1318, y1:13, x2:1319, y2:836, lx:1325, ly:423, text:widthVal+' мм', vertical:true},
    ]; }
  },
  '0_4': {
    img: KRYSHKA_0L_4P_IMG_B64, IW: 1203, IH: 757,
    records: function(torecBoardVal, sideFrameVal, widthVal, lengthVal, edgeDistVal) { return [
      {type:'line', x1:279, y1:714, x2:208, y2:714},
      {type:'line', x1:320, y1:750, x2:166, y2:750},
      {type:'line', x1:248, y1:714, x2:248, y2:750},
      {type:'single', x1:-102, y1:736, x2:248, y2:736, lx:-147, ly:734, text:sideFrameVal+' мм'},
      {type:'line', x1:9, y1:378, x2:9, y2:528},
      {type:'line', x1:205, y1:380, x2:205, y2:529},
      {type:'line', x1:10, y1:502, x2:205, y2:502},
      {type:'single', x1:-124, y1:379, x2:109, y2:503, lx:-140, ly:354, text:edgeDistVal+' мм'},
      {type:'line', x1:10, y1:82, x2:10, y2:-111},
      {type:'line', x1:1191, y1:-122, x2:1192, y2:82},
      {type:'double', x1:11, y1:-86, x2:1190, y2:-96, lx:595, ly:-96, text:lengthVal+' мм'},
      {type:'line', x1:1074, y1:8, x2:1296, y2:6},
      {type:'line', x1:1298, y1:750, x2:1112, y2:750},
      {type:'double', x1:1267, y1:7, x2:1268, y2:750, lx:1279, ly:379, text:widthVal+' мм', vertical:true},
    ]; }
  },
  '0_3': {
    img: KRYSHKA_0L_3P_IMG_B64, IW: 1201, IH: 761,
    records: function(torecBoardVal, sideFrameVal, widthVal, lengthVal, edgeDistVal) { return [
      {type:'line', x1:278, y1:716, x2:205, y2:716},
      {type:'line', x1:142, y1:752, x2:313, y2:752},
      {type:'line', x1:242, y1:716, x2:242, y2:752},
      {type:'single', x1:-92, y1:737, x2:242, y2:734, lx:-142, ly:737, text:sideFrameVal+' мм'},
      {type:'line', x1:7, y1:307, x2:8, y2:531},
      {type:'line', x1:204, y1:307, x2:204, y2:530},
      {type:'line', x1:8, y1:381, x2:204, y2:382},
      {type:'single', x1:-141, y1:570, x2:113, y2:382, lx:-140, ly:586, text:edgeDistVal+' мм'},
      {type:'line', x1:8, y1:84, x2:8, y2:-89},
      {type:'line', x1:1191, y1:-96, x2:1191, y2:84},
      {type:'double', x1:1191, y1:-64, x2:6, y2:-63, lx:600, ly:-81, text:lengthVal+' мм'},
      {type:'line', x1:998, y1:10, x2:1317, y2:10},
      {type:'line', x1:1318, y1:751, x2:1000, y2:751},
      {type:'double', x1:1276, y1:10, x2:1276, y2:752},
      {type:'label', lx:1276, ly:344, text:widthVal+' мм', vertical:true},
    ]; }
  },
  '0_2': {
    img: KRYSHKA_0L_2P_IMG_B64, IW: 1197, IH: 762,
    records: function(torecBoardVal, sideFrameVal, widthVal, lengthVal, edgeDistVal) { return [
      {type:'line', x1:206, y1:713, x2:276, y2:713},
      {type:'line', x1:166, y1:751, x2:324, y2:750},
      {type:'line', x1:242, y1:714, x2:242, y2:751},
      {type:'single', x1:-69, y1:735, x2:242, y2:734, lx:-130, ly:736, text:sideFrameVal+' мм'},
      {type:'line', x1:201, y1:305, x2:202, y2:530},
      {type:'line', x1:7, y1:305, x2:6, y2:529},
      {type:'line', x1:7, y1:452, x2:202, y2:452},
      {type:'single', x1:-136, y1:298, x2:110, y2:452, lx:-140, ly:269, text:edgeDistVal+' мм'},
      {type:'line', x1:7, y1:83, x2:7, y2:-87},
      {type:'line', x1:1190, y1:82, x2:1188, y2:-84},
      {type:'double', x1:7, y1:-64, x2:1188, y2:-64, lx:584, ly:-72, text:lengthVal+' мм'},
      {type:'line', x1:1000, y1:8, x2:1342, y2:8},
      {type:'line', x1:998, y1:749, x2:1352, y2:749},
      {type:'double', x1:1299, y1:8, x2:1310, y2:749, lx:1310, ly:376, text:widthVal+' мм', vertical:true},
    ]; }
  },
};

// Доступные готовые сочетания (см. комментарий выше) - продольных: 0 (режим
// lidLayout='longitudinal', внутреннего продольного бруса нет вовсе) либо
// 2/3/4 (lidLayout='transverse'); для каждого продольного - свой набор
// доступных поперечных (не любое сочетание, см. имена файлов фото).
const KRYSHKA_LONG_OPTIONS = [0, 2, 3, 4];
const KRYSHKA_CROSS_BY_LONG = {0:[2,3,4], 2:[2,3], 3:[2,3,4], 4:[4]};

// Если расчётное сочетание (longbeamCount продольных × crossBeamCount
// поперечных) не входит в список готовых чертежей - берём ближайшее: сперва
// продольное (максимально точное совпадение, в приоритете), затем для него
// поперечное (максимально близкое из доступных именно для этого продольного) -
// по уточнению пользователя.
function nearestKryshkaVariant(longbeamCount, crossBeamCount){
  const bestLong = KRYSHKA_LONG_OPTIONS.reduce((a,b)=> Math.abs(b-longbeamCount)<Math.abs(a-longbeamCount) ? b : a);
  const crossOptions = KRYSHKA_CROSS_BY_LONG[bestLong];
  const bestCross = crossOptions.reduce((a,b)=> Math.abs(b-crossBeamCount)<Math.abs(a-crossBeamCount) ? b : a);
  return {longbeamCount: bestLong, crossBeamCount: bestCross, exact: bestLong===longbeamCount && bestCross===crossBeamCount};
}

// torecBoardVal - толщина доски торца (t32Display, с косметическим +2мм при
// «Оптимизировать размеры» - см. calc-ii1.js); отсутствует на чертеже при
// продольных=0 (см. KRYSHKA_VARIANTS - в этих 3 схемах доска торца не
// подписывается вовсе, по самой инструкции). sideFrameVal - толщина стойки +
// толщина доски обшивки бока (sideFrameDisplay - та же косметическая +2мм
// надбавка при «Оптимизировать размеры», по аналогии с torecBoardVal).
// widthVal/lengthVal - наружные ширина/длина ящика (outerW/k9Base).
// edgeDistVal - расстояние от края крышки до края крайнего поперечного
// бруса (calc.edgeDistCross) - по методике I-3: брусья делят длину крышки
// на (count+1) равных промежутков, а не flush-edge, как у стоек каркаса.
function diagramKryshka(longbeamCount, crossBeamCount, torecBoardVal, sideFrameVal, widthVal, lengthVal, widthPxOverride, edgeDistVal){
  const variant = nearestKryshkaVariant(longbeamCount, crossBeamCount);
  const v = KRYSHKA_VARIANTS[variant.longbeamCount + '_' + variant.crossBeamCount];
  const records = v.records(Math.round(torecBoardVal), Math.round(sideFrameVal), Math.round(widthVal), Math.round(lengthVal), Math.round(edgeDistVal));
  return renderDiagram(v.img, 'Крышка - схема расположения деталей', v.IW, v.IH, records, widthPxOverride, photoStrokeScale(v.IW));
}
