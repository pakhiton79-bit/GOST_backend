const DNO_IMG_B64 = "/images/dno.png"; // натуральный размер 385x197

// Схема "Дно": картинка на заднем плане, стрелки - SVG-слой в пиксельных
// координатах картинки (не масштабируется вместе с текстом), подписи - обычные
// TOREC_1_IMG_B64 и TOREC_0_IMG_B64 - см. src/common-diagrams.js (общие с типом I-1).
const TOREC_2_IMG_B64 = "/images/torec_2.png"; // натуральный размер 1811x842 (вариант с 2 раскосинами)
const TOREC_3_IMG_B64 = "/images/torec_3.jpg"; // натуральный размер 2476x802 (вариант с 3 раскосинами)
const TOREC_2FLOORS_1_IMG_B64 = "/images/torec_2floors_1raskosina.jpg"; // натуральный размер 695x1051 (2 этажа, по 1 раскосине на этаж)
const TOREC_2FLOORS_2_IMG_B64 = "/images/torec_2floors_2raskosina.jpg"; // натуральный размер 1222x1044 (2 этажа, по 2 раскосины на этаж)
const TOREC_2FLOORS_3_IMG_B64 = "/images/torec_2floors_3raskosina.jpg"; // натуральный размер 1757x1030 (2 этажа, по 3 раскосины на этаж)

const KRYSHKA_IMG_B64 = "/images/kryshka.png"; // натуральный размер 1718x1274
const KRYSHKA_2BEAMS_IMG_B64 = "/images/kryshka_2beams.jpg"; // натуральный размер 1157x839 (вариант с 2 поперечными брусьями)

// наконечник считается вручную по углу линии, чтобы кончик точно совпадал с указанной точкой
// Фото подобраны по числу планок бокового щита (l19) и наличию раскосины -
// раскосин всегда (число планок - 1), т.к. одна раскосина на каждую секцию
// между соседними планками (см. bokHasRaskosina/l42 в app.js).
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

// headTriangle, photoStrokeScale, DIAGRAM_DEFAULT_WIDTH/DIAGRAM_MAX_HEIGHT,
// renderDiagram - см. src/common-diagrams.js (общие с типом I-1).

function diagramDno(skidLenMm, tBokDoska, outerWidthMm, tBokPlanka, tTorcaPlusPlanka){
  const skidLen   = Math.round(skidLenMm);
  const valBok    = Math.round(tBokDoska);
  const valWidth  = Math.round(outerWidthMm - tBokPlanka*2);
  const valTorca  = Math.round(tTorcaPlusPlanka);

  const records = [
    {type:'line', x1:1903, y1:434, x2:2067, y2:523},
    {type:'line', x1:664, y1:1079, x2:850, y2:1176},
    {type:'double', x1:2064, y1:531, x2:854, y2:1174, lx:1596, ly:956, text: skidLen+' мм'},
    {type:'line', x1:1843, y1:491, x2:2022, y2:397},
    {type:'line', x1:1881, y1:517, x2:2057, y2:423},
    {type:'single', x1:1794, y1:-78, x2:1947, y2:456, lx:1738, ly:-97, text: valBok+' мм'},
    {type:'line', x1:853, y1:1073, x2:593, y2:1208},
    {type:'line', x1:103, y1:676, x2:-125, y2:808},
    {type:'double', x1:-119, y1:814, x2:583, y2:1203, lx:104, ly:1056, text: valWidth+' мм'},
    {type:'line', x1:156, y1:750, x2:-12, y2:656},
    {type:'line', x1:119, y1:769, x2:-46, y2:679},
    {type:'single', x1:222, y1:48, x2:37, y2:699, lx:181, ly:22, text: valTorca+' мм'}
  ];

  return renderDiagram(DNO_IMG_B64, 'Дно - схема расположения деталей', 2008, 1212, records, null, photoStrokeScale(2008));
}

// diagramPlaceholder, diagramEndPanel1Raskosina - см. src/common-diagrams.js (общие с типом I-1).

