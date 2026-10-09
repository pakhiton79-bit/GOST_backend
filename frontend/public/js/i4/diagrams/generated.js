// ГОСТ 10198-91, тип I-4: общие функции генерируемых чертежей (SVG; копия
// I-3 - у I-4 все чертежи генерируемые, т.к. на фото I-3 обшивка сплошная).
// Стиль - как у фото с X-раскосинами типа I-1: белые детали с чёрным
// контуром, у креста основная раскосина сверху, встречная - под ней.
// Толщина контура - из расчёта ~1px на экране (как у чертежей других
// типов, по указанию пользователя): чертёж вписывается в слот (до ~290px
// по ширине и 240px по высоте), поэтому толщина в единицах картинки
// зависит от того, во что он упирается.
function i3stroke(IW, IH){
  return (1 * Math.max(IW/290, IH/240)).toFixed(1);
}
// Картинка + подписи. Вокруг чертежа - поле на толщину линии: иначе крайние
// линии рамы, лежащие ровно по краю картинки, обрезались бы наполовину и
// выглядели тоньше остальных (по замечанию пользователя). Подписи сдвигаются
// на то же поле. strokeK - множитель толщины контура (<1 - тоньше обычного,
// см. крышку).
function i3render(title, IW, IH, shapes, records, join, strokeK){
  const stroke = (i3stroke(IW, IH) * (strokeK || 1)).toFixed(1), m = Math.ceil(stroke);
  const W2 = IW + 2*m, H2 = IH + 2*m;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W2}" height="${H2}" viewBox="0 0 ${W2} ${H2}">`
    + `<rect width="100%" height="100%" fill="#fff"/>`
    + `<g transform="translate(${m},${m})" fill="#fff" stroke="#000" stroke-width="${stroke}" stroke-linejoin="${join || 'miter'}">${shapes}</g></svg>`;
  records.forEach(r=>{ ['x1','x2','lx'].forEach(k=>{ if(typeof r[k]==='number') r[k] += m; }); ['y1','y2','ly'].forEach(k=>{ if(typeof r[k]==='number') r[k] += m; }); });
  return renderDiagram('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), title, W2, H2, records, null, photoStrokeScale(W2));
}
const i3f = v => v.toFixed(1);
function i3rect(x, y, w, h){ return `<rect x="${i3f(x)}" y="${i3f(y)}" width="${i3f(w)}" height="${i3f(h)}"/>`; }
// Раскосина-полоса в прямоугольнике (l..r, top..bot): rising - «/».
function i3band(l, r, top, bot, rising, T){
  return rising
    ? `<polygon points="${i3f(l)},${i3f(bot-T)} ${i3f(r)},${i3f(top)} ${i3f(r)},${i3f(top+T)} ${i3f(l)},${i3f(bot)}"/>`
    : `<polygon points="${i3f(l)},${i3f(top)} ${i3f(r)},${i3f(bot-T)} ${i3f(r)},${i3f(bot)} ${i3f(l)},${i3f(top+T)}"/>`;
}
// Раскосина - полоса шириной PW (как у планок) из угла в угол секции,
// обрезанная по секции. hTop/hBot - есть ли у верхней/нижней кромки секции
// горизонтальная планка (по указанию пользователя): если есть - конец
// раскосины заходит в угол и примыкает и к вертикальной, и к горизонтальной
// планке; если нет (кромка щита) - упирается только в вертикальную планку:
// средняя линия смещена от угла на половину её высоты, и полоса касается
// кромки лишь в самом углу.
function braceStrip(l, r, top, bot, rising, PW, hTop, hBot, fmt){
  const yL = rising ? bot : top, yR = rising ? top : bot;      // углы, куда идёт раскосина
  const hL = rising ? hBot : hTop, hR = rising ? hTop : hBot;  // есть ли там гор. планка
  const inL = rising ? -1 : 1, inR = rising ? 1 : -1;          // направление "внутрь" по y
  let T = PW, x0, y0, x1, y1;
  for(let i=0; i<40; i++){
    x0 = l; y0 = yL + (hL ? 0 : inL*T/2);
    x1 = r; y1 = yR + (hR ? 0 : inR*T/2);
    T = PW * Math.hypot(x1-x0, y1-y0) / (x1-x0);
  }
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
function i3cross(l, r, top, bot, rising, xMode, PW, hTop, hBot){
  return (xMode ? braceStrip(l, r, top, bot, !rising, PW, hTop, hBot, i3f) : '') + braceStrip(l, r, top, bot, rising, PW, hTop, hBot, i3f);
}
// Пропорция секции (ширина/высота) по реальным размерам, в разумных пределах.
function i3aspect(realW, realH){
  if(!(realW > 0) || !(realH > 0)) return 1;
  return Math.min(2.4, Math.max(0.45, realW/realH));
}
