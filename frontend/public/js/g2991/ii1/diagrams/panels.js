// ГОСТ 2991-85, тип II-1: чертежи узлов - плоские схемы (SVG, как щиты
// III-1): доски светло-серые полосами (одной ширины на экране, число - сколько
// поместится, drawnBoardStrips в common-diagrams.js), планки торца - белые
// поверх. Подписи (по указанию пользователя): у всех узлов длина и высота
// (у дна и крышки - ширина), у торца ещё расстояние между планками.
// Размеры - из расчёта (calc.drawing).
const G2991_PANEL_IW = 2222;                       // ширина картинки
const G2991_PANEL_MIN_RATIO = 0.3, G2991_PANEL_MAX_RATIO = 1.2; // пределы высоты кадра, доли ширины
const G2991_PANEL_WIDTH = 260, G2991_PANEL_LABEL_SCALE = 0.8;
const G2991_BOARD_FILL = '#d9d9d9';

// lenMm × heightMm - габариты узла; boards - 'h' (доски вдоль длины, полосы
// друг над другом), 'v' (доски поперёк, полосы рядом), 'edges' (только 2
// доски у верхнего и нижнего края - «Без крышки»); planks - 'v' (2 планки у
// левого и правого края), 'h' (у верхнего и нижнего) или null; plankMm -
// ширина планки, plankGapMm - расстояние между планками (подпись).
function diagramG2991Panel(altText, lenMm, heightMm, boards, planks, plankMm, plankGapMm){
  const IW = G2991_PANEL_IW;
  const IH = IW * Math.min(G2991_PANEL_MAX_RATIO, Math.max(G2991_PANEL_MIN_RATIO, heightMm / lenMm));
  const f = v => v.toFixed(1);
  const widthPx = G2991_PANEL_WIDTH, ls = G2991_PANEL_LABEL_SCALE;
  const k = IW / widthPx;                                  // единиц картинки на 1px экрана
  const ks = diagramScreenScale(IW, IH), stroke = 1.2 * ks;
  const rect = (x1, y1, x2, y2, fill) => `<rect x="${f(x1)}" y="${f(y1)}" width="${f(x2-x1)}" height="${f(y2-y1)}"${fill ? ` fill="${fill}"` : ''}/>`;
  let shapes = '';
  if(boards === 'h') drawnBoardStrips(0, IH, ks, null).forEach(([a, b]) => { shapes += rect(0, a, IW, b, G2991_BOARD_FILL); });
  else if(boards === 'v') drawnBoardStrips(0, IW, ks, null).forEach(([a, b]) => { shapes += rect(a, 0, b, IH, G2991_BOARD_FILL); });
  else if(boards === 'edges'){
    const bw = drawnMemberWidth(ks);
    shapes += rect(0, 0, IW, bw, G2991_BOARD_FILL) + rect(0, IH - bw, IW, IH, G2991_BOARD_FILL);
  }
  // Планки - шириной детали на экране, по краям.
  const pw = drawnMemberWidth(ks);
  if(planks === 'v') shapes += rect(0, 0, pw, IH, '#fff') + rect(IW - pw, 0, IW, IH, '#fff');
  if(planks === 'h') shapes += rect(0, 0, IW, pw, '#fff') + rect(0, IH - pw, IW, IH, '#fff');
  const outline = boards === 'edges'
    ? `<rect x="${f(stroke/2)}" y="${f(stroke/2)}" width="${f(IW-stroke)}" height="${f(IH-stroke)}" fill="none" stroke="#000" stroke-width="${f(stroke)}" stroke-dasharray="${f(6*ks)} ${f(4*ks)}"/>`
    : `<rect x="${f(stroke/2)}" y="${f(stroke/2)}" width="${f(IW-stroke)}" height="${f(IH-stroke)}" fill="none" stroke="#000" stroke-width="${f(stroke)}"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${f(IW)}" height="${f(IH)}" viewBox="0 0 ${f(IW)} ${f(IH)}">`
    + `<rect width="100%" height="100%" fill="#fff"/>`
    + `<g stroke="#000" stroke-width="${f(stroke)}" stroke-linejoin="miter">${shapes}</g>${outline}</svg>`;
  const img = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

  // Размеры: длина - снизу, высота - справа; off - вынос размерной линии.
  const off = 22*k;
  const records = [
    {type:'line', x1:0, y1:IH, x2:0, y2:IH + off*1.3},
    {type:'line', x1:IW, y1:IH, x2:IW, y2:IH + off*1.3},
    {type:'double', x1:0, y1:IH + off, x2:IW, y2:IH + off, lx:IW/2, ly:IH + off, text:dimLabel(lenMm)+' мм'},
    {type:'line', x1:IW, y1:0, x2:IW + off*1.3, y2:0},
    {type:'line', x1:IW, y1:IH, x2:IW + off*1.3, y2:IH},
    {type:'double', x1:IW + off, y1:0, x2:IW + off, y2:IH, lx:IW + off, ly:IH/2, text:dimLabel(heightMm)+' мм', vertical:true},
  ];
  // Расстояние между планками: вертикальные планки - сверху, между их
  // внутренними кромками; горизонтальные - слева.
  if(planks && plankGapMm > 0){
    const text = dimLabel(plankGapMm)+' мм';
    if(planks === 'v'){
      const y = -off;
      records.push(
        {type:'line', x1:pw, y1:0, x2:pw, y2:y - 0.3*off},
        {type:'line', x1:IW - pw, y1:0, x2:IW - pw, y2:y - 0.3*off},
        {type:'double', x1:pw, y1:y, x2:IW - pw, y2:y, lx:IW/2, ly:y, text});
    } else {
      const x = -off;
      records.push(
        {type:'line', x1:0, y1:pw, x2:x - 0.3*off, y2:pw},
        {type:'line', x1:0, y1:IH - pw, x2:x - 0.3*off, y2:IH - pw},
        {type:'double', x1:x, y1:pw, x2:x, y2:IH - pw, lx:x, ly:IH/2, text, vertical:true});
    }
  }
  return renderDiagram(img, altText, IW, IH, records, widthPx, photoStrokeScale(IW), ls);
}

// Чертежи узлов II-1 по результату расчёта.
function diagramsG2991II1(calc){
  const d = calc.drawing;
  return {
    dno: diagramG2991Panel('Дно - схема', d.dnoL, d.dnoW, 'h', null),
    kryshka: calc.noLid
      ? diagramG2991Panel('Вместо крышки - схема', d.dnoL, d.dnoW, 'edges', null)
      : diagramG2991Panel('Крышка - схема', d.dnoL, d.dnoW, 'h', null),
    torec: calc.verticalEnd
      ? diagramG2991Panel('Щит торцевой - схема', d.torecW, d.H, 'v', 'h', d.plankW, d.plankGap)
      : diagramG2991Panel('Щит торцевой - схема', d.torecW, d.H, 'h', 'v', d.plankW, d.plankGap),
    bokovoy: diagramG2991Panel('Щит боковой - схема', d.bokL, d.H, 'h', null),
  };
}
