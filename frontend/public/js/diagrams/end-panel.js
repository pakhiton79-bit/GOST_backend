// ГОСТ 10198-91, тип I-3: чертежи "Щит торцевой". Вынесены из diagrams.js в
// отдельный файл (по узлам - см. также dno.js, kryshka.js, bokovoy.js).
// diagramEndPanel1Raskosina/diagramEndPanelNoRaskosina/diagramPlaceholder -
// см. common-diagrams.js (общие с типом I-1), должен быть подключён раньше.
const TOREC_2_IMG_B64 = "/images/torec_2.png"; // натуральный размер 1811x842 (вариант с 2 раскосинами)
const TOREC_3_IMG_B64 = "/images/torec_3.jpg"; // натуральный размер 2476x802 (вариант с 3 раскосинами)
const TOREC_2FLOORS_1_IMG_B64 = "/images/torec_2floors_1raskosina.jpg"; // натуральный размер 695x1051 (2 этажа, по 1 раскосине на этаж)
const TOREC_2FLOORS_2_IMG_B64 = "/images/torec_2floors_2raskosina.jpg"; // натуральный размер 1222x1044 (2 этажа, по 2 раскосины на этаж)
const TOREC_2FLOORS_3_IMG_B64 = "/images/torec_2floors_3raskosina.jpg"; // натуральный размер 1757x1030 (2 этажа, по 3 раскосины на этаж)

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
