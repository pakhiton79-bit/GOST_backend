// ГОСТ 10198-91, тип I-1: чертёж «Щит торцевой». Конструкция та же, что у
// торца типа I-3 (без раскосины или с одной), поэтому используются его
// готовые чертежи из common-diagrams.js.

// X-образные раскосины: то же фото с встречной раскосиной под исходной.
const TOREC_1_X_IMG_B64 = "/images/torec_1_x.png";

function diagramTorec(heightVal, widthVal, hasRaskosinaVal, xRaskosinaVal, framePx){
  if(hasRaskosinaVal){
    const p = TOREC_I1_PHOTO.withRaskosina;
    const w = i1DiagramWidth(p.IW, p.frameH, framePx);
    return diagramEndPanel1Raskosina(heightVal, widthVal, w, xRaskosinaVal ? TOREC_1_X_IMG_B64 : undefined, i1StrokeScale(p.IW, w));
  }
  const p = TOREC_I1_PHOTO.noRaskosina;
  const w = i1DiagramWidth(p.IW, p.frameH, framePx);
  return diagramEndPanelNoRaskosina(heightVal, widthVal, w, i1StrokeScale(p.IW, w));
}