function diagramEndPanel2Raskosina(heightPlusT12Val, planLenVal){
  // Фото-чертёж для варианта с 2 раскосинами (натуральный размер 1811×842).
  const val = Math.round(heightPlusT12Val);           // полная высота рамы щита = высота груза + толщина доски дна
  const planLen = Math.round(planLenVal);             // длина горизонтальной планки = ширина груза

  const records = [
    {type:'line', x1:24, y1:177, x2:23, y2:-122},
    {type:'line', x1:1787, y1:176, x2:1786, y2:-111},
    {type:'double', x1:23, y1:-97, x2:1786, y2:-97, lx:910, ly:-139, text: planLen+' мм'},
    {type:'line', x1:1625, y1:20, x2:1970, y2:19},
    {type:'line', x1:1635, y1:829, x2:1971, y2:830},
    {type:'double', x1:1931, y1:21, x2:1934, y2:832, lx:1923, ly:427, text: val+' мм', vertical:true}
  ];

  return renderDiagram(TOREC_2_IMG_B64, 'Щит торцевой (2 раскосины) - схема расположения деталей', 1811, 842, records, 210, photoStrokeScale(1811));
}

function diagramEndPanel3Raskosina(heightPlusT12Val, planLenVal){
  // Фото-чертёж для варианта с 3 раскосинами (натуральный размер 2476×802).
  const val = Math.round(heightPlusT12Val);           // полная высота рамы щита = высота груза + толщина доски дна
  const planLen = Math.round(planLenVal);             // длина горизонтальной планки = ширина груза

  const records = [
    {type:'line', x1:13, y1:636, x2:4, y2:964},
    {type:'line', x1:2453, y1:637, x2:2453, y2:973},
    {type:'double', x1:9, y1:908, x2:2451, y2:910, lx:1231, ly:913, text: planLen+' мм'},
    {type:'line', x1:2302, y1:15, x2:2651, y2:13},
    {type:'line', x1:2316, y1:790, x2:2653, y2:790},
    {type:'double', x1:2593, y1:13, x2:2598, y2:793, lx:2598, ly:424, text: val+' мм', vertical:true}
  ];

  return renderDiagram(TOREC_3_IMG_B64, 'Щит торцевой (3 раскосины) - схема расположения деталей', 2476, 802, records, 210, photoStrokeScale(2476));
}

function diagramEndPanel2Floors1Raskosina(heightPlusT12Val, floorSpanVal, planLenVal){
  // Фото-чертёж для варианта на 2 этажа, по 1 раскосине на этаж (натуральный размер
  // 695×1051). floorSpanVal — длина вертикальной планки одного этажа + ширина одной
  // горизонтальной планки (нижняя/средняя планка + вертикальная планка нижнего этажа).
  const val = Math.round(heightPlusT12Val);       // полная высота рамы щита = высота груза + толщина доски дна
  const floorSpan = Math.round(floorSpanVal);
  const planLen = Math.round(planLenVal);          // длина горизонтальной планки = ширина груза

  const records = [
    {type:'line', x1:568, y1:34, x2:899, y2:34},
    {type:'line', x1:573, y1:1026, x2:903, y2:1028},
    {type:'double', x1:838, y1:35, x2:839, y2:1031, lx:839, ly:537, text: val+' мм', vertical:true},
    {type:'line', x1:134, y1:582, x2:-160, y2:586},
    {type:'line', x1:135, y1:1025, x2:-159, y2:1024},
    {type:'double', x1:-101, y1:588, x2:-99, y2:1025, lx:-116, ly:796, text: floorSpan+' мм', vertical:true},
    {type:'line', x1:676, y1:140, x2:677, y2:-96},
    {type:'line', x1:29, y1:140, x2:27, y2:-102},
    {type:'double', x1:27, y1:-80, x2:676, y2:-78, lx:352, ly:-86, text: planLen+' мм'}
  ];

  return renderDiagram(TOREC_2FLOORS_1_IMG_B64, 'Щит торцевой (2 этажа, 1 раскосина на этаж) - схема расположения деталей', 695, 1051, records, null, photoStrokeScale(695));
}

