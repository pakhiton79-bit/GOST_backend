// ГОСТ 10198-91, тип II-1: чертёж «Дно» + общий вид ящика. Перенесено из
// src/ii1/diagrams.js исходного репозитория pakhiton79-bit/GOST_10198-91.
// BOX_II1_IMG_B64 - общий вид ящика (без расчётных подписей), используется и
// на самом сайте (см. calc-ii1.js), и в печати - по аналогии с
// BOX_I1_IMG_B64/BOX_IMG_B64 у типов I-1/I-3.
const BOX_II1_IMG_B64 = "/images/box_ii1.png";
const DNO_IMG_B64 = "/images/dno_ii1.jpg";
const DNO_IW = 2008, DNO_IH = 1212;

// Дно - одна схема (не зависит от количества полозьев, в отличие от Крышки/
// Щита торцевого) - координаты из присланной пользователем разметки фото
// dno_ii1.jpg (2008x1212).
function diagramDno(stojkaVal, skinVal, skidWidthVal, outerLenVal){
  const stojka = Math.round(stojkaVal), skin = Math.round(skinVal);
  const skidWidth = Math.round(skidWidthVal), outerLen = Math.round(outerLenVal);
  const records = [];
  records.push(
    {type:'line', x1:102, y1:676, x2:-85, y2:794},
    {type:'line', x1:813, y1:1092, x2:623, y2:1195},
    {type:'double', x1:-57, y1:784, x2:643, y2:1183, lx:260, ly:979, text:skidWidth+' мм'}
  );
  records.push(
    {type:'line', x1:666, y1:1080, x2:990, y2:1258},
    {type:'line', x1:1903, y1:434, x2:2160, y2:588},
    {type:'double', x1:2158, y1:581, x2:983, y2:1254, lx:1610, ly:924, text:outerLen+' мм'}
  );
  records.push(
    {type:'line', x1:152, y1:746, x2:-29, y2:639},
    {type:'line', x1:118, y1:771, x2:-70, y2:658},
    {type:'line', x1:-22, y1:685, x2:14, y2:665},
    {type:'single', x1:-7, y1:422, x2:-6, y2:676, lx:-8, ly:375, text:(stojka+skin)+' мм'}
  );
  records.push(
    {type:'line', x1:1870, y1:522, x2:2046, y2:422},
    {type:'line', x1:1839, y1:495, x2:2009, y2:399},
    {type:'line', x1:1983, y1:414, x2:2025, y2:433},
    {type:'single', x1:2007, y1:223, x2:2007, y2:424, lx:2006, ly:183, text:stojka+' мм'}
  );
  return renderDiagram(DNO_IMG_B64, 'Дно - схема расположения деталей', DNO_IW, DNO_IH, records, undefined, photoStrokeScale(DNO_IW));
}
