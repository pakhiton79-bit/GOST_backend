// ===== Генерируемые чертежи I-3 (X-образные раскосины, любое число секций) =====
// Стиль - как у одобренных X-фото типа I-1: белые детали с чёрным контуром,
// у креста основная раскосина сверху, встречная - под ней.
// X-вариант торца на 1 этаж с 1 секцией - готовое фото (то же, что у типа I-1):
// где фото есть, используем фото, генерируем только остальное.
const I3_TOREC_1_X_IMG_B64 = "/images/torec_1_x.png";
// Толщина контура - из расчёта ~2px на экране: чертёж вписывается в слот
// (до ~290px по ширине и 240px по высоте), поэтому толщина в единицах
// картинки зависит от того, во что он упирается.
function i3stroke(IW, IH){
  return (2 * Math.max(IW/290, IH/240)).toFixed(1);
}
function i3genSvg(IW, IH, shapes){
  const stroke = i3stroke(IW, IH);
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
// Раскосина той же ширины (поперёк), что и планки (PW): все детали щита по
// 100 мм, поэтому и на чертеже они одной ширины (по указанию пользователя).
// T - высота полосы по вертикали у стойки: T*w/sqrt(w²+(h-T)²) = PW.
function i3cross(l, r, top, bot, rising, xMode, PW){
  const w = r - l, h = bot - top;
  let T = PW;
  for(let i=0; i<30; i++) T = PW * Math.sqrt(w*w + (h-T)*(h-T)) / w;
  T = Math.min(T, 0.6*h);
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
  const IH = F === 2 ? 1200 : 800, hp = 90, vw = 90; // гор. и верт. планки - одной ширины
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
      shapes += i3cross(vx(i)+vw, vx(i+1), top, bot, upper ? !leftHalf : leftHalf, xMode, vw);
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
function diagramBokovoyGen(boardLenVal, overhangVal, edgeDistVal, heightPlusFloorVal, plankCount, floors, xMode, upperSpanVal, midPlankWidthVal, sectionWmm, lidBoardTVal, hasBraces){
  const P = Math.max(2, Math.round(plankCount)), F = floors === 2 ? 2 : 1;
  const PH = floors === 2 ? 1300 : 800, pw = 100, stub = 100, hp = 100; // средняя планка - той же ширины
  const ovh = 80;                                   // напуск планок ниже щита (на полоз)
  const innerH = F === 2 ? (PH - hp)/2 : PH;
  const realInH = F === 2 ? (heightPlusFloorVal - (midPlankWidthVal||100))/2 : heightPlusFloorVal;
  // Ширина секции - по реальной пропорции, но весь чертёж не длиннее ~4
  // (2 этажа - ~2.4) своих высот: иначе у очень длинного щита (10+ м) чертёж
  // превращается в тонкую полосу, а подписи наезжают друг на друга.
  const maxIW = (F === 2 ? 2.4 : 4) * (45 + PH + 80);
  const sw = Math.max(1.2*pw, Math.min(innerH * i3aspect(sectionWmm - 100, realInH), (maxIW - 2*stub - P*pw) / (P-1)));
  const panelW = 2*stub + P*pw + (P-1)*sw;
  const up = 45;                                    // планки чуть выступают над щитом (как в I-1)
  const IW = Math.round(panelW), IH = up + PH + ovh;
  const px = i => stub + i*(pw + sw);
  let shapes = `<g transform="translate(0,${up})">` + i3rect(0, 0, IW, PH); // доски бока - сплошной щит
  for(let fl=0; fl<F && hasBraces !== false; fl++){  // hasBraces=false - щит без раскосин
    const top = fl*(innerH + hp), bot = top + innerH;
    const upper = F === 2 && fl === 0;
    for(let i=0; i<P-1; i++){
      const leftHalf = i < Math.ceil((P-1)/2);
      shapes += i3cross(px(i)+pw, px(i+1), top, bot, upper ? !leftHalf : leftHalf, xMode, pw);
    }
  }
  shapes += '</g>';
  for(let i=0; i<P; i++) shapes += i3rect(px(i), 0, pw, IH);
  if(F === 2) shapes += i3rect(0, up + innerH, IW, hp);

  const lastR = px(P-1) + pw;
  const IHp = PH + ovh; // (записи ниже - в координатах щита, затем сдвиг на up)
  const k = IW / 260;   // единиц картинки на 1px при базовой ширине чертежа
  const records = [
    {type:'line', x1:IW, y1:0, x2:IW+215, y2:0},
    {type:'line', x1:IW, y1:PH, x2:IW+215, y2:PH},
    {type:'double', x1:IW+195, y1:0, x2:IW+195, y2:PH, lx:IW+207, ly:PH/2, text: dimLabel(heightPlusFloorVal)+' мм', vertical:true},
    {type:'line', x1:IW, y1:80, x2:IW, y2:-120},
    {type:'line', x1:0, y1:80, x2:0, y2:-120},
    {type:'double', x1:0, y1:-95, x2:IW, y2:-95, lx:Math.max(IW/2, px(0) + 150*k), ly:-101, text: dimLabel(boardLenVal)+' мм'},
    // Стрелка к выступающему верхнему левому углу первой планки - толщина
    // доски крышки (по указанию пользователя, как у чертежей типа I-1). У 2 этажей
    // подпись на ряд выше - слева под ней вертикальная подпись верхнего этажа.
    {type:'single', x1:px(0) - 12*k, y1:F === 2 ? -95 - 34*k : -95, x2:px(0), y2:-up*0.33, lx:px(0) - 12*k, ly:F === 2 ? -101 - 34*k : -101, text: dimLabel(lidBoardTVal)+' мм'},
    {type:'line', x1:lastR-260, y1:IHp, x2:IW+120, y2:IHp},
    {type:'line', x1:lastR, y1:PH, x2:lastR, y2:IHp},
    {type:'single', x1:lastR-200, y1:IHp+130, x2:lastR, y2:IHp-40, lx:lastR-202, ly:IHp+155, text: dimLabel(overhangVal)+' мм'},
    {type:'line', x1:px(0), y1:PH-60, x2:px(0), y2:IHp+90},
    {type:'line', x1:0, y1:PH-60, x2:0, y2:IHp+90},
    {type:'line', x1:0, y1:IHp+60, x2:px(0), y2:IHp+60},
    F === 2
      ? (P >= 4 // у широкого щита - правее первой планки, чтобы не слипаться с подписями этажей слева
        ? {type:'single', x1:px(0)+60*k, y1:IHp+190, x2:px(0)/2, y2:IHp+60, lx:px(0)+62*k, ly:IHp+215, text: dimLabel(edgeDistVal)+' мм'}
        : {type:'single', x1:-60, y1:IHp+190, x2:px(0)/2, y2:IHp+60, lx:-70, ly:IHp+215, text: dimLabel(edgeDistVal)+' мм'})
      : {type:'single', x1:-100, y1:PH-100, x2:px(0)/2, y2:IHp+60, lx:-110, ly:PH-118, text: dimLabel(edgeDistVal)+' мм'}
  ];
  if(F === 2){
    records.push(
      // подписи этажей - в два столбика (разнос - в пикселях экрана, через k),
      // иначе на широком (сильно уменьшенном) щите они наезжают друг на друга
      {type:'line', x1:px(0), y1:innerH, x2:-Math.max(160, 30*k), y2:innerH},
      {type:'line', x1:px(0), y1:PH, x2:-Math.max(160, 12*k), y2:PH},
      {type:'double', x1:-Math.max(120, 8*k), y1:innerH, x2:-Math.max(120, 8*k), y2:PH, lx:-Math.max(135, 9*k), ly:(innerH+PH)/2, text: dimLabel(upperSpanVal + midPlankWidthVal - overhangVal)+' мм', vertical:true},
      {type:'line', x1:px(0), y1:0, x2:-Math.max(150, 30*k), y2:0},
      {type:'double', x1:-Math.max(40, 27*k), y1:0, x2:-Math.max(40, 27*k), y2:innerH, lx:-Math.max(100, 28*k), ly:innerH/2, text: dimLabel(upperSpanVal)+' мм', vertical:true}
    );
  }
  records.forEach(r=>{ ['y1','y2','ly'].forEach(k=>{ if(typeof r[k]==='number') r[k] += up; }); });
  const title = `Щит боковой (${F} эт., ${P} планок${hasBraces === false ? ', без раскосин' : xMode ? ', X-раскосины' : ''}) - схема расположения деталей`;
  return renderDiagram(i3genSvg(IW, IH, shapes), title, IW, IH, records, null, photoStrokeScale(IW));
}

// --- Крышка: реальное число планок (l19) и поперечных брусьев (l21) ---
// Вид - как на фото крышки (косоугольная проекция): длина крышки идёт вправо-
// вверх (eu), ширина - влево-вверх (ev); планки лежат сверху поперёк крышки,
// поперечные брусья - снизу и видны торцами за передней и задней кромками.
// Положение планок/брусьев вдоль длины - в реальных пропорциях; сама длина
// крышки на чертеже - в пределах 1.4..4 её ширины (иначе очень длинная
// крышка превратилась бы в тонкую полосу).
function diagramKryshkaGen(widthMm, lengthMm, t30, t32, t41, t40, edgeDistKryshkaMm, crossBeamQty, crossBeamWidthMm, plankCount, plankGapMm){
  const lidLen = lengthMm + t30*2 + t32*2, lidW = widthMm + t41*2;
  const P = Math.max(1, Math.round(plankCount)), B = Math.max(0, Math.round(crossBeamQty));
  const eu = [0.9507, -0.3101], ev = [-0.4406, -0.8977];
  const Wv = 850, Lu = Wv * Math.min(4, Math.max(1.4, lidLen / lidW));
  const k = Lu / lidLen;                            // единиц чертежа на 1 мм вдоль длины
  // ширина планки/бруса на чертеже - не меньше, чем на фото крышки (схема, не
  // в масштабе: при реальных 100 мм на длинной крышке они были бы нитками),
  // но не шире, чем позволяет промежуток между соседними.
  const minGapU = P > 1 ? plankGapMm*k : Lu;
  const pw = Math.min(Math.max(100*k, 120), 0.55*minGapU);
  const bw = Math.min(pw, B > 0 ? 0.55*(Lu/(B+1)) : pw); // брусья - той же ширины, что и планки
  const up = [-8, -26], thick = [7, 20];            // подъём планок над крышкой, толщина крышки
  const pt = (u, v, d) => [u*eu[0] + v*ev[0] + (d?d[0]:0), u*eu[1] + v*ev[1] + (d?d[1]:0)];
  const polys = [];                                 // [точки] в порядке отрисовки
  const quad = (u0, u1, v0, v1, d) => [pt(u0,v0,d), pt(u1,v0,d), pt(u1,v1,d), pt(u0,v1,d)];
  const box = (u0, u1, v0, v1, lift) => {           // брусок: боковые грани + верх
    const base = lift ? up.map(x=>0) : thick, top = lift ? up : [0,0];
    polys.push([pt(u0,v0,base), pt(u1,v0,base), pt(u1,v0,top), pt(u0,v0,top)]);  // передняя грань
    polys.push([pt(u0,v0,base), pt(u0,v1,base), pt(u0,v1,top), pt(u0,v0,top)]);  // левая грань
    polys.push(quad(u0, u1, v0, v1, top));
  };
  // поперечные брусья - под крышкой, торцы видны за кромками
  const beamStep = B > 0 ? (lidLen - B*(crossBeamWidthMm||100)) / (B + 1) : 0;
  const beamU = i => (beamStep*(i+1) + i*(crossBeamWidthMm||100)) * k;
  for(let i=0; i<B; i++){
    const u0 = beamU(i);
    polys.push(quad(u0, u0+bw, -0.13*Wv, 1.13*Wv, [thick[0]*2, thick[1]*2]));
    polys.push([pt(u0,-0.13*Wv,[thick[0]*2,thick[1]*2]), pt(u0+bw,-0.13*Wv,[thick[0]*2,thick[1]*2]), pt(u0+bw,-0.13*Wv,[thick[0]*3.5,thick[1]*3.5]), pt(u0,-0.13*Wv,[thick[0]*3.5,thick[1]*3.5])]);
  }
  // крышка: передняя и левая грани толщины + верх
  polys.push([pt(0,0), pt(Lu,0), pt(Lu,0,thick), pt(0,0,thick)]);
  polys.push([pt(0,0), pt(0,Wv), pt(0,Wv,thick), pt(0,0,thick)]);
  polys.push(quad(0, Lu, 0, Wv));
  // планки сверху
  const plankU = i => P > 1 ? (edgeDistKryshkaMm + i*plankGapMm) * k : (Lu - pw)/2;
  for(let i=0; i<P; i++){
    const u0 = Math.min(Math.max(plankU(i), 0), Lu - pw);
    box(u0, u0 + pw, 0.05*Wv, 0.95*Wv, true);
  }
  // сдвиг всего в положительные координаты
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  polys.forEach(p=>p.forEach(([x,y])=>{ minX=Math.min(minX,x); minY=Math.min(minY,y); maxX=Math.max(maxX,x); maxY=Math.max(maxY,y); }));
  const m = 10, ox = m - minX, oy = m - minY;
  const IW = Math.round(maxX - minX + 2*m), IH = Math.round(maxY - minY + 2*m);
  const shapes = polys.map(p=>`<polygon points="${p.map(([x,y])=>i3f(x+ox)+','+i3f(y+oy)).join(' ')}"/>`).join('');
  const P2 = (u, v, d) => { const q = pt(u, v, d); return [q[0]+ox, q[1]+oy]; };

  // подписи (те же, что на фото крышки)
  const valLen = dimLabel(lidLen), valWidth = dimLabel(lidW), valPlankaThick = dimLabel(t40);
  const valEdgePlanka = dimLabel(edgeDistKryshkaMm);
  const valEdgeBeam = B > 0 ? dimLabel((dimLabel(lidLen) - B*crossBeamWidthMm) / (B + 1)) : dimLabel(lidLen);
  const off = (q, v, s) => [q[0] + v[0]*s, q[1] + v[1]*s];
  const nfront = [-ev[0], -ev[1]], nright = eu, nback = ev;
  const D = P2(0,0,thick), C = P2(Lu,0,thick), Bk = P2(Lu,Wv);
  const records = [];
  // длина - вдоль передней кромки, снаружи
  const d1 = off(D, nfront, 260), d2 = off(C, nfront, 260);
  records.push({type:'line', x1:D[0], y1:D[1], x2:off(D,nfront,300)[0], y2:off(D,nfront,300)[1]});
  records.push({type:'line', x1:C[0], y1:C[1], x2:off(C,nfront,300)[0], y2:off(C,nfront,300)[1]});
  records.push({type:'double', x1:d1[0], y1:d1[1], x2:d2[0], y2:d2[1], lx:(d1[0]+d2[0])/2, ly:(d1[1]+d2[1])/2, text: valLen+' мм'});
  // ширина - вдоль правой кромки, снаружи
  const Cr = P2(Lu,0), w1 = off(Cr, nright, 200), w2 = off(Bk, nright, 200);
  records.push({type:'line', x1:Cr[0], y1:Cr[1], x2:off(Cr,nright,240)[0], y2:off(Cr,nright,240)[1]});
  records.push({type:'line', x1:Bk[0], y1:Bk[1], x2:off(Bk,nright,240)[0], y2:off(Bk,nright,240)[1]});
  records.push({type:'double', x1:w1[0], y1:w1[1], x2:w2[0], y2:w2[1], lx:(w1[0]+w2[0])/2, ly:(w1[1]+w2[1])/2, text: valWidth+' мм'});
  // отступ крайней планки от края крышки - за задней кромкой, у правого конца
  const uLast = Math.min(Math.max(plankU(P-1), 0), Lu - pw) + pw;
  const e1 = P2(uLast, Wv, up), e2 = P2(Lu, Wv);
  const ea = off(e1, nback, 170), eb = off(e2, nback, 170);
  records.push({type:'line', x1:e1[0], y1:e1[1], x2:off(e1,nback,210)[0], y2:off(e1,nback,210)[1]});
  records.push({type:'line', x1:e2[0], y1:e2[1], x2:off(e2,nback,210)[0], y2:off(e2,nback,210)[1]});
  records.push({type:'double', x1:ea[0], y1:ea[1], x2:eb[0], y2:eb[1], lx:(ea[0]+eb[0])/2, ly:(ea[1]+eb[1])/2 - 40, text: valEdgePlanka+' мм'});
  // отступ крайнего поперечного бруса - у левого конца, за передней кромкой
  if(B > 0){
    const b1 = off(P2(0,0,thick), nfront, 120), b2 = off(P2(beamU(0),0,thick), nfront, 120);
    records.push({type:'double', x1:b1[0], y1:b1[1], x2:b2[0], y2:b2[1]});
    const mid = [(b1[0]+b2[0])/2, (b1[1]+b2[1])/2];
    records.push({type:'single', x1:mid[0]-150, y1:mid[1]+230, x2:mid[0], y2:mid[1], lx:mid[0]-160, ly:mid[1]+270, text: valEdgeBeam+' мм'});
  }
  // толщина планки бокового щита - сноска к левому заднему углу первой планки
  const u1 = Math.min(Math.max(plankU(0), 0), Lu - pw);
  const tc = P2(u1, 0.95*Wv, up);
  records.push({type:'single', x1:tc[0]-260, y1:tc[1]-120, x2:tc[0], y2:tc[1], lx:tc[0]-290, ly:tc[1]-160, text: valPlankaThick+' мм'});

  const stroke = i3stroke(IW, IH);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${IW}" height="${IH}" viewBox="0 0 ${IW} ${IH}">`
    + `<rect width="100%" height="100%" fill="#fff"/>`
    + `<g fill="#fff" stroke="#000" stroke-width="${stroke}" stroke-linejoin="round">${shapes}</g></svg>`;
  return renderDiagram('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), `Крышка (${P} планок) - схема расположения деталей`, IW, IH, records, null, photoStrokeScale(IW));
}
