// ГОСТ 10198-91, тип I-3: чертёж «Крышка». Фото есть для 2 планок + 2
// поперечных бруса и 3 планок + 3 бруса; при любом другом сочетании чертёж
// генерируется (diagramKryshkaGen).
const KRYSHKA_IMG_B64 = "/images/kryshka.png"; // натуральный размер 1718x1274
const KRYSHKA_2BEAMS_IMG_B64 = "/images/kryshka_2beams.jpg"; // натуральный размер 1157x839 (вариант с 2 поперечными брусьями)

function diagramKryshkaDefault(widthMm, lengthMm, t30, t32, t41, t40, edgeDistKryshkaMm, crossBeamQty, crossBeamWidthMm, plankGapMm, plankEdgeGapVal, beamEdgeMm, beamGapMm){
  // Фото под 3 планки крышки (l19=3) - выбор чертежа крышки идёт по l19, см. diagramKryshka().
  // Длина крышки = длина груза + (толщина доски торца + толщина планки торца)*2 (см. k9Base).
  const valLen        = dimLabel(lengthMm + t30*2 + t32*2);
  // Ширина груза + толщина основной доски боковой стенки*2.
  const valWidth       = dimLabel(widthMm + t41*2);
  // Толщина вертикальной боковой планки (t40, планка бокового щита) - при
  // «Оптимизировать размеры» увеличена на 2мм (t40Display в расчёте).
  const valPlankaThick  = dimLabel(t40);
  // Расстояние от крайней планки крышки до края крышки (edgeDistKryshka = min(L/6, 1000)).
  const valEdgePlanka   = dimLabel(edgeDistKryshkaMm);
  // Расстояние от края крышки до кромки крайнего поперечного бруса - из расчёта
  // (beamEdgeMm: зазор между брусьями ровно beamGapMm=800, остаток пополам - см.
  // l21 в расчёте), а не прежнее равномерное деление.
  const valEdgeBeam     = dimLabel(beamEdgeMm);
  const valBeamGap      = dimLabel(beamGapMm);
  // Зазор между кромками соседних поясов-планок (plankEdgeGapVal) - по более
  // позднему указанию пользователя показываем (как у типа I-1): за задней
  // кромкой, между торчащими из-под крышки концами 1-й и 2-й планок.
  const valPlankGap = dimLabel(plankEdgeGapVal);

  const records = [
    {type:'line', x1:371, y1:1138, x2:506, y2:1432},
    {type:'line', x1:1661, y1:702, x2:1799, y2:1003},
    {type:'double', x1:1791, y1:991, x2:497, y2:1411, lx:1203, ly:1218, text: valLen+' мм'},
    {type:'line', x1:1140, y1:95, x2:1599, y2:-52},
    {type:'line', x1:1494, y1:845, x2:1909, y2:710},
    {type:'double', x1:1526, y1:-28, x2:1899, y2:714, lx:1748, ly:350, text: valWidth+' мм'},
    {type:'line', x1:1401, y1:160, x2:1245, y2:-168},
    {type:'line', x1:1093, y1:110, x2:993, y2:-101},
    {type:'double', x1:1006, y1:-73, x2:1255, y2:-150, lx:1115, ly:-141, text: valEdgePlanka+' мм'},
    {type:'double', x1:299, y1:989, x2:441, y2:936},
    {type:'single', x1:194, y1:1236, x2:377, y2:959, lx:205, ly:1296, text: valEdgeBeam+' мм'},
    {type:'line', x1:273, y1:422, x2:251, y2:378},
    {type:'single', x1:-51, y1:266, x2:263, y2:400, lx:-85, ly:225, text: valPlankaThick+' мм'},
    {type:'line', x1:273, y1:263, x2:195, y2:124},
    {type:'line', x1:567, y1:178, x2:489, y2:39},
    {type:'double', x1:204, y1:141, x2:498, y2:56, lx:276, ly:-35, text: valPlankGap+' мм'}, // подпись - за стрелкой: стрелка короче подписи
    // зазор между кромками 1-го и 2-го поперечных брусьев - на продолжении
    // размера отступа бруса, подпись - за стрелкой, в промежутке между брусьями
    {type:'double', x1:572, y1:887, x2:880, y2:772, lx:661, ly:692, text: valBeamGap+' мм'}
  ];

  return renderDiagram(KRYSHKA_IMG_B64, 'Крышка - схема расположения деталей', 1718, 1274, records, null, photoStrokeScale(1718));
}

