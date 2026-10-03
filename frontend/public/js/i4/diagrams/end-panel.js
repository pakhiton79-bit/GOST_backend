// ГОСТ 10198-91, тип I-4: чертёж «Щит торцевой» - всегда генерируемый (SVG,
// функции generated.js), т.к. на фото торца I-3 обшивка сплошная: рамка из
// планок и раскосины поверх досок с промежутками (boards.js). Планки,
// раскосины и доски - одной ширины на экране (drawnMemberWidth в
// common-diagrams.js).

// --- Щит торцевой: N секций, 1 или 2 этажа ---
// Wmm - длина горизонтальной планки (ширина груза), Htot - высота рамы (H+t12),
// floorSpan - (2 этажа) вертикальная планка этажа + ширина гор. планки.
// I-4: hasBraces = false - щит без раскосин; boardGap - промежуток обшивки
// ({ qty, gap, share }) или null - доски вплотную (см. boards.js).
function diagramEndPanelGen(Wmm, Htot, sections, floors, xMode, floorSpanVal, hasBraces, boardGap){
  const N = Math.max(1, Math.round(sections)), F = floors === 2 ? 2 : 1;
  const IH = F === 2 ? 1200 : 800;
  const realSecW = (Wmm - 100*(N+1)) / N, realInH = F === 2 ? (Htot - 300)/2 : Htot - 200;
  // Гор. и верт. планки - шириной детали на экране: масштаб чертежа зависит
  // от его ширины, а она - от ширины планок; нескольких проходов хватает.
  let hp = 90, vw = 90, innerH, sw, IW;
  for(let it=0; it<5; it++){
    innerH = (IH - hp*(F+1)) / F;
    sw = innerH * i3aspect(realSecW, realInH);
    IW = Math.round((N+1)*vw + N*sw);
    if(it < 4) hp = vw = drawnMemberWidth(diagramScreenScale(IW, IH));
  }
  if(diagramIsTooDense(Math.min(sw, innerH) / 2 - i3stroke(IW, IH), IW)) return diagramTooDense(); // секций так много, что планки слились бы
  const vx = i => i*(vw + sw);                      // левый край i-й вертикальной планки
  // Обшивка - доски с промежутками под рамкой.
  const strips = i4BoardStrips(0, IH, boardGap, diagramScreenScale(IW, IH));
  let shapes = i4BoardRects(0, IW, strips);
  for(let fl=0; fl<F && hasBraces !== false; fl++){
    const top = hp + fl*(innerH + hp), bot = top + innerH;
    const upper = F === 2 && fl === 0;              // верхний этаж - зеркально нижнему
    for(let i=0; i<N; i++){
      const leftHalf = i < Math.ceil(N/2);
      shapes += i3cross(vx(i)+vw, vx(i+1), top, bot, upper ? !leftHalf : leftHalf, xMode, vw, true, true);
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
  // Промежуток между досками - слева от щита, у первого промежутка ниже
  // верхней планки (под планкой его не видно).
  const gi = strips.findIndex((st, i) => i + 1 < strips.length && st[1] >= hp);
  if(boardGap && gi >= 0){
    const k = Math.max(IW / 260, IH / 240); // единиц картинки на 1px экрана (узкий высокий чертёж - мельче 260px)
    records.push(...i4BoardGapRecords(vw, -Math.max(70, 10*k), strips[gi][1], strips[gi+1][0], Math.max(60, 9*k), Math.max(15, 3*k), boardGap.gap, k, -1));
  }
  const title = `Щит торцевой (${F} эт., ${N} секц.${hasBraces === false ? ', без раскосин' : xMode ? ', X-раскосины' : ''}) - схема расположения деталей`;
  return i3render(title, IW, IH, shapes, records);
}

// Чертёж торцевого щита для результата расчёта.
// I-4: чертёж торца всегда генерируемый - на фото I-3 обшивка сплошная.
function diagramEndPanelFor(calc){
  return diagramEndPanelGen(calc.W, calc.HplusT12, Math.max(1, calc.torecSections), calc.torecFloors,
    calc.xRaskosina && calc.torecHasRaskosina, calc.k30plusW31, calc.torecHasRaskosina, calc.boardGaps.torec);
}
