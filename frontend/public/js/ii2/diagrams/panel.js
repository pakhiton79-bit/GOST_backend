// ГОСТ 10198-91, тип II-2: чертежи «Щит торцевой» и «Щит боковой» -
// генерируются (SVG) на любое число стоек в геометрии сгенерированного щита
// II-1 (PANEL_GEN_II1, ii1BraceStrip - js/ii1/diagrams/panel-generated.js):
// за каркасом - стоячие доски обшивки с промежутками (boards.js), каркас
// (брусья, стойки, раскосины) - белый поверх. Стойки, брусья, раскосины и
// доски - одной ширины на экране (drawnMemberWidth в common-diagrams.js);
// наружные кромки каркаса - как у II-1 (подписи на тех же местах). Подписи -
// как у щита II-1 на 4 стойки (TOREC_VARIANTS, postGapRecords -
// js/ii1/diagrams/torec.js), кроме выступа обшивки за каркас: он - по
// расчёту (ii2PanelOverhang; у II-1 там всегда нарисован выступ и подписана
// толщина обшивки или стойки, из-за чего размеры не сходились с наружной
// длиной), плюс размер «промежуток между досками» над щитом.
const II2_PANEL_WIDTH = 260, II2_PANEL_LABEL_SCALE = 0.8;

// Картинка щита: n стоек, floors этажей; boardGap - промежутки досок
// обшивки ({ gap, ... } или null - сплошь); overhang - доски выступают за
// каркас (иначе - вровень с ним). { img, gap, strips, skinTop } или null -
// стоек так много, что они слились бы (заглушка).
function ii2PanelImage(n, floors, xRaskosinaVal, hasRaskosinaVal, boardGap, overhang){
  const G = PANEL_GEN_II1[floors];
  const f = v => v.toFixed(1);
  const k = diagramScreenScale(G.IW, G.IH), mw = drawnMemberWidth(k);
  // Брусья шириной mw: верхний - от верхней кромки, нижний - от нижней,
  // средний (2 этажа) - по своей середине.
  const bars = G.bars.map(([t, b], i) => i === 0 ? [t, t + mw] : i === G.bars.length - 1 ? [b - mw, b] : [(t + b - mw) / 2, (t + b + mw) / 2]);
  let postW = mw;
  let bay = (G.frameR - G.frameL - n*postW)/(n-1);
  if(bay < 1.2*postW){
    postW = (G.frameR - G.frameL)/(n + 1.2*(n-1));
    bay = 1.2*postW;
  }
  if(diagramIsTooDense((hasRaskosinaVal ? bay / 2 : bay) - PANEL_GEN_II1_STROKE, G.IW)) return null;
  const px = i => G.frameL + i*(postW + bay); // левая кромка i-й стойки (с 0)
  const rect = (x1, y1, x2, y2) => `<rect x="${f(x1)}" y="${f(y1)}" width="${f(x2-x1)}" height="${f(y2-y1)}"/>`;
  const [sk1, sy1, sk2, sy2] = G.skin;
  const sx1 = overhang ? sk1 : G.frameL, sx2 = overhang ? sk2 : G.frameR;
  const strips = ii2BoardStrips(sx1, sx2, boardGap, k);
  let frame = '';
  for(let fl=0; fl<floors; fl++){
    const top = bars[fl][1], bot = bars[fl+1][0];
    const upper = floors > 1 && fl === 0; // верхний этаж - зеркально
    for(let i=0; hasRaskosinaVal && i<n-1; i++){
      const l = px(i) + postW, r = px(i+1);
      const rising = (i < Math.ceil((n-1)/2)) !== upper;
      if(xRaskosinaVal) frame += ii1BraceStrip(l, r, top, bot, !rising, postW, f);
      frame += ii1BraceStrip(l, r, top, bot, rising, postW, f);
    }
    for(let i=0; i<n; i++) frame += rect(px(i), top, px(i) + postW, bot);
  }
  bars.forEach(b=>{ frame += rect(G.frameL, b[0], G.frameR, b[1]); });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${G.IW}" height="${G.IH}" viewBox="0 0 ${G.IW} ${G.IH}">`
    + `<rect width="100%" height="100%" fill="#fff"/>`
    + `<g stroke="#000" stroke-width="${PANEL_GEN_II1_STROKE}" stroke-linejoin="miter">${ii2BoardRects(strips, true, sy1, sy2)}`
    + `<g fill="#fff">${frame}</g></g></svg>`;
  return {
    img: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg),
    gap: { x1: px(0) + postW, x2: px(1), secTop: bars[0][1] },
    strips, skinTop: sy1,
  };
}

