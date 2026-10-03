// ГОСТ 10198-91, тип I-4: чертёж «Крышка» - всегда генерируемый (SVG,
// функции generated.js), т.к. на фото крышки I-3 обшивка сплошная: доски
// крышки с промежутками (boards.js), пояса-планки снизу, поперечные брусья
// сверху.

// --- Крышка: реальное число планок (l19) и поперечных брусьев (l21) ---
// Вид - как на фото крышки (косоугольная проекция): длина крышки идёт вправо-
// вверх (eu), ширина - влево-вверх (ev); планки лежат сверху поперёк крышки,
// поперечные брусья - снизу и видны торцами за передней и задней кромками.
// Положение планок/брусьев вдоль длины - в реальных пропорциях; сама длина
// крышки на чертеже - в пределах 1.4..4 её ширины (иначе очень длинная
// крышка превратилась бы в тонкую полосу).
// I-4: boardGap - промежуток обшивки ({ gap, ... }) или null - доски
// вплотную: доски крышки идут вдоль длины, на чертеже - 3 полосы (см.
// boards.js), сквозь промежутки видны пояса-планки снизу.
const I4_LID_BOARD_GAP = 0.08; // промежуток на чертеже - доля ширины крышки
function diagramKryshkaGen(widthMm, lengthMm, t30, t32, t41, t40, edgeDistKryshkaMm, crossBeamQty, crossBeamWidthMm, plankCount, plankGapMm, plankEdgeGapVal, beamEdgeMm, beamGapMm, boardGap){
  const lidLen = lengthMm + t30*2 + t32*2, lidW = widthMm + t41*2;
  const P = Math.max(1, Math.round(plankCount)), B = Math.max(0, Math.round(crossBeamQty));
  const eu = [0.9507, -0.3101], ev = [-0.4406, -0.8977];
  // Длина чертежа - не больше 2.5 ширин (по указанию пользователя «поплотнее»:
  // схема не в масштабе, реальные размеры - в подписях; раньше было до 4, и
  // длинная крышка превращалась в узкую полосу).
  const Wv = 850, Lu = Wv * Math.min(2.5, Math.max(1.4, lidLen / lidW));
  const k = Lu / lidLen;                            // единиц чертежа на 1 мм вдоль длины
  // Как на фото крышки (по уточнению пользователя): пояса-планки - снизу, из-под
  // крышки видны только их концы за передней и задней кромками; сверху -
  // внутренние поперечные брусья. Ширина планки/бруса на чертеже - не меньше,
  // чем на фото (схема, не в масштабе: при реальных 100 мм на длинной крышке они
  // были бы нитками), но не шире, чем позволяет промежуток между соседними.
  const minGapU = P > 1 ? plankGapMm*k : Lu;       // plankGapMm - шаг поясов по осям
  const pw = Math.min(Math.max(100*k, 120), 0.55*minGapU);
  const bw = B > 0 ? Math.min(Math.max(100*k, 120), 0.55*(Lu/(B+1))) : 0;
  // Планки/брусья слились бы - заглушка (размер картинки - по проекции крышки).
  const gaps = [P > 1 ? plankGapMm*k - pw : Infinity, B > 1 ? ((crossBeamWidthMm||100) + beamGapMm)*k - bw : Infinity];
  const IWe = Lu*0.9507 + Wv*0.4406, IHe = Lu*0.3101 + Wv*0.8977;
  if(diagramIsTooDense(Math.min(...gaps) - i3stroke(IWe, IHe), IWe)) return diagramTooDense();
  const up = [-8, -26], thick = [7, 20];            // подъём брусьев над крышкой, толщина крышки
  const low = [thick[0]*2, thick[1]*2], lowEnd = [thick[0]*3.5, thick[1]*3.5]; // планки под крышкой
  const pt = (u, v, d) => [u*eu[0] + v*ev[0] + (d?d[0]:0), u*eu[1] + v*ev[1] + (d?d[1]:0)];
  const polys = [];                                 // [точки] в порядке отрисовки
  const quad = (u0, u1, v0, v1, d) => [pt(u0,v0,d), pt(u1,v0,d), pt(u1,v1,d), pt(u0,v1,d)];
  const box = (u0, u1, v0, v1) => {                 // брус сверху: боковые грани + верх
    polys.push([pt(u0,v0), pt(u1,v0), pt(u1,v0,up), pt(u0,v0,up)]);  // передняя грань
    polys.push([pt(u0,v0), pt(u0,v1), pt(u0,v1,up), pt(u0,v0,up)]);  // левая грань
    polys.push(quad(u0, u1, v0, v1, up));
  };
  // пояса-планки - под крышкой, концы видны за кромками
  const plankU = i => Math.min(Math.max(P > 1 ? (edgeDistKryshkaMm + i*plankGapMm) * k : (Lu - pw)/2, 0), Lu - pw);
  for(let i=0; i<P; i++){
    const u0 = plankU(i);
    polys.push(quad(u0, u0+pw, -0.13*Wv, 1.13*Wv, low));
    polys.push([pt(u0,-0.13*Wv,low), pt(u0+pw,-0.13*Wv,low), pt(u0+pw,-0.13*Wv,lowEnd), pt(u0,-0.13*Wv,lowEnd)]);
  }
  // крышка - 3 доски вдоль длины (от дальней к ближней): передняя и левая
  // грани толщины + верх; доски - светло-серые (как на щитах).
  const lidStrips = i4BoardStrips(0, Wv, !!boardGap, I4_LID_BOARD_GAP);
  const boardPolyFrom = polys.length;
  lidStrips.slice().reverse().forEach(([v0, v1])=>{
    polys.push([pt(0,v0), pt(Lu,v0), pt(Lu,v0,thick), pt(0,v0,thick)]);
    polys.push([pt(0,v0), pt(0,v1), pt(0,v1,thick), pt(0,v0,thick)]);
    polys.push(quad(0, Lu, v0, v1));
  });
  const boardPolyTo = polys.length;
  // внутренние поперечные брусья - сверху
  // расстановка - как в расчёте: отступ beamEdgeMm, зазор между кромками beamGapMm
  const beamU = i => Math.min(Math.max((beamEdgeMm + i*((crossBeamWidthMm||100) + beamGapMm)) * k, 0), Lu - bw);
  for(let i=0; i<B; i++){
    const u0 = beamU(i);
    box(u0, u0 + bw, 0.05*Wv, 0.95*Wv);
  }
  // сдвиг всего в положительные координаты
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  polys.forEach(p=>p.forEach(([x,y])=>{ minX=Math.min(minX,x); minY=Math.min(minY,y); maxX=Math.max(maxX,x); maxY=Math.max(maxY,y); }));
  const m = 10, ox = m - minX, oy = m - minY;
  const IW = Math.round(maxX - minX + 2*m), IH = Math.round(maxY - minY + 2*m);
  const shapes = polys.map((p, i)=>`<polygon points="${p.map(([x,y])=>i3f(x+ox)+','+i3f(y+oy)).join(' ')}"${i >= boardPolyFrom && i < boardPolyTo ? ` fill="${I4_BOARD_FILL}"` : ''}/>`).join('');
  const P2 = (u, v, d) => { const q = pt(u, v, d); return [q[0]+ox, q[1]+oy]; };

  // подписи (те же, что на фото крышки)
  const valLen = dimLabel(lidLen), valWidth = dimLabel(lidW), valPlankaThick = dimLabel(t40);
  const valEdgePlanka = dimLabel(edgeDistKryshkaMm);
  const off = (q, v, s) => [q[0] + v[0]*s, q[1] + v[1]*s];
  const nfront = [-ev[0], -ev[1]], nright = eu, nback = ev, nleft = [-eu[0], -eu[1]];
  // ~1px экрана в единицах чертежа (чертёж вписывается в ~290×240px) - чтобы
  // подписи ставить рядом со стрелкой, а не поверх неё (по замечанию
  // пользователя: подпись, накрывшая короткую стрелку, закрывает её концы и
  // выносные линии - непонятно, что измерено).
  const pxU = Math.max((maxX - minX)/290, (maxY - minY)/240);
  const D = P2(0,0,thick), C = P2(Lu,0,thick), Bk = P2(Lu,Wv);
  const records = [];
  // Ряды размеров перед крышкой (от кромки наружу, по указанию пользователя -
  // как можно ближе к чертежу): 1 - отступ крайней планки (у левого конца) и
  // зазор между поперечными брусьями (в середине, подпись - справа на
  // продолжении стрелки), 2 - длина крышки. Отступ крайнего бруса - на самой
  // крышке (см. ниже).
  // концы планок выступают перед кромкой на ~155 ед.; подписи ряда (высотой
  // ~22px) не должны на них наезжать
  const rowNear = 155 + 15*pxU;
  // Подпись зазора между поперечными брусьями (ближний ряд) встанет по
  // центру стрелки, если помещается между наконечниками (см. dimFit) - тогда
  // ряд длины крышки дальше, чтобы подписи рядов не наехали друг на друга.
  const beamGapCentered = (()=>{
    if(B < 2) return false;
    const gi = Math.floor((B-1)/2), ua = beamU(gi) + bw, ub = beamU(gi+1);
    const len = Math.hypot(...[0,1].map(i => P2(ub,0,thick)[i] - P2(ua,0,thick)[i]));
    return len >= (String(dimLabel(beamGapMm)).length + 3) * 8.2 * pxU + 16*pxU + 2*9*photoStrokeScale(IW) + 6*pxU;
  })();
  const dOff = rowNear + (beamGapCentered ? 48 : 30)*pxU;
  // Размер a-b, который помещается в своё место (по замечанию пользователя:
  // наконечники и подписи не должны вылезать за размер и налезать на
  // соседние): подпись помещается между наконечниками - она по центру
  // стрелки; не помещается, но помещаются наконечники - стрелка внутри,
  // подпись снаружи; не помещаются и наконечники - стрелки снаружи,
  // направленные к выносным линиям. Подпись снаружи - вплотную к стрелке у
  // конца outAt ('a' | 'b') в сторону outDir (единичный вектор), со сдвигом
  // shift (в единицах чертежа); outside - подпись всегда снаружи (размер на
  // самой крышке: подпись по центру закрыла бы детали).
  const headU = 9 * photoStrokeScale(IW);
  const labelLenU = text => (text.length * 8.2 + 16) * pxU;
  const fits = (a, b, text) => Math.hypot(b[0]-a[0], b[1]-a[1]) >= labelLenU(text) + 2*headU + 6*pxU;
  const dimFit = (a, b, text, outAt, outDir, shift, outside) => {
    const len = Math.hypot(b[0]-a[0], b[1]-a[1]), ux = (b[0]-a[0])/len, uy = (b[1]-a[1])/len;
    if(!outside && fits(a, b, text)){
      records.push({type:'double', x1:a[0], y1:a[1], x2:b[0], y2:b[1], lx:(a[0]+b[0])/2, ly:(a[1]+b[1])/2, text});
      return;
    }
    let tail = 0;
    if(len >= 2.4*headU){
      records.push({type:'double', x1:a[0], y1:a[1], x2:b[0], y2:b[1]});
    } else {
      tail = 1.8*headU;
      records.push({type:'line', x1:a[0], y1:a[1], x2:b[0], y2:b[1]});
      records.push({type:'single', x1:a[0] - ux*tail, y1:a[1] - uy*tail, x2:a[0], y2:a[1]});
      records.push({type:'single', x1:b[0] + ux*tail, y1:b[1] + uy*tail, x2:b[0], y2:b[1]});
    }
    const from = outAt === 'a' ? a : b;
    // половина подписи вдоль outDir: по ширине и высоте (~22px) подписи
    const half = Math.abs(outDir[0]) * labelLenU(text)/2 + Math.abs(outDir[1]) * 11*pxU;
    const lab = off(from, outDir, tail + 5*pxU + half);
    const sh = shift || [0, 0];
    records.push({type:'label', lx:lab[0] + sh[0], ly:lab[1] + sh[1], text});
  };
  // длина крышки - во втором ряду перед крышкой
  const d1 = off(D, nfront, dOff), d2 = off(C, nfront, dOff);
  records.push({type:'line', x1:D[0], y1:D[1], x2:off(D,nfront,dOff+40)[0], y2:off(D,nfront,dOff+40)[1]});
  records.push({type:'line', x1:C[0], y1:C[1], x2:off(C,nfront,dOff+40)[0], y2:off(C,nfront,dOff+40)[1]});
  records.push({type:'double', x1:d1[0], y1:d1[1], x2:d2[0], y2:d2[1], lx:(d1[0]+d2[0])/2, ly:(d1[1]+d2[1])/2, text: valLen+' мм'});
  // ширина - вдоль правой кромки, снаружи; при промежутках между досками -
  // дальше, чтобы между ней и крышкой поместился размер промежутка.
  const gapText = boardGap ? dimLabel(boardGap.gap)+' мм' : '';
  const gapOff = 130;                                // стрелки промежутка - от кромки крышки
  const wOff = boardGap ? gapOff + 10*pxU + labelLenU(gapText) + 18*pxU : 200;
  const Cr = P2(Lu,0), w1 = off(Cr, nright, wOff), w2 = off(Bk, nright, wOff);
  records.push({type:'line', x1:Cr[0], y1:Cr[1], x2:off(Cr,nright,wOff+40)[0], y2:off(Cr,nright,wOff+40)[1]});
  records.push({type:'line', x1:Bk[0], y1:Bk[1], x2:off(Bk,nright,wOff+40)[0], y2:off(Bk,nright,wOff+40)[1]});
  records.push({type:'double', x1:w1[0], y1:w1[1], x2:w2[0], y2:w2[1], lx:(w1[0]+w2[0])/2, ly:(w1[1]+w2[1])/2, text: valWidth+' мм'});
  // Размеры по концам планок за задней кромкой: выносные линии - от дальних
  // углов концов планок (и от угла крышки), размер - на 170 за кромкой.
  const backDim = (uA, uB, fromA, fromB, text) => {
    const a = off(P2(uA, Wv), nback, 170), b = off(P2(uB, Wv), nback, 170);
    const ea = off(P2(uA, Wv), nback, 200), eb = off(P2(uB, Wv), nback, 200);
    records.push({type:'line', x1:fromA[0], y1:fromA[1], x2:ea[0], y2:ea[1]});
    records.push({type:'line', x1:fromB[0], y1:fromB[1], x2:eb[0], y2:eb[1]});
    const lab = off([(a[0]+b[0])/2, (a[1]+b[1])/2], nback, 26*pxU); // подпись - за стрелкой
    if(Math.hypot(b[0]-a[0], b[1]-a[1]) >= 2.4*headU) records.push({type:'double', x1:a[0], y1:a[1], x2:b[0], y2:b[1], lx:lab[0], ly:lab[1], text});
    else dimFit(a, b, text, 'b', nright);
  };
  const tip = u => P2(u, 1.13*Wv, low);             // дальний угол конца планки
  // зазор между кромками соседних планок (по указанию пользователя, как у
  // типа I-1) - в средней секции, чтобы не наезжать на подпись отступа
  if(P > 1){
    const gi = Math.floor((P-1)/2);
    const ga = plankU(gi) + pw, gb = plankU(gi+1);
    backDim(ga, gb, tip(ga), tip(gb), dimLabel(plankEdgeGapVal)+' мм');
  }
  // Отступ от края ящика до края крайней планки (по указанию пользователя) -
  // у левого конца, спереди: выносные линии - от левого переднего угла
  // крышки и от переднего конца первой планки, размер - перед крышкой, за
  // концами планок; подпись - слева, на продолжении стрелки. Отступ
  // поперечного бруса на этом чертеже пока не показываем (пользователь
  // добавит позже).
  {
    const pu0 = plankU(0), bOff = rowNear;
    const b1 = off(D, nfront, bOff), b2 = off(P2(pu0, 0, thick), nfront, bOff);
    const e1 = off(D, nfront, bOff + 30), e2 = off(P2(pu0, 0, thick), nfront, bOff + 30);
    const s2 = P2(pu0, -0.13*Wv, lowEnd);            // передний конец первой планки
    records.push({type:'line', x1:D[0], y1:D[1], x2:e1[0], y2:e1[1]});
    records.push({type:'line', x1:s2[0], y1:s2[1], x2:e2[0], y2:e2[1]});
    dimFit(b1, b2, valEdgePlanka+' мм', 'a', nleft);
  }
  // Поперечные брусья (сверху, видны целиком) - по указанию пользователя:
  // отступ от края ящика до кромки крайнего бруса и зазор между кромками
  // соседних брусьев. Выносные линии - от передних углов самих брусьев,
  // отступ - на самой крышке, на середине её глубины: от левого края крышки до
  // кромки первого бруса, подпись - левее крышки на продолжении стрелки (по
  // указанию пользователя); зазор - в первом ряду перед крышкой, подпись
  // справа на продолжении стрелки.
  if(B > 0){
    const vB = 0.05*Wv;                              // передние торцы брусьев
    const beamDim = (uA, uB, fromA, fromB, row) => {
      const a = off(P2(uA, 0, thick), nfront, row), b = off(P2(uB, 0, thick), nfront, row);
      const ea = off(P2(uA, 0, thick), nfront, row + 30), eb = off(P2(uB, 0, thick), nfront, row + 30);
      records.push({type:'line', x1:fromA[0], y1:fromA[1], x2:ea[0], y2:ea[1]});
      records.push({type:'line', x1:fromB[0], y1:fromB[1], x2:eb[0], y2:eb[1]});
      return [a, b];
    };
    const bu0 = beamU(0);
    const ea = P2(0, 0.5*Wv), eb = P2(bu0, 0.5*Wv);
    const edgeText = dimLabel(beamEdgeMm)+' мм';
    dimFit(ea, eb, edgeText, 'a', nleft, null, true);
    if(B > 1){
      const gi = Math.floor((B-1)/2), ua = beamU(gi) + bw, ub = beamU(gi+1);
      const [ga, gb] = beamDim(ua, ub, P2(ua, vB), P2(ub, vB), rowNear);
      // подпись - справа на продолжении стрелки; стрелка идёт вверх-вправо, поэтому
      // подпись опущена на столько же, чтобы не наезжать на концы планок
      const gapBText = dimLabel(beamGapMm)+' мм';
      dimFit(ga, gb, gapBText, 'b', nright, [nfront[0]*14*pxU, nfront[1]*14*pxU]);
    }
  }
  // Промежуток между досками крышки - у правого конца, между крышкой и
  // размером ширины: выносные линии от кромок досок у первого промежутка,
  // подпись - правее стрелок.
  if(boardGap){
    const va = lidStrips[0][1], vb = lidStrips[1][0];
    const a0 = P2(Lu, va), b0 = P2(Lu, vb);
    const a = off(a0, nright, gapOff), b = off(b0, nright, gapOff);
    const ea = off(a0, nright, gapOff + 20), eb = off(b0, nright, gapOff + 20);
    records.push({type:'line', x1:a0[0], y1:a0[1], x2:ea[0], y2:ea[1]});
    records.push({type:'line', x1:b0[0], y1:b0[1], x2:eb[0], y2:eb[1]});
    // подпись - правее стрелок, на уровне промежутка
    const mid = [(a[0]+b[0])/2, (a[1]+b[1])/2];
    const lab = off(mid, nright, 10*pxU + labelLenU(gapText)/2);
    if(fits(a, b, gapText)) dimFit(a, b, gapText);
    else {
      const len = Math.hypot(b[0]-a[0], b[1]-a[1]), ux = (b[0]-a[0])/len, uy = (b[1]-a[1])/len, t = 1.8*headU;
      records.push({type:'line', x1:a[0], y1:a[1], x2:b[0], y2:b[1]});
      records.push({type:'single', x1:a[0] - ux*t, y1:a[1] - uy*t, x2:a[0], y2:a[1]});
      records.push({type:'single', x1:b[0] + ux*t, y1:b[1] + uy*t, x2:b[0], y2:b[1]});
      records.push({type:'label', lx:lab[0], ly:lab[1], text:gapText});
    }
  }
  // толщина планки - сноска к дальнему левому углу конца первой планки
  const tc = tip(plankU(0));
  records.push({type:'single', x1:tc[0]-260, y1:tc[1]-120, x2:tc[0], y2:tc[1], lx:tc[0]-290, ly:tc[1]-160, text: valPlankaThick+' мм'});

  // Толщина линий (по указанию пользователя): как у остальных чертежей, пока
  // это выглядит нормально, и постепенно тоньше, когда крышка длинная и
  // чертёж сильно уменьшен - иначе две кромки толщины щита (~21 ед.
  // чертежа, не зависят от длины) сливаются в жирную полосу. Линия - не
  // больше 60% зазора между этими кромками на экране, но не тоньше
  // половины обычной (~1px, как на чертежах-фото).
  const gapPx = Math.hypot(thick[0], thick[1]) / Math.max(IW/290, IH/240);
  const strokeK = Math.max(0.5, Math.min(1, 0.6*gapPx / 2));
  return i3render(`Крышка (${P} планок) - схема расположения деталей`, IW, IH, shapes, records, 'round', strokeK);
}

// Чертёж крышки для результата расчёта. I-4: всегда генерируемый - на фото
// I-3 обшивка сплошная.
function diagramKryshkaFor(calc){
  return diagramKryshkaGen(calc.W, calc.L, calc.t30, calc.t32, calc.t41, calc.t40, calc.edgeDistKryshka, calc.l21, calc.w21, calc.l19, calc.bokSectionW, calc.plankGap, calc.beamEdgeDist, calc.beamGap, calc.boardGaps.kryshka);
}
