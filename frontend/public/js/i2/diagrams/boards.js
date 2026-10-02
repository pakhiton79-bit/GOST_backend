// ГОСТ 10198-91, тип I-2: обшивка щита на чертежах - доски с промежутками
// и размер промежутка (общее для щитов в panel-generated.js и торца в
// torec.js).

// Щит на чертеже - не сплошной прямоугольник, а 3 доски (по указанию
// пользователя) с промежутками. Промежуток - схематичный, всегда одной и той
// же доли frac высоты щита (по указанию пользователя - одинаково на всех
// чертежах, настоящий размер подписан); у сплошного щита (hasGap = false)
// доски вплотную. Возвращает [верх, низ] каждой доски.
function boardStrips(top, bot, hasGap, frac){
  const F = bot - top;
  const g = hasGap ? F * frac : 0;
  const h = (F - 2*g) / 3;
  return [[top, top + h], [top + h + g, top + 2*h + g], [top + 2*h + 2*g, bot]];
}

// Размер «промежуток между досками»: выносные линии от кромок досок (y1, y2)
// в точке x0 влево до dimX, к ним снаружи - стрелки длиной arrow (промежуток
// узкий); подпись - левее размера (pad - зазор; ширина подписи оценивается
// по числу знаков, в тех же единицах, что arrow).
function boardGapRecords(x0, dimX, y1, y2, arrow, pad, gapVal){
  const text = fmtMm(gapVal) + ' мм';
  const halfW = (text.length * 4.2 + 8) * arrow / 24;
  return [
    {type:'line', x1:x0, y1, x2:dimX - pad, y2:y1},
    {type:'line', x1:x0, y1:y2, x2:dimX - pad, y2},
    {type:'single', x1:dimX, y1:y1 - arrow, x2:dimX, y2:y1},
    {type:'single', x1:dimX, y1:y2 + arrow, x2:dimX, y2},
    {type:'line', x1:dimX, y1, x2:dimX, y2},
    {type:'label', lx:dimX - pad - halfW, ly:(y1 + y2) / 2, text},
  ];
}
