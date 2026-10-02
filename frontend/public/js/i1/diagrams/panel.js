// ГОСТ 10198-91, тип I-1: чертежи «Щит боковой», «Крышка» и «Дно» - один и
// тот же щит с поясами планок (фото на 2-4 планки из panel-photos.js, на 5 и
// более - panel-generated.js) с размерными стрелками.

// Фото или сгенерированный чертёж для числа планок; null - планок так много,
// что они слились бы (вместо чертежа заглушка). boardGap - тип I-2 (щит из
// досок с промежутками, см. panelGenerated): чертёж всегда сгенерированный.
function panelGeom(plankQty, hasRaskosinaVal, xRaskosinaVal, boardGap){
  if(plankQty > 4 || boardGap !== undefined) return panelGenerated(Math.round(plankQty), hasRaskosinaVal, xRaskosinaVal, boardGap);
  return panelPhoto(plankQty, hasRaskosinaVal, xRaskosinaVal);
}

// Только размеры (без построения картинки) - для подбора масштаба.
function panelGeomDims(plankQty, hasRaskosinaVal, generated){
  return (plankQty > 4 || generated) ? PANEL_GEN : PANEL_PHOTOS[panelPhotoKey(plankQty, hasRaskosinaVal)];
}

// Щит с размерами:
//   dimVal     - вертикальный размер (у бока - высота груза, у крышки и дна -
//                ширина);
//   plankTVal  - толщина у выступающего верхнего левого угла первой планки;
//   edgeVal    - отступ от края доски до кромки крайней планки;
//   gapVal     - расстояние между кромками соседних планок;
//   boardLenVal - длина доски;
//   bottomTVal - выступ планок снизу (только боковой щит), подписывается у
//                нижнего правого угла крайней правой планки.
// Отступы подписей заданы в экранных пикселях (px - пикселей фото на 1px
// экрана), чтобы на фото разной ширины они выглядели одинаково.
function diagramPanel(g, dimVal, plankTVal, edgeVal, gapVal, boardLenVal, partTitle, framePx, bottomTVal){
  const IW = g.IW, IH = g.IH, topY = g.topY, botY = g.botY;
  const stubL = g.stubL, p1L = g.p1L, p1R = g.p1R, p2L = g.p2L, stubR = g.stubR;
  const widthPx = i1DiagramWidth(IW, botY - topY, framePx);
  const px = IW / widthPx;

  // Вертикальный размер - справа от щита.
  const dimFarX = stubR + 20*px;
  const dblArrowX = stubR + 11*px;

  // Длина доски - стрелкой над фото, от края до края щита.
  const topLineY = topY - 24*px;

  // Толщина - сноской к выступающему углу первой планки, подпись в ряду
  // длины доски слева. Подпись длины - по центру, но не ближе 80px к ней.
  const thickTargetY = topY*0.67;
  const thickTailX = p1L - 12*px, thickTailY = topLineY;
  const lenLabelX = Math.max((stubL+stubR)/2, thickTailX + 80*px);

  // Под рамкой щита, на одном уровне bracketY: скобка «отступ от края»
  // (stubL..p1L) и стрелка «зазор между планками» (p1R..p2L). Подписи под
  // фото: 1-й ряд - зазор, 2-й ряд - отступ (сноской).
  const bracketYStart = botY - 0.085*IH, bracketYEnd = IH;
  const bracketY = botY + 0.44*(IH-botY);
  const bracketMidX = (stubL+p1L)/2;
  const gapMidX = (p1R+p2L)/2;
  const gapLabelY = IH + 14*px;
  const edgeLabelX = stubL + 34*px, edgeLabelY = IH + 42*px;

  const dim = dimLabel(dimVal);
  const plankT = dimLabel(plankTVal);
  const boardLen = dimLabel(boardLenVal);

  const records = [
    {type:'line', x1:stubR, y1:topY, x2:dimFarX, y2:topY},
    {type:'line', x1:stubR, y1:botY, x2:dimFarX, y2:botY},
    {type:'double', x1:dblArrowX, y1:topY, x2:dblArrowX, y2:botY, lx:dblArrowX+2*px, ly:(topY+botY)/2, text: dim+' мм', vertical:true},

    {type:'single', x1:thickTailX, y1:thickTailY, x2:p1L, y2:thickTargetY, lx:thickTailX, ly:thickTailY, text: plankT+' мм'},

    {type:'line', x1:stubL, y1:topY, x2:stubL, y2:topLineY},
    {type:'line', x1:stubR, y1:topY, x2:stubR, y2:topLineY},
    {type:'double', x1:stubL, y1:topLineY, x2:stubR, y2:topLineY, lx:lenLabelX, ly:topLineY, text: boardLen+' мм'},

    {type:'line', x1:p1R, y1:bracketYStart, x2:p1R, y2:bracketYEnd},
    {type:'line', x1:p2L, y1:bracketYStart, x2:p2L, y2:bracketYEnd},
    {type:'double', x1:p1R, y1:bracketY, x2:p2L, y2:bracketY, lx:gapMidX, ly:gapLabelY, text: fmtMm(gapVal)+' мм'},

    {type:'line', x1:stubL, y1:bracketYStart, x2:stubL, y2:bracketYEnd},
    {type:'line', x1:p1L, y1:bracketYStart, x2:p1L, y2:bracketYEnd},
    {type:'line', x1:stubL, y1:bracketY, x2:p1L, y2:bracketY},
    {type:'single', x1:edgeLabelX, y1:edgeLabelY, x2:bracketMidX, y2:bracketY, lx:edgeLabelX, ly:edgeLabelY, text: fmtMm(edgeVal)+' мм'}
  ];

  // Тип I-2: промежуток между досками - размер слева от щита: выносные
  // линии от кромок досок у первого промежутка, стрелки снаружи упираются
  // в них (промежуток узкий), подпись левее.
  if(g.gap) records.push(...boardGapRecords(stubL, stubL - 22*px, g.gap.y1, g.gap.y2, 24*px, 6*px, g.gap.value));

  if(bottomTVal > 0){
    const lastR = stubR - (p1L - stubL); // правая кромка крайней правой планки
    const botTargetY = botY + 0.2*(IH - botY);
    const botTailX = lastR + 24*px, botTailY = IH + 14*px;
    records.push({type:'single', x1:botTailX, y1:botTailY, x2:lastR, y2:botTargetY, lx:botTailX, ly:botTailY, text: dimLabel(bottomTVal)+' мм'});
  }

  return renderDiagram(g.img, partTitle + ' - схема расположения деталей', IW, IH, records, widthPx, i1StrokeScale(IW, widthPx));
}