function diagramKryshka2Beams(widthMm, lengthMm, t30, t32, t41, t40, edgeDistKryshkaMm, crossBeamQty, crossBeamWidthMm, plankGapMm, plankEdgeGapVal, beamEdgeMm, beamGapMm){
  // Фото под 2 планки крышки (l19=2, натуральный размер 1157×839) - выбор чертежа
  // крышки идёт по l19, см. diagramKryshka().
  const valLen      = dimLabel(lengthMm + t30*2 + t32*2);
  const valWidth    = dimLabel(widthMm + t41*2);
  const valPlankaThick = dimLabel(t40);
  const valEdgePlanka  = dimLabel(edgeDistKryshkaMm);
  const valEdgeBeam    = dimLabel(beamEdgeMm); // из расчёта, см. diagramKryshkaDefault
  const valBeamGap     = dimLabel(beamGapMm);
  // Зазор между кромками поясов-планок - за задней кромкой, между концами
  // планок (см. diagramKryshkaDefault выше).
  const valPlankGap = dimLabel(plankEdgeGapVal);

  const records = [
    {type:'line', x1:373, y1:758, x2:433, y2:865},
    {type:'line', x1:244, y1:734, x2:353, y2:939},
    {type:'line', x1:320, y1:877, x2:420, y2:843},
    {type:'single', x1:81, y1:828, x2:372, y2:857, lx:53, ly:799, text: valEdgePlanka+' мм'},
    {type:'line', x1:184, y1:175, x2:-107, y2:268},
    {type:'line', x1:222, y1:236, x2:-82, y2:331},
    {type:'line', x1:-76, y1:256, x2:-50, y2:320},
    {type:'single', x1:250, y1:-31, x2:-63, y2:289, lx:301, ly:-65, text: valPlankaThick+' мм'},
    {type:'line', x1:1098, y1:453, x2:1199, y2:642},
    {type:'double', x1:347, y1:929, x2:1200, y2:641, lx:805, ly:779, text: valLen+' мм'},
    {type:'line', x1:764, y1:62, x2:995, y2:-13},
    {type:'line', x1:1007, y1:552, x2:1234, y2:480},
    {type:'double', x1:996, y1:-13, x2:1236, y2:479, lx:1155, ly:205, text: valWidth+' мм'},
    {type:'line', x1:173, y1:351, x2:75, y2:384},
    {type:'single', x1:28, y1:607, x2:117, y2:371, lx:5, ly:639, text: valEdgeBeam+' мм'},
    {type:'line', x1:187, y1:175, x2:147, y2:105},
    {type:'line', x1:610, y1:45, x2:570, y2:-25},
    {type:'double', x1:157, y1:123, x2:580, y2:-7, lx:368, ly:52, text: valPlankGap+' мм'},
    // зазор между кромками поперечных брусьев - подпись за стрелкой, между брусьями
    {type:'double', x1:344, y1:500, x2:801, y2:355, lx:528, ly:334, text: valBeamGap+' мм'}
  ];

  return renderDiagram(KRYSHKA_2BEAMS_IMG_B64, 'Крышка (2 поперечных бруса) - схема расположения деталей', 1157, 839, records, null, photoStrokeScale(1157));
}

function diagramKryshka(widthMm, lengthMm, t30, t32, t41, t40, edgeDistKryshkaMm, crossBeamQty, crossBeamWidthMm, plankCount, plankGapMm, plankEdgeGapVal, beamEdgeMm, beamGapMm){
  // Фото крышки - 2 планки + 2 поперечных бруса и 3 планки + 3 бруса. Вызывается,
  // только когда в ящике ровно такое сочетание (по указанию пользователя: число
  // планок и брусьев может не совпадать - тогда вызывающий код берёт
  // генерируемый чертёж diagramKryshkaGen).
  if(plankCount <= 2){
    return diagramKryshka2Beams(widthMm, lengthMm, t30, t32, t41, t40, edgeDistKryshkaMm, crossBeamQty, crossBeamWidthMm, plankGapMm, plankEdgeGapVal, beamEdgeMm, beamGapMm);
  }
  return diagramKryshkaDefault(widthMm, lengthMm, t30, t32, t41, t40, edgeDistKryshkaMm, crossBeamQty, crossBeamWidthMm, plankGapMm, plankEdgeGapVal, beamEdgeMm, beamGapMm);
}

