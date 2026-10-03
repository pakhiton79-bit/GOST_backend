// ГОСТ 10198-91, тип I-4: обшивка щита на чертежах - доски с промежутками,
// одной ширины на экране на всех чертежах крышки и щитов (drawnBoardStrips
// в common-diagrams.js, по указанию пользователя); у сплошного щита доски
// вплотную. Доски - светло-серые, рамка поверх - белая (как у торца I-2).
const I4_BOARD_FILL = '#d9d9d9';

// [начало, конец] каждой доски на отрезке top..bot. boardGap - промежутки
// ({ gap, ... }) или null - щит сплошной; k - единиц картинки на 1px экрана
// (diagramScreenScale).
function i4BoardStrips(top, bot, boardGap, k){
  return drawnBoardStrips(top, bot, k, boardGap ? boardGap.gap : null);
}

// Доски поперёк x0..x1 по полосам strips (SVG).
function i4BoardRects(x0, x1, strips){
  return strips.map(s => `<rect x="${i3f(x0)}" y="${i3f(s[0])}" width="${i3f(x1 - x0)}" height="${i3f(s[1] - s[0])}" fill="${I4_BOARD_FILL}"/>`).join('');
}

// Размер «промежуток между досками»: выносные линии от кромок досок (y1, y2)
// в точке x0 до dimX (dir = -1 - влево, 1 - вправо), к ним снаружи -
// стрелки длиной arrow; подпись - за размером (pad - зазор; ширина подписи
// оценивается по числу знаков, k - единиц картинки на 1px экрана).
function i4BoardGapRecords(x0, dimX, y1, y2, arrow, pad, gapVal, k, dir){
  const text = dimLabel(gapVal) + ' мм';
  const halfW = (text.length * 8.2 + 16) / 2 * k;
  const s = dir || -1;
  return [
    {type:'line', x1:x0, y1, x2:dimX + s*pad, y2:y1},
    {type:'line', x1:x0, y1:y2, x2:dimX + s*pad, y2},
    {type:'single', x1:dimX, y1:y1 - arrow, x2:dimX, y2:y1},
    {type:'single', x1:dimX, y1:y2 + arrow, x2:dimX, y2},
    {type:'line', x1:dimX, y1, x2:dimX, y2},
    {type:'label', lx:dimX + s*(pad + halfW), ly:(y1 + y2) / 2, text},
  ];
}
