// ГОСТ 10198-91, тип I-3: чертёж "Крышка". Вынесен из diagrams.js в
// отдельный файл (по узлам - см. также dno.js, end-panel.js, bokovoy.js).
// Зависит от renderDiagram/photoStrokeScale из common-diagrams.js.
const KRYSHKA_IMG_B64 = "/images/kryshka.png"; // натуральный размер 1718x1274
const KRYSHKA_2BEAMS_IMG_B64 = "/images/kryshka_2beams.jpg"; // натуральный размер 1157x839 (вариант с 2 поперечными брусьями)

function diagramKryshkaDefault(widthMm, lengthMm, t30, t32, t41, t40, edgeDistKryshkaMm, crossBeamQty, crossBeamWidthMm, plankGapMm){
  // Фото под 3 планки крышки (l19=3) - выбор чертежа крышки идёт по l19, см. diagramKryshka().
  // Длина крышки = длина груза + (толщина доски торца + толщина планки торца)*2 (см. k9Base).
  const valLen        = Math.round(lengthMm + t30*2 + t32*2);
  // Ширина груза + толщина основной доски боковой стенки*2.
  const valWidth       = Math.round(widthMm + t41*2);
  // Толщина вертикальной боковой планки (t40, планка бокового щита) - при
  // «Оптимизировать размеры» увеличена на 2мм (см. вызов в app-i3.js).
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
