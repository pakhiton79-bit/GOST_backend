// ГОСТ 10198-91, тип III-1: чертёж щита (бокового или торцевого) - вид
// снаружи. Фото нет, чертёж генерируется (SVG) в оформлении сгенерированных
// щитов II-1 (panel-generated.js типа II-1: линии 6px, заливка #d9d9d9), не
// в масштабе: пропорции кадра - по щиту, но не площе 0.4 и не выше 1.2
// (высота к ширине), все детали одной ширины - тем толще, чем крупнее кадр и
// меньше стоек и этажей (по указанию пользователя). На заднем плане
// обшивка (белый прямоугольник, без досок - по указанию пользователя),
// поверх - наружный каркас: горизонтальные брусья на всю длину щита (низ,
// верх и средний при 2 этажах, этажи равной высоты), стойки между ними
// (крайние - по краям щита, остальные равномерно) и раскосины. Слишком
// плотно - заглушка вместо чертежа.
// Раскосины: на нижнем этаже левая половина секций «/», правая «\» (при
// нечётном числе секций центральная - «/»), на верхнем этаже 2-этажного щита
// - зеркально; X-образные - встречная раскосина под исходной.
// Размеры: длина щита (под чертежом), высота (справа), у 2-этажного - высота
// нижнего этажа (слева, как у II-1), просвет между стойками (в первой секции;
// не помещается - над чертежом).
const III1_PANEL_IW = 2222;                // ширина картинки
const III1_PANEL_MIN_RATIO = 0.4, III1_PANEL_MAX_RATIO = 1.2; // пределы высоты кадра, доли ширины
// Ширина деталей: доля средней стороны кадра, но секция между стойками - не
// уже 2.5 ширины стойки, этаж - не ниже 5 ширин бруса.
const III1_PANEL_MEMBER_K = 0.055, III1_PANEL_MIN_BAY = 2.5, III1_PANEL_MIN_FLOOR = 5;
const III1_PANEL_STROKE = 6;
const III1_PANEL_FILL = '#d9d9d9';
const III1_PANEL_LABEL_SCALE = 0.8;

