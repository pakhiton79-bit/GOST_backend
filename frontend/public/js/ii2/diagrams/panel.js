// ГОСТ 10198-91, тип II-2: чертежи «Щит торцевой» и «Щит боковой» -
// генерируются (SVG) на любое число стоек в геометрии сгенерированного щита
// II-1 (PANEL_GEN_II1, ii1BraceStrip - js/ii1/diagrams/panel-generated.js):
// за каркасом - стоячие доски обшивки с промежутками (boards.js), каркас
// (брусья, стойки, раскосины) - белый поверх. Стойки, брусья, раскосины и
// доски - одной ширины на экране (drawnMemberWidth в common-diagrams.js);
// наружные кромки каркаса - как у II-1 (подписи на тех же местах). Подписи - как у щита II-1 на 4
// стойки (TOREC_VARIANTS, postGapRecords - js/ii1/diagrams/torec.js), плюс
// размер «промежуток между досками» над щитом.
const II2_PANEL_WIDTH = 260, II2_PANEL_LABEL_SCALE = 0.8;

// Картинка щита: n стоек, floors этажей; boardGap - промежутки досок
// обшивки ({ gap, edge } или null - сплошь). { img, gap, strips } или null -
// стоек так много, что они слились бы (заглушка).
function ii2PanelImage(n, floors, xRaskosinaVal, hasRaskosinaVal, boardGap){
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
  const [sx1, sy1, sx2, sy2] = G.skin;
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

// Щит: frame - каркас (calc.torecFrame / bokFrame), widthVal - подпись
// ширины (у бока - длина груза), skinVal - подпись отступа слева (у торца -
// толщина обшивки, у бока - толщина стойки, как у II-1), boardGap -
// промежутки ({ qty, gap, share, edge - от края до крайней доски } или null -
// сплошь).
function ii2PanelDiagram(calc, frame, widthVal, skinVal, boardGap, alt){
  const floors = frame.floors, v4 = TOREC_VARIANTS[floors][4];
  const g = ii2PanelImage(frame.count, floors, calc.xRaskosina, frame.hasRaskosina, boardGap);
  if(!g) return diagramTooDense();
  const v = { IW: v4.IW, IH: v4.IH, gap: g.gap };
  const records = v4.records(dimLabel(calc.t_longbeam), dimLabel(widthVal), dimLabel(skinVal), dimLabel(calc.panelHeightFull), dimLabel(100 + frame.len))
    .concat(postGapRecords(v, frame.sectionW, II2_PANEL_WIDTH, II2_PANEL_LABEL_SCALE));
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
  return ii2PanelDiagram(calc, calc.torecFrame, calc.W + calc.t_stojka*2, calc.skin.value, calc.boardGaps.torec, 'Щит торцевой - схема расположения деталей');
}
function diagramBokII2(calc){
  return ii2PanelDiagram(calc, calc.bokFrame, calc.L, calc.t_stojka, calc.boardGaps.bokovoy, 'Щит боковой - схема расположения деталей');
}
