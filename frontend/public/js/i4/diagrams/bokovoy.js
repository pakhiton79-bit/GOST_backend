// ГОСТ 10198-91, тип I-4: чертёж «Щит боковой» - всегда генерируемый (SVG,
// функции generated.js), т.к. на фото бокового щита I-3 обшивка сплошная:
// доски с промежутками (boards.js), поверх - вертикальные планки по поясам
// крышки и раскосины.

// --- Щит боковой: P планок (P-1 секций), 1 или 2 этажа ---
// I-4: boardGap - промежуток обшивки ({ qty, gap, share }) или null - доски
// вплотную (см. boards.js).
function diagramBokovoyGen(boardLenVal, overhangVal, edgeDistVal, heightPlusFloorVal, plankCount, floors, xMode, upperSpanVal, midPlankWidthVal, sectionWmm, lidBoardTVal, hasBraces, plankGapVal, boardGap){
  const P = Math.max(2, Math.round(plankCount)), F = floors === 2 ? 2 : 1;
  const PH = floors === 2 ? 1300 : 800, pw = 100, stub = 100, hp = 100; // средняя планка - той же ширины
  const ovh = 80;                                   // напуск планок ниже щита (на полоз)
  const innerH = F === 2 ? (PH - hp)/2 : PH;
  const realInH = F === 2 ? (heightPlusFloorVal - (midPlankWidthVal||100))/2 : heightPlusFloorVal;
  // Ширина секции - по реальной пропорции, но весь чертёж не длиннее ~4
  // (2 этажа - ~2.4) своих высот: иначе у очень длинного щита (10+ м) чертёж
  // превращается в тонкую полосу, а подписи наезжают друг на друга.
  const maxIW = (F === 2 ? 2.4 : 4) * (45 + PH + 80);
  // И не уже, чем фото бокового щита с 2 планками (1 этаж - 874×733, 2 этажа -
  // 966×1361): по замечанию пользователя, при 2 планках (особенно на 2 этажах)
  // чертёж выходил узким и высоким и занимал много места по вертикали.
  const minIW = (F === 2 ? 966/1361 : 874/733) * (45 + PH + 80);
  const sw = Math.max(1.2*pw, (minIW - 2*stub - P*pw) / (P-1),
    Math.min(innerH * i3aspect(sectionWmm - 100, realInH), (maxIW - 2*stub - P*pw) / (P-1)));
  const panelW = 2*stub + P*pw + (P-1)*sw;
  const up = 45;                                    // планки чуть выступают над щитом (как в I-1)
  const IW = Math.round(panelW), IH = up + PH + ovh;
  if(diagramIsTooDense((hasBraces === false ? sw : Math.min(sw, innerH) / 2) - i3stroke(IW, IH), IW)) return diagramTooDense(); // планок так много, что они слились бы
  const px = i => stub + i*(pw + sw);
  // Доски бока - с промежутками.
  const strips = i4BoardStrips(0, PH, boardGap, diagramScreenScale(IW, IH));
  let shapes = `<g transform="translate(0,${up})">` + i4BoardRects(0, IW, strips);
  for(let fl=0; fl<F && hasBraces !== false; fl++){  // hasBraces=false - щит без раскосин
    const top = fl*(innerH + hp), bot = top + innerH;
    const upper = F === 2 && fl === 0;
    for(let i=0; i<P-1; i++){
      const leftHalf = i < Math.ceil((P-1)/2);
      shapes += i3cross(px(i)+pw, px(i+1), top, bot, upper ? !leftHalf : leftHalf, xMode, pw, F === 2 && fl === 1, F === 2 && fl === 0);
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
    // Напуск: на сколько планки выступают ниже щита - выносные линии на уровне
    // низа щита и низа планки справа от щита, между ними - размер, подпись
    // под ним (по замечанию пользователя: раньше сноска уходила влево-вниз).
    {type:'line', x1:IW, y1:PH, x2:IW+150*Math.max(1, k/4), y2:PH},
    {type:'line', x1:lastR, y1:IHp, x2:IW+150*Math.max(1, k/4), y2:IHp},
    {type:'line', x1:IW+100*Math.max(1, k/4), y1:PH, x2:IW+100*Math.max(1, k/4), y2:IHp},
    // стрелка - под углом, от подписи (правее и ниже) в середину отрезка
    {type:'single', x1:IW+100*Math.max(1, k/4) + 10*k, y1:IHp+14*k, x2:IW+100*Math.max(1, k/4), y2:(PH+IHp)/2, lx:IW+100*Math.max(1, k/4) + 10*k, ly:IHp+18*k, text: dimLabel(overhangVal)+' мм'},
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
  // Зазор между кромками соседних поясов (по указанию пользователя, как у
  // типа I-1) - под щитом, между концами планок средней секции.
  if(P > 1){
    const gi = Math.floor((P-1)/2), xa = px(gi) + pw, xb = px(gi+1), yg = IHp + 60;
    records.push(
      {type:'line', x1:xa, y1:IHp+5, x2:xa, y2:yg+25},
      {type:'line', x1:xb, y1:IHp+5, x2:xb, y2:yg+25},
      {type:'double', x1:xa, y1:yg, x2:xb, y2:yg, lx:(xa+xb)/2, ly:yg-6, text: dimLabel(plankGapVal)+' мм'}
    );
  }
  // Промежуток между досками - слева от щита, у первого промежутка (у 2
  // этажей - левее подписей этажей).
  if(boardGap){
    const dimX = F === 2 ? -Math.max(300, 42*k) : -Math.max(70, 10*k);
    records.push(...i4BoardGapRecords(px(0), dimX, strips[0][1], strips[1][0], Math.max(60, 9*k), Math.max(15, 3*k), boardGap.gap, k, -1));
  }
  records.forEach(r=>{ ['y1','y2','ly'].forEach(k=>{ if(typeof r[k]==='number') r[k] += up; }); });
  const title = `Щит боковой (${F} эт., ${P} планок${hasBraces === false ? ', без раскосин' : xMode ? ', X-раскосины' : ''}) - схема расположения деталей`;
  return i3render(title, IW, IH, shapes, records);
}

// Чертёж бокового щита для результата расчёта. I-4: всегда генерируемый -
// на фото I-3 обшивка сплошная.
function diagramBokovoyFor(calc){
  return diagramBokovoyGen(calc.k41, calc.bokOverhang, calc.edgeDistKryshka, calc.HplusT12, calc.l19, calc.bokFloors, calc.xRaskosina, calc.k40, calc.w43, calc.bokSectionW, calc.t20, calc.l42 > 0, calc.plankGap, calc.boardGaps.bokovoy);
}