function diagramEndPanel2Floors2Raskosina(heightPlusT12Val, floorSpanVal, planLenVal){
  // Фото-чертёж для варианта на 2 этажа, по 2 раскосины на этаж (натуральный размер
  // 1222×1044). floorSpanVal — длина вертикальной планки одного этажа + ширина одной
  // горизонтальной планки (та же величина, что и на чертеже с 1 раскосиной на этаж).
  const val = Math.round(heightPlusT12Val);       // полная высота рамы щита = высота груза + толщина доски дна
  const floorSpan = Math.round(floorSpanVal);
  const planLen = Math.round(planLenVal);          // длина горизонтальной планки = ширина груза

  const records = [
    {type:'line', x1:1101, y1:26, x2:1425, y2:26},
    {type:'line', x1:1104, y1:1018, x2:1424, y2:1020},
    {type:'double', x1:1339, y1:26, x2:1339, y2:1020, lx:1340, ly:528, text: val+' мм', vertical:true},
    {type:'line', x1:126, y1:575, x2:-177, y2:576},
    {type:'line', x1:131, y1:1016, x2:-179, y2:1020},
    {type:'double', x1:-115, y1:576, x2:-114, y2:1020, lx:-115, ly:795, text: floorSpan+' мм', vertical:true},
    {type:'line', x1:20, y1:132, x2:18, y2:-131},
    {type:'line', x1:1205, y1:133, x2:1207, y2:-128},
    {type:'double', x1:19, y1:-109, x2:1207, y2:-112, lx:604, ly:-124, text: planLen+' мм'}
  ];

  return renderDiagram(TOREC_2FLOORS_2_IMG_B64, 'Щит торцевой (2 этажа, 2 раскосины на этаж) - схема расположения деталей', 1222, 1044, records, 210, photoStrokeScale(1222));
}

function diagramEndPanel2Floors3Raskosina(heightPlusT12Val, floorSpanVal, planLenVal){
  // Фото-чертёж для варианта на 2 этажа, по 3 раскосины на этаж (натуральный размер
  // 1757×1030). floorSpanVal — длина вертикальной планки одного этажа + ширина одной
  // горизонтальной планки (та же величина, что и на остальных чертежах 2 этажей).
  const val = Math.round(heightPlusT12Val);       // полная высота рамы щита = высота груза + толщина доски дна
  const floorSpan = Math.round(floorSpanVal);
  const planLen = Math.round(planLenVal);          // длина горизонтальной планки = ширина груза

  const records = [
    {type:'line', x1:120, y1:568, x2:-163, y2:566},
    {type:'line', x1:127, y1:1010, x2:-167, y2:1011},
    {type:'double', x1:-106, y1:567, x2:-106, y2:1010, lx:-110, ly:784, text: floorSpan+' мм', vertical:true},
    {type:'line', x1:1645, y1:1010, x2:1938, y2:1010},
    {type:'line', x1:1928, y1:19, x2:1635, y2:16},
    {type:'double', x1:1877, y1:19, x2:1879, y2:1012, lx:1880, ly:518, text: val+' мм', vertical:true},
    {type:'line', x1:1742, y1:127, x2:1743, y2:-128},
    {type:'line', x1:15, y1:-128, x2:15, y2:126},
    {type:'double', x1:13, y1:-100, x2:1741, y2:-101, lx:1154, ly:-102, text: planLen+' мм'}
  ];

  return renderDiagram(TOREC_2FLOORS_3_IMG_B64, 'Щит торцевой (2 этажа, 3 раскосины на этаж) - схема расположения деталей', 1757, 1030, records, 210, photoStrokeScale(1757));
}

// diagramEndPanelNoRaskosina - см. src/common-diagrams.js (общие с типом I-1).

function diagramEndPanel(k32val, sectionsVal, hasRaskosinaVal, innerWidthVal, heightPlusT12Val, useNoRaskosinaDiagram, floorsVal, floorSpanVal){
  // Новый фото-чертёж (рамка) показываем только при H≤600 либо когда раскосина не
  // требуется по углу (1 секция, угол >60°) — не при W≤600 (по указанию пользователя,
  // при W≤600 и H>600 возвращена прежняя заглушка). Для 1, 2 и 3 раскосин — свои фото.
  // Для секций больше 3 (пока максимум 4) фото ещё нет — показываем чертёж с
  // максимальным доступным числом раскосин (3) вместо заглушки: расположение планок
  // то же самое, просто не хватает одной секции на фото.
  // Для щита на 2 этажа (наружная высота >2000мм) фото есть для 1, 2 и 3 раскосин на
  // этаж (1, 2 или 3 секции по ширине). Для 4 секций - тот же приём, что и на 1 этаже:
  // показываем фото с максимальным доступным числом раскосин (3) вместо заглушки.
  if(floorsVal === 2){
    if(hasRaskosinaVal && sectionsVal <= 1){
      return diagramEndPanel2Floors1Raskosina(heightPlusT12Val, floorSpanVal, innerWidthVal);
    }
    if(hasRaskosinaVal && sectionsVal === 2){
      return diagramEndPanel2Floors2Raskosina(heightPlusT12Val, floorSpanVal, innerWidthVal);
    }
    if(hasRaskosinaVal && sectionsVal >= 3){
      return diagramEndPanel2Floors3Raskosina(heightPlusT12Val, floorSpanVal, innerWidthVal);
    }
    // Раскосина не нужна (угол >60° даже при 1 секции - узкий и высокий этаж) - для
    // такого случая на 2 этажа фото нет, переиспользуем одноэтажный чертёж без
    // раскосины на высоту одного этажа (предупреждение - на вызывающей стороне).
    return diagramEndPanelNoRaskosina(floorSpanVal, innerWidthVal);
  }
  if(useNoRaskosinaDiagram){
    return diagramEndPanelNoRaskosina(heightPlusT12Val, k32val);
  }
  if(hasRaskosinaVal && sectionsVal <= 1){
    return diagramEndPanel1Raskosina(heightPlusT12Val, innerWidthVal);
  }
  if(hasRaskosinaVal && sectionsVal === 2){
    return diagramEndPanel2Raskosina(heightPlusT12Val, innerWidthVal);
  }
  if(hasRaskosinaVal && sectionsVal >= 3){
    return diagramEndPanel3Raskosina(heightPlusT12Val, innerWidthVal);
  }

  return diagramPlaceholder('Щит торцевой');
}

