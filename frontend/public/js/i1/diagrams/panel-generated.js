// ГОСТ 10198-91, тип I-1: чертёж щита на 5 и более поясов планок - фото есть
// только для 2-4, поэтому он рисуется программно (SVG) в координатах и с
// геометрией фото на 4 планки (bok_i1_4planks.jpg, 2208×834): рамка щита,
// выступ планок на 42px вверх и вниз, отступ крайней планки от края 120px,
// линии 6px. Планки - 85px; если промежутки выходят уже 1.2 ширины планки,
// планки пропорционально сужаются.
const PANEL_GEN = {IW:2208, IH:834, topY:90.5, botY:728.5, stubL:73.5, stubR:2153.5, plankTop:48.5, plankBot:770.5, edge:120, stroke:6};
const PANEL_GEN_PLANK_W = 85;

// Раскосина - полоса шириной PW из угла в угол секции l..r × top..bot,
// обрезанная по секции. rising - снизу слева вверх направо. hTop/hBot - есть
// ли у верхней/нижней кромки горизонтальная планка: если есть, конец
// раскосины заходит в угол; если нет - упирается только в вертикальную
// планку (средняя линия смещена от угла на половину её высоты).
function braceStrip(l, r, top, bot, rising, PW, hTop, hBot, fmt){
  const yL = rising ? bot : top, yR = rising ? top : bot;      // углы, куда идёт раскосина
  const hL = rising ? hBot : hTop, hR = rising ? hTop : hBot;  // есть ли там гор. планка
  const inL = rising ? -1 : 1, inR = rising ? 1 : -1;          // направление "внутрь" по y
  // Высота полосы по вертикали зависит от её наклона, а наклон - от смещения
  // концов: уточняется итерациями.
  let T = PW, x0, y0, x1, y1;
  for(let i=0; i<40; i++){
    x0 = l; y0 = yL + (hL ? 0 : inL*T/2);
    x1 = r; y1 = yR + (hR ? 0 : inR*T/2);
    T = PW * Math.hypot(x1-x0, y1-y0) / (x1-x0);
  }
  // Прямоугольник секции, обрезанный двумя краями полосы.
  const len = Math.hypot(x1-x0, y1-y0), nx = -(y1-y0)/len, ny = (x1-x0)/len;
  let poly = [[l,top],[r,top],[r,bot],[l,bot]];
  [1, -1].forEach(sgn=>{
    const d = p => sgn*(nx*(p[0]-x0) + ny*(p[1]-y0)) - PW/2;
    const out = [];
    for(let i=0; i<poly.length; i++){
      const a = poly[i], b = poly[(i+1)%poly.length], da = d(a), db = d(b);
      if(da <= 1e-9) out.push(a);
      if((da <= 1e-9) !== (db <= 1e-9)){ const t = da/(da-db); out.push([a[0]+t*(b[0]-a[0]), a[1]+t*(b[1]-a[1])]); }
    }
    poly = out;
  });
  return `<polygon points="${poly.map(p=>fmt(p[0])+','+fmt(p[1])).join(' ')}"/>`;
}

// Чертёж на n планок - в том же формате, что и записи PANEL_PHOTOS.
// Раскосины: левая половина промежутков «/», правая «\» (при нечётном числе
// центральный - «/»); X-образные - встречная рисуется под исходной.
function panelGenerated(n, hasRaskosinaVal, xRaskosinaVal){
  const G = PANEL_GEN;
  const x0 = G.stubL + G.edge, x1 = G.stubR - G.edge;
  let plankW = PANEL_GEN_PLANK_W;
  let bay = (x1 - x0 - n*plankW)/(n-1);
  if(bay < 1.2*plankW){
    plankW = (x1 - x0)/(n + 1.2*(n-1));
    bay = 1.2*plankW;
  }
  const px = i => x0 + i*(plankW + bay); // левый край i-й планки (с 0)
  const f = v => v.toFixed(1);
  // Горизонтальных планок у щита нет - раскосина упирается только в вертикальные.
  const band = (l, r, rising) => braceStrip(l, r, G.topY, G.botY, rising, plankW, false, false, f);
  let shapes = `<rect x="${f(G.stubL)}" y="${f(G.topY)}" width="${f(G.stubR-G.stubL)}" height="${f(G.botY-G.topY)}"/>`;
  if(hasRaskosinaVal){
    for(let i=0; i<n-1; i++){
      const l = px(i) + plankW, r = px(i+1);
      const rising = i < Math.ceil((n-1)/2);
      if(xRaskosinaVal) shapes += band(l, r, !rising);
      shapes += band(l, r, rising);
    }
  }
  for(let i=0; i<n; i++){
    shapes += `<rect x="${f(px(i))}" y="${f(G.plankTop)}" width="${f(plankW)}" height="${f(G.plankBot-G.plankTop)}"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${G.IW}" height="${G.IH}" viewBox="0 0 ${G.IW} ${G.IH}">`
    + `<rect width="100%" height="100%" fill="#fff"/>`
    + `<g fill="#fff" stroke="#000" stroke-width="${G.stroke}" stroke-linejoin="miter">${shapes}</g></svg>`;
  return {
    img: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg),
    IW:G.IW, IH:G.IH, stubL:G.stubL, p1L:px(0), p1R:px(0)+plankW, p2L:px(1), stubR:G.stubR, topY:G.topY, botY:G.botY
  };
}