// --- Крышка: реальное число планок (l19) и поперечных брусьев (l21) ---
// Вид - как на фото крышки (косоугольная проекция): длина крышки идёт вправо-
// вверх (eu), ширина - влево-вверх (ev); планки лежат сверху поперёк крышки,
// поперечные брусья - снизу и видны торцами за передней и задней кромками.
// Положение планок/брусьев вдоль длины - в реальных пропорциях; сама длина
// крышки на чертеже - в пределах 1.4..4 её ширины (иначе очень длинная
// крышка превратилась бы в тонкую полосу).
function diagramKryshkaGen(widthMm, lengthMm, t30, t32, t41, t40, edgeDistKryshkaMm, crossBeamQty, crossBeamWidthMm, plankCount, plankGapMm, plankEdgeGapVal, beamEdgeMm, beamGapMm){
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
  // крышка: передняя и левая грани толщины + верх
  polys.push([pt(0,0), pt(Lu,0), pt(Lu,0,thick), pt(0,0,thick)]);
  polys.push([pt(0,0), pt(0,Wv), pt(0,Wv,thick), pt(0,0,thick)]);
  polys.push(quad(0, Lu, 0, Wv));
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
  const shapes = polys.map(p=>`<polygon points="${p.map(([x,y])=>i3f(x+ox)+','+i3f(y+oy)).join(' ')}"/>`).join('');
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
  const dOff = rowNear + 30*pxU;
  const d1 = off(D, nfront, dOff), d2 = off(C, nfront, dOff);
  records.push({type:'line', x1:D[0], y1:D[1], x2:off(D,nfront,dOff+40)[0], y2:off(D,nfront,dOff+40)[1]});
  records.push({type:'line', x1:C[0], y1:C[1], x2:off(C,nfront,dOff+40)[0], y2:off(C,nfront,dOff+40)[1]});
  records.push({type:'double', x1:d1[0], y1:d1[1], x2:d2[0], y2:d2[1], lx:(d1[0]+d2[0])/2, ly:(d1[1]+d2[1])/2, text: valLen+' мм'});
  // ширина - вдоль правой кромки, снаружи
  const Cr = P2(Lu,0), w1 = off(Cr, nright, 200), w2 = off(Bk, nright, 200);
  records.push({type:'line', x1:Cr[0], y1:Cr[1], x2:off(Cr,nright,240)[0], y2:off(Cr,nright,240)[1]});
  records.push({type:'line', x1:Bk[0], y1:Bk[1], x2:off(Bk,nright,240)[0], y2:off(Bk,nright,240)[1]});
  records.push({type:'double', x1:w1[0], y1:w1[1], x2:w2[0], y2:w2[1], lx:(w1[0]+w2[0])/2, ly:(w1[1]+w2[1])/2, text: valWidth+' мм'});
  // Размеры по концам планок за задней кромкой: выносные линии - от дальних
  // углов концов планок (и от угла крышки), размер - на 170 за кромкой.
  const backDim = (uA, uB, fromA, fromB, text) => {
    const a = off(P2(uA, Wv), nback, 170), b = off(P2(uB, Wv), nback, 170);
    const ea = off(P2(uA, Wv), nback, 200), eb = off(P2(uB, Wv), nback, 200);
    records.push({type:'line', x1:fromA[0], y1:fromA[1], x2:ea[0], y2:ea[1]});
    records.push({type:'line', x1:fromB[0], y1:fromB[1], x2:eb[0], y2:eb[1]});
    const lab = off([(a[0]+b[0])/2, (a[1]+b[1])/2], nback, 26*pxU); // подпись - за стрелкой
    records.push({type:'double', x1:a[0], y1:a[1], x2:b[0], y2:b[1], lx:lab[0], ly:lab[1], text});
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
    const lab = off(b1, nleft, 42*pxU), lineEnd = off(b1, nleft, 12*pxU);
    records.push({type:'line', x1:b1[0], y1:b1[1], x2:lineEnd[0], y2:lineEnd[1]});
    records.push({type:'double', x1:b1[0], y1:b1[1], x2:b2[0], y2:b2[1], lx:lab[0], ly:lab[1], text: valEdgePlanka+' мм'});
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
    const lab = off(ea, nleft, 42*pxU), lineEnd = off(ea, nleft, 12*pxU);
    records.push({type:'line', x1:ea[0], y1:ea[1], x2:lineEnd[0], y2:lineEnd[1]});
    records.push({type:'double', x1:ea[0], y1:ea[1], x2:eb[0], y2:eb[1], lx:lab[0], ly:lab[1], text: dimLabel(beamEdgeMm)+' мм'});
    if(B > 1){
      const gi = Math.floor((B-1)/2), ua = beamU(gi) + bw, ub = beamU(gi+1);
      const [ga, gb] = beamDim(ua, ub, P2(ua, vB), P2(ub, vB), rowNear);
      // подпись - справа на продолжении стрелки; стрелка идёт вверх-вправо, поэтому
      // подпись опущена на столько же, чтобы не наезжать на концы планок
      const gl = off(off(gb, nright, 42*pxU), nfront, 14*pxU), gEnd = off(gb, nright, 12*pxU);
      records.push({type:'line', x1:gb[0], y1:gb[1], x2:gEnd[0], y2:gEnd[1]});
      records.push({type:'double', x1:ga[0], y1:ga[1], x2:gb[0], y2:gb[1], lx:gl[0], ly:gl[1], text: dimLabel(beamGapMm)+' мм'});
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

// Чертёж крышки для результата расчёта.
function diagramKryshkaFor(calc){
  const hasPhoto = (calc.l19 === 2 && calc.l21 === 2) || (calc.l19 === 3 && calc.l21 === 3);
  return (hasPhoto ? diagramKryshka : diagramKryshkaGen)(calc.W, calc.L, calc.t30, calc.t32, calc.t41, calc.t40Display, calc.edgeDistKryshka, calc.l21, calc.w21, calc.l19, calc.bokSectionW, calc.plankGap, calc.beamEdgeDist, calc.beamGap);
}