// Выступ досок обшивки за каркас с каждой стороны, мм - как в расчёте
// (end-panel.js, bokovoy.js; конструктив - как у II-1): доски бока - на
// длину груза + стойку торцевого щита с каждой стороны (выступ - стойка),
// доски торца - по наружной ширине (выступ - обшивка бока).
function ii2PanelOverhang(calc, isBok){
  return isBok ? calc.t_stojka : (calc.outerW - (calc.W + calc.t_stojka * 2)) / 2;
}

// Щит: frame - каркас (calc.torecFrame / bokFrame), widthVal - подпись длины
// каркаса (у бока - длина груза), overhangMm - выступ обшивки за каркас с
// каждой стороны (ii2PanelOverhang), boardGap - промежутки ({ qty, gap,
// share } или null - сплошь).
function ii2PanelDiagram(calc, frame, widthVal, overhangMm, boardGap, alt){
  const floors = frame.floors, v4 = TOREC_VARIANTS[floors][4], G = PANEL_GEN_II1[floors];
  const overhang = overhangMm > 0.5;
  const g = ii2PanelImage(frame.count, floors, calc.xRaskosina, frame.hasRaskosina, boardGap, overhang);
  if(!g) return diagramTooDense();
  const v = { IW: v4.IW, IH: v4.IH, gap: g.gap };
  const widthText = dimLabel(widthVal) + ' мм';
  // Подписи щита II-1 без группы «выступ обшивки слева» (выносные линии у
  // левого края x 0..80 и стрелка к ним); выносная линия длины каркаса слева -
  // своя (у 1-этажного щита II-1 её роль играла линия той группы).
  const records = v4.records(dimLabel(calc.t_longbeam), widthText.slice(0, -3), '', dimLabel(calc.panelHeightFull), dimLabel(100 + frame.len))
    .filter(r => !(r.type === 'single' && r.x2 < 80) && !(r.type === 'line' && Math.min(r.x1, r.x2) >= 0 && Math.max(r.x1, r.x2) <= 80));
  const dimB = records.find(r => r.type === 'double' && r.text === widthText);
  const yB = dimB.y1, xL = G.frameL;
  records.push({type:'line', x1:xL, y1:yB - 180, x2:xL, y2:yB + 25});
  // Выступ обшивки - слева, как у II-1: выносная линия от края досок,
  // перемычка до каркаса, стрелка с подписью (1 этаж - сверху слева, 2 этажа -
  // снизу, левее подписей этажей).
  if(overhang){
    const x0 = G.skin[0], yH = floors === 2 ? yB - 33 : yB - 65, text = dimLabel(overhangMm) + ' мм';
    records.push(
      {type:'line', x1:x0, y1:yB - 180, x2:x0, y2:yB + 44},
      {type:'line', x1:x0, y1:yH, x2:xL, y2:yH},
      floors === 2
        ? {type:'single', x1:-97, y1:yB + 74, x2:(x0 + xL) / 2, y2:yH, lx:-100, ly:yB + 245, text}
        : {type:'single', x1:-108, y1:yB - 212, x2:(x0 + xL) / 2, y2:yH, lx:-109, ly:yB - 245, text}
    );
  }
  records.push(...postGapRecords(v, frame.sectionW, II2_PANEL_WIDTH, II2_PANEL_LABEL_SCALE));
  // Промежуток между досками - над щитом, у 40% ширины (левее - размер
  // между стойками, правее - толщина продольного бруса).
  const pick = boardGap && ii2PickGap(g.strips, v.IW * 0.4);
  if(pick){
    const k = v.IW / II2_PANEL_WIDTH;
    records.push(...ii2BoardGapRecords(pick[0], pick[1], g.skinTop, -9 * k, 7 * k, boardGap.gap, k, II2_PANEL_LABEL_SCALE, true));
  }
  return renderDiagram(g.img, alt, v.IW, v.IH, records, II2_PANEL_WIDTH, photoStrokeScale(v.IW), II2_PANEL_LABEL_SCALE);
}

function diagramTorecII2(calc){
  return ii2PanelDiagram(calc, calc.torecFrame, calc.W + calc.t_stojka*2, ii2PanelOverhang(calc, false), calc.boardGaps.torec, 'Щит торцевой - схема расположения деталей');
}
function diagramBokII2(calc){
  return ii2PanelDiagram(calc, calc.bokFrame, calc.L, ii2PanelOverhang(calc, true), calc.boardGaps.bokovoy, 'Щит боковой - схема расположения деталей');
}
