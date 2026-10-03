// ГОСТ 10198-91, тип II-2: обшивка на чертежах - доски с промежутками, одной
// ширины на экране на всех чертежах крышки и щитов (drawnBoardStrips в
// common-diagrams.js, по указанию пользователя; число досок на чертеже -
// сколько поместится); сплошной щит - доски вплотную. Доски светло-серые,
// каркас и брусья поверх - белые (как у I-4).
const II2_BOARD_FILL = '#d9d9d9';

// [начало, конец] досок на отрезке a..b: boardGap - промежутки ({ gap, cut,
// ... }) или null - сплошь; k - единиц картинки на 1px экрана
// (diagramScreenScale). cut - на сколько мм крайние доски уже 100 (бок при
// досках крышки поперёк продолжает её линии, см. bokovoy.js): раскладка - на
// отрезке, шире на cut с каждой стороны, крайние доски обрезаются по краям.
function ii2BoardStrips(a, b, boardGap, k){
  const cutPx = boardGap && boardGap.cut > 0 ? drawnMemberWidth(k) * boardGap.cut / 100 : 0;
  const strips = drawnBoardStrips(a - cutPx, b + cutPx, k, boardGap ? boardGap.gap : null);
  if(cutPx > 0 && strips.length){
    strips[0][0] = a;
    strips[strips.length - 1][1] = b;
  }
  return strips;
}

// SVG-прямоугольники досок: vertical - доски стоят (полосы по x на
// y0..y1), иначе лежат (полосы по y на x0..x1).
function ii2BoardRects(strips, vertical, c0, c1){
  const f = v => v.toFixed(1);
  return strips.map(([s, e]) => vertical
    ? `<rect x="${f(s)}" y="${f(c0)}" width="${f(e - s)}" height="${f(c1 - c0)}" fill="${II2_BOARD_FILL}"/>`
    : `<rect x="${f(c0)}" y="${f(s)}" width="${f(c1 - c0)}" height="${f(e - s)}" fill="${II2_BOARD_FILL}"/>`).join('');
}

// Промежуток для размера - между досками, середина которого ближе всего к
// точке at. [кромка 1, кромка 2] или null.
function ii2PickGap(strips, at){
  let best = null;
  for(let i = 0; i < strips.length - 1; i++){
    const g = [strips[i][1], strips[i + 1][0]];
    if(g[1] - g[0] <= 0) continue;
    if(!best || Math.abs((g[0] + g[1]) / 2 - at) < Math.abs((best[0] + best[1]) / 2 - at)) best = g;
  }
  return best;
}

// Размер «промежуток между досками»: кромки p1, p2 (по оси размера), выносные
// линии от edge до dim (+ вылет pad), стрелки снаружи длиной arrow, подпись
// за правой (нижней) стрелкой. horizontal - кромки по x (размер
// горизонтальный, выносные линии вертикальные), иначе - по y. k - единиц
// картинки на 1px экрана (для ширины подписи), labelScale - масштаб подписей.
function ii2BoardGapRecords(p1, p2, edge, dim, arrow, gapVal, k, labelScale, horizontal){
  const text = dimLabel(gapVal) + ' мм';
  const halfW = (text.length * 8.2 + 16) / 2 * k * (labelScale || 1);
  const halfH = 11 * k * (labelScale || 1);
  const out = dim + Math.sign(dim - edge) * 0.25 * arrow;
  const P = (a, b) => horizontal ? {x: a, y: b} : {x: b, y: a};
  const seg = (type, a1, b1, a2, b2) => { const s = P(a1, b1), e = P(a2, b2); return {type, x1: s.x, y1: s.y, x2: e.x, y2: e.y}; };
  const lab = horizontal ? P(p2 + arrow + 0.3 * arrow + halfW, dim) : P(p2 + arrow + 0.3 * arrow + halfH, dim);
  return [
    seg('line', p1, edge, p1, out),
    seg('line', p2, edge, p2, out),
    seg('single', p1 - arrow, dim, p1, dim),
    seg('single', p2 + arrow, dim, p2, dim),
    seg('line', p1, dim, p2, dim),
    {type: 'label', lx: lab.x, ly: lab.y, text},
  ];
}
