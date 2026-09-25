// ===== Генерируемые чертежи I-3 (X-образные раскосины, любое число секций) =====
// Стиль - как у одобренных X-фото типа I-1: белые детали с чёрным контуром,
// у креста основная раскосина сверху, встречная - под ней.
// Толщина контура - пропорционально ширине картинки, чтобы на экране линии
// выглядели одинаково и у узкого, и у широкого чертежа.
function i3genSvg(IW, IH, shapes){
  const stroke = Math.max(4, IW*0.0045).toFixed(1);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${IW}" height="${IH}" viewBox="0 0 ${IW} ${IH}">`
    + `<rect width="100%" height="100%" fill="#fff"/>`
    + `<g fill="#fff" stroke="#000" stroke-width="${stroke}" stroke-linejoin="miter">${shapes}</g></svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
const i3f = v => v.toFixed(1);
function i3rect(x, y, w, h){ return `<rect x="${i3f(x)}" y="${i3f(y)}" width="${i3f(w)}" height="${i3f(h)}"/>`; }
// Раскосина-полоса в прямоугольнике (l..r, top..bot): rising - «/».
function i3band(l, r, top, bot, rising, T){
  return rising
    ? `<polygon points="${i3f(l)},${i3f(bot-T)} ${i3f(r)},${i3f(top)} ${i3f(r)},${i3f(top+T)} ${i3f(l)},${i3f(bot)}"/>`
    : `<polygon points="${i3f(l)},${i3f(top)} ${i3f(r)},${i3f(bot-T)} ${i3f(r)},${i3f(bot)} ${i3f(l)},${i3f(top+T)}"/>`;
}
function i3cross(l, r, top, bot, rising, xMode){
  const T = Math.min(0.3*(bot-top), 0.3*(r-l)) ;
  return (xMode ? i3band(l, r, top, bot, !rising, T) : '') + i3band(l, r, top, bot, rising, T);
}
// Пропорция секции (ширина/высота) по реальным размерам, в разумных пределах.
function i3aspect(realW, realH){
  if(!(realW > 0) || !(realH > 0)) return 1;
  return Math.min(2.4, Math.max(0.45, realW/realH));
}

// --- Щит торцевой: N секций, 1 или 2 этажа ---
// Wmm - длина горизонтальной планки (ширина груза), Htot - высота рамы (H+t12),
// floorSpan - (2 этажа) вертикальная планка этажа + ширина гор. планки.
function diagramEndPanelGen(Wmm, Htot, sections, floors, xMode, floorSpanVal){
  const N = Math.max(1, Math.round(sections)), F = floors === 2 ? 2 : 1;
  const IH = F === 2 ? 1200 : 800, hp = F === 2 ? 90 : 110, vw = 90;
  const innerH = (IH - hp*(F+1)) / F;
  const realSecW = (Wmm - 100*(N+1)) / N, realInH = F === 2 ? (Htot - 300)/2 : Htot - 200;
  const sw = innerH * i3aspect(realSecW, realInH);
  const IW = Math.round((N+1)*vw + N*sw);
  const vx = i => i*(vw + sw);                      // левый край i-й вертикальной планки
  let shapes = '';
  for(let fl=0; fl<F; fl++){
    const top = hp + fl*(innerH + hp), bot = top + innerH;
    const upper = F === 2 && fl === 0;              // верхний этаж - зеркально нижнему
    for(let i=0; i<N; i++){
      const leftHalf = i < Math.ceil(N/2);
      shapes += i3cross(vx(i)+vw, vx(i+1), top, bot, upper ? !leftHalf : leftHalf, xMode);
    }
  }
  for(let fl=0; fl<F; fl++){
    const top = hp + fl*(innerH + hp);
    for(let i=0; i<=N; i++) shapes += i3rect(vx(i), top, vw, innerH);
  }
  for(let k=0; k<=F; k++) shapes += i3rect(0, k*(innerH + hp), IW, hp);

  const val = dimLabel(Htot), planLen = dimLabel(Wmm);
  const records = [
    {type:'line', x1:0, y1:150, x2:0, y2:-120},
    {type:'line', x1:IW, y1:150, x2:IW, y2:-120},
    {type:'double', x1:0, y1:-97, x2:IW, y2:-97, lx:IW/2, ly:-139, text: planLen+' мм'},
    {type:'line', x1:IW-160, y1:0, x2:IW+180, y2:0},
    {type:'line', x1:IW-160, y1:IH, x2:IW+180, y2:IH},
    {type:'double', x1:IW+140, y1:0, x2:IW+140, y2:IH, lx:IW+135, ly:IH/2, text: val+' мм', vertical:true}
  ];
  if(F === 2){
    const midBot = hp + innerH + hp;
    records.push(
      {type:'line', x1:130, y1:midBot, x2:-170, y2:midBot},
      {type:'line', x1:130, y1:IH, x2:-170, y2:IH},
      {type:'double', x1:-110, y1:midBot, x2:-110, y2:IH, lx:-115, ly:(midBot+IH)/2, text: dimLabel(floorSpanVal)+' мм', vertical:true}
    );
  }
  const title = `Щит торцевой (${F} эт., ${N} секц.${xMode ? ', X-раскосины' : ''}) - схема расположения деталей`;
  return renderDiagram(i3genSvg(IW, IH, shapes), title, IW, IH, records, null, photoStrokeScale(IW));
}

// --- Щит боковой: P планок (P-1 секций), 1 или 2 этажа ---
function diagramBokovoyGen(boardLenVal, overhangVal, edgeDistVal, heightPlusFloorVal, plankCount, floors, xMode, upperSpanVal, midPlankWidthVal, sectionWmm){
  const P = Math.max(2, Math.round(plankCount)), F = floors === 2 ? 2 : 1;
  const PH = floors === 2 ? 1300 : 800, pw = 100, stub = 100, hp = 90;
  const ovh = 80;                                   // напуск планок ниже щита (на полоз)
  const innerH = F === 2 ? (PH - hp)/2 : PH;
  const realInH = F === 2 ? (heightPlusFloorVal - (midPlankWidthVal||100))/2 : heightPlusFloorVal;
  const sw = innerH * i3aspect(sectionWmm - 100, realInH);
  const panelW = 2*stub + P*pw + (P-1)*sw;
  const up = 45;                                    // планки чуть выступают над щитом (как в I-1)
  const IW = Math.round(panelW), IH = up + PH + ovh;
  const px = i => stub + i*(pw + sw);
  let shapes = `<g transform="translate(0,${up})">` + i3rect(0, 0, IW, PH); // доски бока - сплошной щит
  for(let fl=0; fl<F; fl++){
    const top = fl*(innerH + hp), bot = top + innerH;
    const upper = F === 2 && fl === 0;
    for(let i=0; i<P-1; i++){
      const leftHalf = i < Math.ceil((P-1)/2);
      shapes += i3cross(px(i)+pw, px(i+1), top, bot, upper ? !leftHalf : leftHalf, xMode);
    }
  }
  shapes += '</g>';
  for(let i=0; i<P; i++) shapes += i3rect(px(i), 0, pw, IH);
  if(F === 2) shapes += i3rect(0, up + innerH, IW, hp);

  const lastR = px(P-1) + pw;
  const IHp = PH + ovh; // (записи ниже - в координатах щита, затем сдвиг на up)
  const records = [
    {type:'line', x1:IW, y1:0, x2:IW+215, y2:0},
    {type:'line', x1:IW, y1:PH, x2:IW+215, y2:PH},
    {type:'double', x1:IW+195, y1:0, x2:IW+195, y2:PH, lx:IW+207, ly:PH/2, text: dimLabel(heightPlusFloorVal)+' мм', vertical:true},
    {type:'line', x1:IW, y1:80, x2:IW, y2:-120},
    {type:'line', x1:0, y1:80, x2:0, y2:-120},
    {type:'double', x1:0, y1:-95, x2:IW, y2:-95, lx:IW/2, ly:-101, text: dimLabel(boardLenVal)+' мм'},
    {type:'line', x1:lastR-260, y1:IHp, x2:IW+120, y2:IHp},
    {type:'line', x1:lastR, y1:PH, x2:lastR, y2:IHp},
    {type:'single', x1:lastR-200, y1:IHp+130, x2:lastR, y2:IHp-40, lx:lastR-202, ly:IHp+155, text: dimLabel(overhangVal)+' мм'},
    {type:'line', x1:px(0), y1:PH-60, x2:px(0), y2:IHp+90},
    {type:'line', x1:0, y1:PH-60, x2:0, y2:IHp+90},
    {type:'line', x1:0, y1:IHp+60, x2:px(0), y2:IHp+60},
    F === 2
      ? {type:'single', x1:-60, y1:IHp+190, x2:px(0)/2, y2:IHp+60, lx:-70, ly:IHp+215, text: dimLabel(edgeDistVal)+' мм'}
      : {type:'single', x1:-100, y1:PH-100, x2:px(0)/2, y2:IHp+60, lx:-110, ly:PH-118, text: dimLabel(edgeDistVal)+' мм'}
  ];
  if(F === 2){
    records.push(
      {type:'line', x1:px(0), y1:innerH, x2:-160, y2:innerH},
      {type:'line', x1:px(0), y1:PH, x2:-160, y2:PH},
      {type:'double', x1:-120, y1:innerH, x2:-120, y2:PH, lx:-135, ly:(innerH+PH)/2, text: dimLabel(upperSpanVal + midPlankWidthVal - overhangVal)+' мм', vertical:true},
      {type:'line', x1:px(0), y1:0, x2:-150, y2:0},
      {type:'double', x1:-40, y1:0, x2:-40, y2:innerH, lx:-100, ly:innerH/2, text: dimLabel(upperSpanVal)+' мм', vertical:true}
    );
  }
  records.forEach(r=>{ ['y1','y2','ly'].forEach(k=>{ if(typeof r[k]==='number') r[k] += up; }); });
  const title = `Щит боковой (${F} эт., ${P} планок${xMode ? ', X-раскосины' : ''}) - схема расположения деталей`;
  return renderDiagram(i3genSvg(IW, IH, shapes), title, IW, IH, records, null, photoStrokeScale(IW));
}
