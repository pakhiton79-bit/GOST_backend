// ГОСТ 10198-91, тип I-1: общий вид ящика + чертёж "Щит торцевой". Вынесено
// из i1/diagrams.js в отдельный файл (по узлам - см. также bokovoy.js,
// kryshka-dno.js). Щит торцевой полностью совпадает по конструкции с торцом
// типа I-3 (вариант без раскосины и с 1 раскосиной - у типа I-1 их бывает не
// больше одной), поэтому переиспользует готовые чертежи типа I-3
// (diagramPlaceholder/diagramEndPanel1Raskosina/diagramEndPanelNoRaskosina -
// см. common-diagrams.js, должен быть подключён раньше). Ширина торца
// подбирается так же, как у остальных чертежей I-1 - по общей высоте рамки
// щита I1_FRAME_PX (см. i1DiagramWidth в bokovoy.js): высота рамки торца на
// фото - 1107px (с раскосиной, 1352x1158) / 1103px (без раскосины,
// 1354x1134), по концам стрелки вертикального размера.
const BOX_I1_IMG_B64 = "/images/box_i1.jpg";

// X-образные раскосины (галочка xRaskosina): та же картинка, где раскосина
// отражена, а отражение спрятано под исходной доской (исходная целая,
// встречная - из двух кусков). *_x сгенерированы из исходных программно -
// калибровка стрелок та же.
const TOREC_1_X_IMG_B64 = "/images/torec_1_x.png";
function diagramTorec(heightVal, widthVal, hasRaskosinaVal, xRaskosinaVal){
  if(hasRaskosinaVal){
    const w = i1DiagramWidth(1352, 1107);
    return diagramEndPanel1Raskosina(heightVal, widthVal, w, xRaskosinaVal ? TOREC_1_X_IMG_B64 : undefined, i1StrokeScale(1352, w));
  }
  const w = i1DiagramWidth(1354, 1103);
  return diagramEndPanelNoRaskosina(heightVal, widthVal, w, i1StrokeScale(1354, w));
}