function diagramKryshkaDefault(widthMm, lengthMm, t30, t32, t41, t40, edgeDistKryshkaMm, crossBeamQty, crossBeamWidthMm, plankGapMm){
  // Фото под 3 планки крышки (l19=3) - выбор чертежа крышки идёт по l19, см. diagramKryshka().
  // Длина крышки = длина груза + (толщина доски торца + толщина планки торца)*2 (см. k9Base).
  const valLen        = Math.round(lengthMm + t30*2 + t32*2);
  // Ширина груза + толщина основной доски боковой стенки*2.
  const valWidth       = Math.round(widthMm + t41*2);
  // Толщина вертикальной боковой планки (t40, планка бокового щита) - при
  // «Оптимизировать размеры» увеличена на 2мм (см. вызов в app.js).
  const valPlankaThick  = Math.round(t40);
  // Расстояние от крайней планки крышки до края крышки (edgeDistKryshka = min(L/6, 1000)).
  const valEdgePlanka   = Math.round(edgeDistKryshkaMm);
  // Расстояние от крайнего поперечного бруса до края крышки: из длины крышки вычитаем
  // суммарную ширину, занятую самими брусьями (количество × ширина бруса), остаток делим
  // поровну на «количество брусьев + 1» промежутков.
  const valEdgeBeam     = crossBeamQty > 0
    ? Math.round((valLen - crossBeamQty*crossBeamWidthMm) / (crossBeamQty + 1))
    : Math.round(valLen);
  // Расстояние между соседними планками крышки (plankGapMm) на чертеже не
  // показываем - по замечанию пользователя, лишняя метка (не нужна помимо
  // остальных размеров крышки).

  const records = [
    {type:'line', x1:371, y1:1138, x2:506, y2:1432},
    {type:'line', x1:1661, y1:702, x2:1799, y2:1003},
    {type:'double', x1:1791, y1:991, x2:497, y2:1411, lx:1203, ly:1218, text: valLen+' мм'},
    {type:'line', x1:1140, y1:95, x2:1599, y2:-52},
    {type:'line', x1:1494, y1:845, x2:1909, y2:710},
    {type:'double', x1:1526, y1:-28, x2:1899, y2:714, lx:1748, ly:350, text: valWidth+' мм'},
    {type:'line', x1:1401, y1:160, x2:1245, y2:-168},
    {type:'line', x1:1093, y1:110, x2:993, y2:-101},
    {type:'double', x1:1006, y1:-73, x2:1255, y2:-150, lx:1115, ly:-141, text: valEdgePlanka+' мм'},
    {type:'double', x1:299, y1:989, x2:441, y2:936},
    {type:'single', x1:194, y1:1236, x2:377, y2:959, lx:205, ly:1296, text: valEdgeBeam+' мм'},
    {type:'line', x1:273, y1:422, x2:251, y2:378},
    {type:'single', x1:-51, y1:266, x2:263, y2:400, lx:-85, ly:225, text: valPlankaThick+' мм'}
  ];

  return renderDiagram(KRYSHKA_IMG_B64, 'Крышка - схема расположения деталей', 1718, 1274, records, null, photoStrokeScale(1718));
}

