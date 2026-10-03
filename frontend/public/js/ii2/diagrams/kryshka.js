// ГОСТ 10198-91, тип II-2: чертёж «Крышка» (вид снизу) - как сгенерированная
// крышка II-1 (KRYSHKA_GEN, kryshkaGeneratedRecords, kryshkaGapRecords,
// crossBeamWidth - js/ii1/diagrams/kryshka.js), но с досками: доски крышки с
// промежутками (boards.js) светло-серые, брусья поверх - продольные белые,
// поперечные тёмно-серые; брусья и доски - одной ширины на экране
// (drawnMemberWidth в common-diagrams.js). При поперечном расположении досок доски идут
// поперёк (полосы по длине крышки), при продольном - вдоль. Плюс размер
// «промежуток между досками»: при поперечных - под чертежом, при продольных -
// слева.

function ii2KryshkaImage(calc, crossBeamW){
  const longbeamCount = calc.longbeamCount, crossBeamCount = calc.crossBeamCount;
  const lengthVal = calc.k9Base, gapDistVal = calc.gapDistCross, bg = calc.boardGaps.kryshka;
  const transverse = calc.lidLayout === 'transverse';
  const G = longbeamCount > 0 ? KRYSHKA_GEN[2] : KRYSHKA_GEN[0];
  const f = v => v.toFixed(1);
  const k = diagramScreenScale(G.IW, G.IH), mw = drawnMemberWidth(k);
  const rect = (x0, y0, x1, y1, fill) => `<rect x="${f(x0)}" y="${f(y0)}" width="${f(x1 - x0)}" height="${f(y1 - y0)}" fill="${fill}"/>`;
  // Поперечные брусья - как у II-1.
  const span = G.x1 - G.x0, pxPerMm = span / lengthVal;
  const bw = crossBeamW > 0 ? crossBeamW : 100;
  const startMm = (lengthVal - (crossBeamCount * bw + (crossBeamCount - 1) * gapDistVal)) / 2;
  const centers = Array.from({length: crossBeamCount}, (_, i) => G.x0 + (startMm + bw / 2 + i * (bw + gapDistVal)) * pxPerMm);
  const pitch = crossBeamCount > 1 ? centers[1] - centers[0] : span;
  const beamW = Math.min(mw, 0.6 * pitch, 1.2 * (centers[0] - G.x0));
  if(diagramIsTooDense(pitch - beamW - KRYSHKA_GEN_STROKE, G.IW)) return null;

  // Доски: поперечные - полосы по x, продольные - полосы по y.
  const strips = transverse ? ii2BoardStrips(G.x0, G.x1, bg, k) : ii2BoardStrips(G.y0, G.y1, bg, k);
  let shapes = rect(G.x0, G.y0, G.x1, G.y1, '#fff');
  shapes += transverse ? ii2BoardRects(strips, true, G.y0, G.y1) : ii2BoardRects(strips, false, G.x0, G.x1);
  if(longbeamCount > 0){
    const lx0 = G.x0 + KRYSHKA_GEN_INSET, lx1 = G.x1 - KRYSHKA_GEN_INSET;
    for(let i = 0; i < longbeamCount; i++){
      const y = G.y0 + (G.y1 - G.y0 - mw) * i / (longbeamCount - 1);
      shapes += rect(lx0, y, lx1, y + mw, '#fff');
    }
  }
  const cy0 = G.y0 + KRYSHKA_GEN_INSET + 0.5, cy1 = G.y1 - KRYSHKA_GEN_INSET - 0.5;
  centers.forEach(c => { shapes += rect(c - beamW / 2, cy0, c + beamW / 2, cy1, '#a6a6a6'); });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${G.IW}" height="${G.IH}" viewBox="0 0 ${G.IW} ${G.IH}">`
    + `<rect width="100%" height="100%" fill="#fff"/>`
    + `<g stroke="#000" stroke-width="${KRYSHKA_GEN_STROKE}">${shapes}</g></svg>`;
  return { img: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), IW: G.IW, IH: G.IH, tpl: G.tpl, G,
    firstBeamX: centers[0] - beamW / 2, secondBeamX: centers[1] - beamW / 2, beamW, strips, transverse };
}

function diagramKryshkaII2(calc){
  const g = ii2KryshkaImage(calc, crossBeamWidth(calc.kryshka));
  if(!g) return diagramTooDense();
  const records = kryshkaGeneratedRecords(g, dimLabel(calc.lidOverhangLong), dimLabel(calc.lidOverhangCross), dimLabel(calc.outerW), dimLabel(calc.k9Base), dimLabel(calc.edgeDistCross))
    .concat(kryshkaGapRecords(g, dimLabel(calc.gapDistCross)));
  const bg = calc.boardGaps.kryshka, k = g.IW / DIAGRAM_DEFAULT_WIDTH;
  if(bg){
    if(g.transverse){
      // Под чертежом, ниже размера длины, у 60% длины (левее внизу - подпись
      // толщины торцевой доски).
      const pick = ii2PickGap(g.strips, g.G.x0 + (g.G.x1 - g.G.x0) * 0.6);
      if(pick) records.push(...ii2BoardGapRecords(pick[0], pick[1], g.G.y1, g.IH + 40 * k, 7 * k, bg.gap, k, 1, true));
    } else {
      // Слева, у верхней четверти (ниже - подписи отступа и толщины бокового щита).
      const pick = ii2PickGap(g.strips, g.G.y0 + (g.G.y1 - g.G.y0) * 0.2);
      if(pick) records.push(...ii2BoardGapRecords(pick[0], pick[1], g.G.x0, -9 * k, 7 * k, bg.gap, k, 1, false));
    }
  }
  return renderDiagram(g.img, 'Крышка - схема расположения деталей', g.IW, g.IH, records, undefined, photoStrokeScale(g.IW));
}
