// ГОСТ 10198-91, тип I-2: размеры чертежей на экране.
//
// Каждый чертёж получает максимальный размер, при котором помещается в свой
// слот: картинка не шире I2_MAX_W и не выше I2_MAX_H. Размер задаётся через
// высоту рамки щита на экране (framePx) - по ней считается ширина картинки.

// Общий вид ящика (плитка «Итог» и печать). Своего фото у I-2 пока нет -
// копия общего вида I-1.
const BOX_I2_IMG_B64 = "/images/box_i2.jpg";

const I2_FRAME_PX = 84;         // высота рамки, если framePx не передан
const I2_MAX_W = 290;           // ширина картинки: слот 340px минус вылет подписей
const I2_MAX_H = 240;           // высота картинки
const I2_TOREC_OVERFLOW = 1.16; // стрелка и подпись высоты торца - на 16% правее картинки

// Ширина картинки на экране для картинки шириной IW с рамкой высотой frameH.
function i2DiagramWidth(IW, frameH, framePx){
  return Math.round((framePx || I2_FRAME_PX) * IW / frameH);
}

// Наибольшая высота рамки, при которой картинка IW×IH помещается в maxW×I2_MAX_H.
function i2FrameFit(IW, IH, frameH, maxW){
  return Math.min(maxW * frameH / IW, I2_MAX_H * frameH / IH);
}

// Высота рамки для чертежа бока, крышки или дна - у всех одна: чертёж
// всегда сгенерированный в одних и тех же координатах (PANEL_GEN в
// panel-generated.js).
function i2PanelFramePx(){
  const g = PANEL_GEN;
  return Math.floor(i2FrameFit(g.IW, g.IH, g.botY - g.topY, I2_MAX_W));
}

// Высота рамки для чертежа торца (TOREC_GEN в torec.js).
function i2TorecFramePx(hasRaskosina){
  const p = TOREC_GEN[hasRaskosina ? 1 : 0];
  return Math.floor(i2FrameFit(p.IW, p.IH, p.frameH, I2_MAX_W / I2_TOREC_OVERFLOW));
}

// Толщина линий и стрелок - как у обычного чертежа шириной
// DIAGRAM_DEFAULT_WIDTH, какой бы ширины ни вышла картинка.
function i2StrokeScale(IW, widthPx){
  return photoStrokeScale(IW) * DIAGRAM_DEFAULT_WIDTH / widthPx;
}

// Подпись размера на чертеже: целые мм с округлением вверх (зазор и отступ
// бывают дробными).
function fmtMm(v){
  return String(dimLabel(v));
}
