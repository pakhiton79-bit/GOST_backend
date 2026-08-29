// ГОСТ 10198-91, тип I-3: чертёж "Дно". Вынесен из diagrams.js в отдельный
// файл (по узлам - см. также kryshka.js, end-panel.js, bokovoy.js). Зависит
// от renderDiagram/photoStrokeScale из common-diagrams.js (должен быть
// подключён раньше в HTML).
const DNO_IMG_B64 = "/images/dno.png"; // натуральный размер 385x197

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
