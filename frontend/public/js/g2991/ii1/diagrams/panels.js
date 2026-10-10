// ГОСТ 2991-85, тип II-1: чертежи узлов - плоские схемы (SVG, как щиты
// III-1): узел - белый прямоугольник, доски - тонкими линиями стыков (по
// указанию пользователя: видно, в какую сторону идут доски, без перегрузки),
// планки торца - светло-серые поверх. Подписи (по указанию пользователя): у всех узлов длина и высота
// (у дна и крышки - ширина), у торца ещё расстояние между планками.
// Размеры - из расчёта (calc.drawing).
// Общий вид ящика (плитка «Итог» и печать) - присланный рисунок, увеличенный в 3 раза.
const BOX_G2991_II1_IMG = "/images/box_g2991_ii1.png";

const G2991_PANEL_IW = 2222;                       // ширина картинки
const G2991_PANEL_MIN_RATIO = 0.3, G2991_PANEL_MAX_RATIO = 1.2; // пределы высоты кадра, доли ширины
const G2991_PANEL_WIDTH = 260, G2991_PANEL_LABEL_SCALE = 0.8;
const G2991_PLANK_FILL = '#d9d9d9'; // планки торца - светло-серые (по указанию пользователя)
const G2991_JOINT_STROKE = '#777';  // линии стыков досок - тонкие серые
const G2991_JOINT_MIN_PX = 3;       // доски уже стольких px на экране - стыки не рисуются (сливаются)

// Ширины досок узла по порядку строк таблицы (кроме планок): снизу вверх для
// щитов и дна/крышки, слева направо для вертикальных досок торца.
function g2991RowsLayout(rows){
  const res = [];
  rows.forEach(r => {
    if(/^Планка/.test(r.name)) return;
    const qty = Math.min(200, Math.max(0, Math.round(r.qty) || 0));
    for(let i = 0; i < qty; i++) res.push(r.w);
  });
  return res;
}

// lenMm × heightMm - габариты узла; boards - 'edges' (только 2 доски у
// верхнего и нижнего края - «Без крышки»), иначе - сплошной щит; planks - 'v' (2 планки у
// левого и правого края), 'h' (у верхнего и нижнего) или null; plankMm -
// ширина планки, plankGapMm - расстояние между планками (подпись); layout -
// ширины досок по порядку (g2991RowsLayout): стыки - линиями, для 'h' -
// горизонтальными снизу вверх, для 'v' - вертикальными слева направо.
function diagramG2991Panel(altText, lenMm, heightMm, boards, planks, plankMm, plankGapMm, layout){
  const IW = G2991_PANEL_IW;
  const IH = IW * Math.min(G2991_PANEL_MAX_RATIO, Math.max(G2991_PANEL_MIN_RATIO, heightMm / lenMm));
  const f = v => v.toFixed(1);
  const widthPx = G2991_PANEL_WIDTH, ls = G2991_PANEL_LABEL_SCALE;
  const k = IW / widthPx;                                  // единиц картинки на 1px экрана
  const ks = diagramScreenScale(IW, IH), stroke = 1.2 * ks;
  const rect = (x1, y1, x2, y2, fill) => `<rect x="${f(x1)}" y="${f(y1)}" width="${f(x2-x1)}" height="${f(y2-y1)}"${fill ? ` fill="${fill}"` : ''}/>`;
  let shapes = '';
  // Планки - по краям, вдвое шире обычной детали на экране (по указанию
  // пользователя: были тонковаты), но не больше 1/5 щита.
  const pw = Math.min(2 * drawnMemberWidth(ks), (planks === 'v' ? IW : IH) / 5);
  // Стыки досок - тонкие линии поверх белого щита (лишнее у последней доски
  // за краем щита не рисуется); слишком узкие доски - без линий.
  let joints = '';
  if(layout && layout.length > 1 && (boards === 'h' || boards === 'v')){
    const span = boards === 'h' ? heightMm : lenMm, size = boards === 'h' ? IH : IW;
    const px = size / span;
    if(Math.min(...layout) * px / k >= G2991_JOINT_MIN_PX){
      let pos = 0;
      layout.slice(0, -1).forEach(w => {
        pos += w;
        if(pos >= span) return;
        const c = pos * px;
        joints += boards === 'h'
          ? `<line x1="0" y1="${f(IH - c)}" x2="${f(IW)}" y2="${f(IH - c)}"/>`
          : `<line x1="${f(c)}" y1="0" x2="${f(c)}" y2="${f(IH)}"/>`;
      });
    }
  }
  if(joints) shapes += `<g stroke="${G2991_JOINT_STROKE}" stroke-width="${f(0.6 * ks)}">${joints}</g>`;
  // «Без крышки» - только 2 доски у краёв, шириной и цветом
  // как планки торца (по указанию пользователя).
  if(boards === 'edges'){
    const bw = Math.min(2 * drawnMemberWidth(ks), IH / 5);
    shapes += rect(0, 0, IW, bw, G2991_PLANK_FILL) + rect(0, IH - bw, IW, IH, G2991_PLANK_FILL);
  }
  if(planks === 'v') shapes += rect(0, 0, pw, IH, G2991_PLANK_FILL) + rect(IW - pw, 0, IW, IH, G2991_PLANK_FILL);
  if(planks === 'h') shapes += rect(0, 0, IW, pw, G2991_PLANK_FILL) + rect(0, IH - pw, IW, IH, G2991_PLANK_FILL);
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
    dno: diagramG2991Panel('Дно - схема', d.dnoL, d.dnoW, 'h', null, 0, 0, g2991RowsLayout(calc.dno)),
    kryshka: calc.noLid
      ? diagramG2991Panel('Вместо крышки - схема', d.dnoL, d.dnoW, 'edges', null)
      : diagramG2991Panel('Крышка - схема', d.dnoL, d.dnoW, 'h', null, 0, 0, g2991RowsLayout(calc.kryshka)),
    torec: calc.verticalEnd
      ? diagramG2991Panel('Щит торцевой - схема', d.torecW, d.H, 'v', 'h', d.plankW, d.plankGap, g2991RowsLayout(calc.torec))
      : diagramG2991Panel('Щит торцевой - схема', d.torecW, d.H, 'h', 'v', d.plankW, d.plankGap, g2991RowsLayout(calc.torec)),
    bokovoy: diagramG2991Panel('Щит боковой - схема', d.bokL, d.H, 'h', null, 0, 0, g2991RowsLayout(calc.bokovoy)),
  };
}