// boardGap - только у типа I-2 (см. panelGeom).
function diagramBokovoy(heightVal, plankTVal, edgeVal, gapVal, boardLenVal, plankQty, hasRaskosinaVal, xRaskosinaVal, framePx, bottomTVal, boardGap){
  const g = panelGeom(plankQty, hasRaskosinaVal, xRaskosinaVal, boardGap);
  if(!g) return diagramTooDense();
  return diagramPanel(g, heightVal, plankTVal, edgeVal, gapVal, boardLenVal, 'Щит боковой', framePx, bottomTVal);
}
function diagramKryshka(widthVal, plankTVal, edgeVal, gapVal, boardLenVal, plankQty, hasRaskosinaVal, xRaskosinaVal, framePx, boardGap){
  const g = panelGeom(plankQty, hasRaskosinaVal, xRaskosinaVal, boardGap);
  if(!g) return diagramTooDense();
  return diagramPanel(g, widthVal, plankTVal, edgeVal, gapVal, boardLenVal, 'Крышка', framePx);
}
function diagramDno(widthVal, plankTVal, edgeVal, gapVal, boardLenVal, plankQty, hasRaskosinaVal, xRaskosinaVal, framePx, boardGap){
  const g = panelGeom(plankQty, hasRaskosinaVal, xRaskosinaVal, boardGap);
  if(!g) return diagramTooDense();
  return diagramPanel(g, widthVal, plankTVal, edgeVal, gapVal, boardLenVal, 'Дно', framePx);
}
