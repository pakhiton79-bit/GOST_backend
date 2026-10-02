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
function i1PanelFramePx(plankQty, hasRaskosina){
  const g = panelGeomDims(plankQty, hasRaskosina);
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

// Подпись размера на чертеже: целые мм с округлением вверх (зазор и отступ
// бывают дробными).
function fmtMm(v){
  return String(dimLabel(v));
}
