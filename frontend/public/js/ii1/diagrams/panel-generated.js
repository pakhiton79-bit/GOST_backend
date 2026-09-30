// ГОСТ 10198-91, тип II-1: чертёж торцевого/бокового щита на 5 и более
// стоек - фото есть только для 2-4 стоек (см. TOREC_VARIANTS в torec.js),
// поэтому он рисуется программно (SVG) в координатах и с геометрией фото на
// 4 стойки того же числа этажей (torec_ii1_{1,2}floor_4posts.jpg): обшивка,
// брусья, стойки и раскосины шириной 72px, линии 6px, заливка как на фото.
// Крайние стойки - по краям щита (как на фото), остальные - равномерно между
// ними. Если секции выходят уже 1.2 ширины стойки, стойки и раскосины
// пропорционально сужаются.
// Раскосины - как на фото на 4 стойки: на нижнем этаже левая половина секций
// «/», правая «\» (при нечётном числе секций центральная - «/»), на верхнем
// этаже 2-этажного щита - зеркально по вертикали. X-образные - встречная
// раскосина под исходной (как на фото imgX).
// Координаты - центры линий фото:
//   skin  - наружный контур обшивки [x1, y1, x2, y2];
//   frameL/frameR - наружные кромки крайних стоек (= концы брусьев);
//   bars  - брусья сверху вниз [верх, низ].
const PANEL_GEN_II1 = {
  1: { IW: 2222, IH: 644, skin: [7.5, 7.5, 2211.5, 635.5], frameL: 77.5, frameR: 2135.5,
       bars: [[63.5, 134.5], [564.5, 635.5]] },
  2: { IW: 2223, IH: 1160, skin: [7.5, 8.5, 2212.5, 1151.5], frameL: 77.5, frameR: 2135.5,
       bars: [[77.5, 149.5], [578.5, 650.5], [1079.5, 1151.5]] },
};
const PANEL_GEN_II1_POST_W = 72;
const PANEL_GEN_II1_STROKE = 6;
const PANEL_GEN_II1_FILL = '#d9d9d9';

// Раскосина - полоса шириной PW из угла в угол секции l..r × top..bot,
// обрезанная по секции; rising - снизу слева вверх направо. Сверху и снизу
// у секции всегда брус, поэтому концы полосы заходят в углы (как на фото).
function ii1BraceStrip(l, r, top, bot, rising, PW, fmt){
  const x0 = l, y0 = rising ? bot : top, x1 = r, y1 = rising ? top : bot;
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

// Чертёж на n стоек и floors этажей: { img, gap } - картинка (data:-URL SVG)
// и кромки 1-й и 2-й стоек для размера «расстояние между стойками» (формат
// поля gap у TOREC_VARIANTS); null - стоек так много, что они слились бы.
function panelGeneratedII1(n, floors, xRaskosinaVal){
  const G = PANEL_GEN_II1[floors];
  const f = v => v.toFixed(1);
  let postW = PANEL_GEN_II1_POST_W;
  let bay = (G.frameR - G.frameL - n*postW)/(n-1);
  if(bay < 1.2*postW){
    postW = (G.frameR - G.frameL)/(n + 1.2*(n-1));
    bay = 1.2*postW;
  }
  if(diagramIsTooDense(bay / 2 - PANEL_GEN_II1_STROKE, G.IW)) return null; // заглушка
  const px = i => G.frameL + i*(postW + bay); // левая кромка i-й стойки (с 0)
  const rect = (x1, y1, x2, y2) => `<rect x="${f(x1)}" y="${f(y1)}" width="${f(x2-x1)}" height="${f(y2-y1)}"/>`;
  const [sx1, sy1, sx2, sy2] = G.skin;
  let shapes = `<rect x="${f(sx1)}" y="${f(sy1)}" width="${f(sx2-sx1)}" height="${f(sy2-sy1)}" fill="#fff"/>`;
  for(let fl=0; fl<floors; fl++){
    const top = G.bars[fl][1], bot = G.bars[fl+1][0];
    const upper = floors > 1 && fl === 0; // верхний этаж - зеркально
    for(let i=0; i<n-1; i++){
      const l = px(i) + postW, r = px(i+1);
      const rising = (i < Math.ceil((n-1)/2)) !== upper;
      if(xRaskosinaVal) shapes += ii1BraceStrip(l, r, top, bot, !rising, postW, f);
      shapes += ii1BraceStrip(l, r, top, bot, rising, postW, f);
    }
    for(let i=0; i<n; i++) shapes += rect(px(i), top, px(i) + postW, bot);
  }
  G.bars.forEach(b=>{ shapes += rect(G.frameL, b[0], G.frameR, b[1]); });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${G.IW}" height="${G.IH}" viewBox="0 0 ${G.IW} ${G.IH}">`
    + `<rect width="100%" height="100%" fill="#fff"/>`
    + `<g fill="${PANEL_GEN_II1_FILL}" stroke="#000" stroke-width="${PANEL_GEN_II1_STROKE}" stroke-linejoin="miter">${shapes}</g></svg>`;
  return {
    img: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg),
    gap: { x1: px(0) + postW, x2: px(1), secTop: G.bars[0][1] },
  };
}