function diagramKryshka2Beams(widthMm, lengthMm, t30, t32, t41, t40, edgeDistKryshkaMm, crossBeamQty, crossBeamWidthMm, plankGapMm){
  // Фото под 2 планки крышки (l19=2, натуральный размер 1157×839) - выбор чертежа
  // крышки идёт по l19, см. diagramKryshka().
  const valLen      = Math.round(lengthMm + t30*2 + t32*2);
  const valWidth    = Math.round(widthMm + t41*2);
  const valPlankaThick = Math.round(t40);
  const valEdgePlanka  = Math.round(edgeDistKryshkaMm);
  const valEdgeBeam    = crossBeamQty > 0
    ? Math.round((valLen - crossBeamQty*crossBeamWidthMm) / (crossBeamQty + 1))
    : Math.round(valLen);
  // Расстояние между соседними планками крышки (plankGapMm) на чертеже не
  // показываем - по замечанию пользователя, лишняя метка (не нужна помимо
  // остальных размеров крышки, см. тот же фикс в diagramKryshkaDefault выше).

  const records = [
    {type:'line', x1:373, y1:758, x2:433, y2:865},
    {type:'line', x1:244, y1:734, x2:353, y2:939},
    {type:'line', x1:320, y1:877, x2:420, y2:843},
    {type:'single', x1:81, y1:828, x2:372, y2:857, lx:53, ly:799, text: valEdgePlanka+' мм'},
    {type:'line', x1:184, y1:175, x2:-107, y2:268},
    {type:'line', x1:222, y1:236, x2:-82, y2:331},
    {type:'line', x1:-76, y1:256, x2:-50, y2:320},
    {type:'single', x1:250, y1:-31, x2:-63, y2:289, lx:301, ly:-65, text: valPlankaThick+' мм'},
    {type:'line', x1:1098, y1:453, x2:1199, y2:642},
    {type:'double', x1:347, y1:929, x2:1200, y2:641, lx:805, ly:779, text: valLen+' мм'},
    {type:'line', x1:764, y1:62, x2:995, y2:-13},
    {type:'line', x1:1007, y1:552, x2:1234, y2:480},
    {type:'double', x1:996, y1:-13, x2:1236, y2:479, lx:1155, ly:205, text: valWidth+' мм'},
    {type:'line', x1:173, y1:351, x2:75, y2:384},
    {type:'single', x1:28, y1:607, x2:117, y2:371, lx:5, ly:639, text: valEdgeBeam+' мм'}
  ];

  return renderDiagram(KRYSHKA_2BEAMS_IMG_B64, 'Крышка (2 поперечных бруса) - схема расположения деталей', 1157, 839, records, null, photoStrokeScale(1157));
}

function diagramKryshka(widthMm, lengthMm, t30, t32, t41, t40, edgeDistKryshkaMm, crossBeamQty, crossBeamWidthMm, plankCount, plankGapMm){
  // Выбор чертежа крышки идёт по количеству планок крышки (l19), а не по числу
  // поперечных брусьев: доступны 2 фото - под 2 планки и под 3. Для l19>3 показываем
  // фото под 3 планки (расположение планок то же самое, просто на фото меньше
  // планок, чем в реальном ящике) - как раньше делалось по числу брусьев.
  if(plankCount <= 2){
    return diagramKryshka2Beams(widthMm, lengthMm, t30, t32, t41, t40, edgeDistKryshkaMm, crossBeamQty, crossBeamWidthMm, plankGapMm);
  }
  return diagramKryshkaDefault(widthMm, lengthMm, t30, t32, t41, t40, edgeDistKryshkaMm, crossBeamQty, crossBeamWidthMm, plankGapMm);
}

// Шесть чертежей ниже подобраны по фактическому числу планок бокового щита (l19)
// и наличию раскосины - число раскосин всегда (число планок - 1), т.к. одна
// раскосина ставится на каждую секцию между соседними планками (см. bokHasRaskosina
// в app.js). Подписи размещены по единой схеме на всех шести фото: длина доски бока
// (сверху, горизонтальная), высота груза+доски дна (справа, вертикальная), напуск
// на полоз (снизу справа, у последней планки), отступ до первой планки (снизу
// слева, у первой планки) - координаты у каждого фото свои (см. комментарий к
// каждой функции), т.к. сами фото разного размера.

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
    // есть почти всегда (см. bokHasRaskosina в app.js), отдельных фото «без
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