// Раскосина - полоса шириной PW из угла в угол секции l..r × top..bot,
// обрезанная по секции; rising - снизу слева вверх направо.
function iii1BraceStrip(l, r, top, bot, rising, PW, fmt){
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

// lenMm - длина щита, heightMm - высота, frame - каркас из расчёта (count,
// floors, len - длина стойки, sectionW - просвет между стойками,
// hasRaskosina), мм - для подписей размеров и расстановки деталей.
function diagramPanelIII1(altText, lenMm, heightMm, frame, xRaskosinaVal, widthPx, labelScale){
  const IW = III1_PANEL_IW;
  const IH = IW * Math.min(III1_PANEL_MAX_RATIO, Math.max(III1_PANEL_MIN_RATIO, heightMm / lenMm));
  const n = frame.count, stroke = III1_PANEL_STROKE;
  const f = v => v.toFixed(1);
  const postW = Math.min(III1_PANEL_MEMBER_K * (IW + IH) / 2,
    IW / (n + III1_PANEL_MIN_BAY * (n - 1)),
    IH / (frame.floors * III1_PANEL_MIN_FLOOR));
  const barH = postW;
  const gapPx = (IW - n*postW)/(n-1);
  if(diagramIsTooDense((frame.hasRaskosina ? gapPx/2 : gapPx) - stroke, IW)) return diagramTooDense();
  const rect = (x1, y1, x2, y2) => `<rect x="${f(x1)}" y="${f(y1)}" width="${f(x2-x1)}" height="${f(y2-y1)}"/>`;
  const px = i => i*(postW + gapPx);                        // левая кромка i-й стойки
  const barTop = k => k*(IH - barH)/frame.floors;           // верх k-го бруса сверху

  // Обшивка - белый прямоугольник.
  const skin = `<rect x="0" y="0" width="${f(IW)}" height="${f(IH)}" fill="#fff"/>`;

  let shapes = '';
  for(let fl=0; fl<frame.floors; fl++){
    const top = barTop(fl) + barH, bot = barTop(fl+1);
    const upper = frame.floors > 1 && fl === 0;
    for(let i=0; frame.hasRaskosina && i<frame.count-1; i++){
      const l = px(i) + postW, r = px(i+1);
      const rising = (i < Math.ceil((frame.count-1)/2)) !== upper;
      if(xRaskosinaVal) shapes += iii1BraceStrip(l, r, top, bot, !rising, postW, f);
      shapes += iii1BraceStrip(l, r, top, bot, rising, postW, f);
    }
    for(let i=0; i<frame.count; i++) shapes += rect(px(i), top, px(i) + postW, bot);
  }
  for(let k=0; k<=frame.floors; k++) shapes += rect(0, barTop(k), IW, barTop(k) + barH);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${f(IW)}" height="${f(IH)}" viewBox="0 0 ${f(IW)} ${f(IH)}">`
    + skin
    + `<g fill="${III1_PANEL_FILL}" stroke="#000" stroke-width="${f(stroke)}" stroke-linejoin="miter">${shapes}</g>`
    + `<rect x="${f(stroke/2)}" y="${f(stroke/2)}" width="${f(IW-stroke)}" height="${f(IH-stroke)}" fill="none" stroke="#000" stroke-width="${f(stroke)}"/></svg>`;
  const img = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

  // Размеры. off - вынос размерной линии за чертёж.
  const w = widthPx || DIAGRAM_DEFAULT_WIDTH, ls = labelScale || 1;
  const k = IW / w;                                          // пикселей картинки на 1px экрана
  const off = 22*k;
  const records = [
    {type:'line', x1:0, y1:IH, x2:0, y2:IH + off*1.3},
    {type:'line', x1:IW, y1:IH, x2:IW, y2:IH + off*1.3},
    {type:'double', x1:0, y1:IH + off, x2:IW, y2:IH + off, lx:IW/2, ly:IH + off, text:dimLabel(lenMm)+' мм'},
    {type:'line', x1:IW, y1:0, x2:IW + off*1.3, y2:0},
    {type:'line', x1:IW, y1:IH, x2:IW + off*1.3, y2:IH},
    {type:'double', x1:IW + off, y1:0, x2:IW + off, y2:IH, lx:IW + off, ly:IH/2, text:dimLabel(heightMm)+' мм', vertical:true},
  ];
  // 2 этажа - ещё высота нижнего этажа (брус + стойка) слева, как у II-1.
  // Подпись не помещается между наконечниками - левее стрелки.
  if(frame.floors === 2){
    const yMid = barTop(1) + barH, text = dimLabel(100 + frame.len)+' мм'; // брус 100 мм + стойка
    const labelLen = (text.length*8.2 + 16) * ls * k, headLen = 9 * photoStrokeScale(IW);
    const lx = IH - yMid >= labelLen + 2*headLen + 6*k ? -off : -off - 14*ls*k;
    records.push(
      {type:'line', x1:0, y1:yMid, x2:-off*1.3, y2:yMid},
      {type:'line', x1:0, y1:IH, x2:-off*1.3, y2:IH},
      {type:'double', x1:-off, y1:yMid, x2:-off, y2:IH, lx, ly:(yMid + IH)/2, text, vertical:true});
  }
  if(frame.count > 1 && frame.sectionW > 0){
    const text = dimLabel(frame.sectionW)+' мм';
    const labelW = (text.length*8.2 + 16) * ls * k;
    const headLen = 9 * photoStrokeScale(IW);
    const x1 = px(0) + postW, x2 = px(1), mid = (x1 + x2)/2, secTop = barTop(0) + barH;
    if(x2 - x1 >= labelW + 2*headLen + 6*k){
      const y = secTop + 14*k;
      records.push({type:'double', x1, y1:y, x2, y2:y, lx:mid, ly:y, text});
    } else {
      const y = -12*k;
      records.push(
        {type:'line', x1, y1:secTop, x2:x1, y2:y - 6*k},
        {type:'line', x1:x2, y1:secTop, x2, y2:y - 6*k},
        {type:'double', x1, y1:y, x2, y2:y, lx:mid, ly:y - 16*k, text});
    }
  }
  return renderDiagram(img, altText, IW, IH, records, widthPx, photoStrokeScale(IW), labelScale);
}
