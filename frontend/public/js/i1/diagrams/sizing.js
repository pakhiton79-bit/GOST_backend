// ГОСТ 10198-91, тип I-1: размеры чертежей на экране.
//
// Каждый чертёж получает максимальный размер, при котором помещается в свой
// слот: картинка не шире I1_MAX_W и не выше I1_MAX_H. Размер задаётся через
// высоту рамки щита на экране (framePx) - по ней считается ширина картинки.

// Общий вид ящика (плитка «Итог» и печать).
const BOX_I1_IMG_B64 = "/images/box_i1.jpg";

const I1_FRAME_PX = 84;         // высота рамки, если framePx не передан
const I1_MAX_W = 290;           // ширина картинки: слот 340px минус вылет подписей
const I1_MAX_H = 240;           // высота картинки
const I1_TOREC_OVERFLOW = 1.16; // стрелка и подпись высоты торца - на 16% правее фото

// Высота рамки торца на фото (по концам стрелки вертикального размера) и
// размер самого фото - с раскосиной и без.
const TOREC_I1_PHOTO = {
  withRaskosina: {IW:1352, IH:1158, frameH:1107},
  noRaskosina:   {IW:1354, IH:1134, frameH:1103},
};

// Ширина картинки на экране для фото шириной IW с рамкой высотой frameH.
function i1DiagramWidth(IW, frameH, framePx){
  return Math.round((framePx || I1_FRAME_PX) * IW / frameH);
}

// Наибольшая высота рамки, при которой картинка IW×IH помещается в maxW×I1_MAX_H.
function i1FrameFit(IW, IH, frameH, maxW){
  return Math.min(maxW * frameH / IW, I1_MAX_H * frameH / IH);
}

// Высота рамки для чертежа бока, крышки или дна (см. panelGeomDims в panel.js).
// generated - тип I-2 (щиты всегда сгенерированные, см. panelGeom).
function i1PanelFramePx(plankQty, hasRaskosina, generated){
  const g = panelGeomDims(plankQty, hasRaskosina, generated);
  return Math.floor(i1FrameFit(g.IW, g.IH, g.botY - g.topY, I1_MAX_W));
}

// Высота рамки для чертежа торца.
function i1TorecFramePx(hasRaskosina){
  const p = hasRaskosina ? TOREC_I1_PHOTO.withRaskosina : TOREC_I1_PHOTO.noRaskosina;
  return Math.floor(i1FrameFit(p.IW, p.IH, p.frameH, I1_MAX_W / I1_TOREC_OVERFLOW));
}

// Толщина линий и стрелок - как у обычного чертежа шириной
// DIAGRAM_DEFAULT_WIDTH, какой бы ширины ни вышла картинка.
function i1StrokeScale(IW, widthPx){
  return photoStrokeScale(IW) * DIAGRAM_DEFAULT_WIDTH / widthPx;
}

// Тип I-2, размер «промежуток между досками» (щиты и торец): выносные
// линии от кромок досок (y1, y2) в точке x0 влево до dimX, к ним снаружи -
// стрелки длиной arrow; подпись - левее размера (pad - зазор; ширина подписи
// оценивается по числу знаков, в тех же единицах, что arrow).
function boardGapRecords(x0, dimX, y1, y2, arrow, pad, gapVal){
  const text = fmtMm(gapVal) + ' мм';
  const halfW = (text.length * 4.2 + 8) * arrow / 24;
  return [
    {type:'line', x1:x0, y1, x2:dimX - pad, y2:y1},
    {type:'line', x1:x0, y1:y2, x2:dimX - pad, y2},
    {type:'single', x1:dimX, y1:y1 - arrow, x2:dimX, y2:y1},
    {type:'single', x1:dimX, y1:y2 + arrow, x2:dimX, y2},
    {type:'line', x1:dimX, y1, x2:dimX, y2},
    {type:'label', lx:dimX - pad - halfW, ly:(y1 + y2) / 2, text},
  ];
}

// Подпись размера на чертеже: целые мм с округлением вверх (зазор и отступ
// бывают дробными).
function fmtMm(v){
  return String(dimLabel(v));
}
