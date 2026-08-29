// ГОСТ 10198-91, тип I-1: общий вид ящика + чертёж "Щит торцевой". Вынесено
// из i1/diagrams.js в отдельный файл (по узлам - см. также bokovoy.js,
// kryshka-dno.js). Щит торцевой полностью совпадает по конструкции с торцом
// типа I-3 (вариант без раскосины и с 1 раскосиной - у типа I-1 их бывает не
// больше одной), поэтому переиспользует готовые чертежи типа I-3
// (diagramPlaceholder/diagramEndPanel1Raskosina/diagramEndPanelNoRaskosina -
// см. common-diagrams.js, должен быть подключён раньше). Ширина торца своя
// (I1_TOREC_WIDTH) - у остальных чертежей I-1 (Дно/Крышка/Бок) фото широкие
// и "приземистые", а у торца - почти квадратное, и при том же 210px (как у
// типа I-3) оно на их фоне выглядело непропорционально крупным.
const BOX_I1_IMG_B64 = "/images/box_i1.jpg";

const I1_TOREC_WIDTH = 150;
function diagramTorec(heightVal, widthVal, hasRaskosinaVal){
  return hasRaskosinaVal
    ? diagramEndPanel1Raskosina(heightVal, widthVal, I1_TOREC_WIDTH)
    : diagramEndPanelNoRaskosina(heightVal, widthVal, I1_TOREC_WIDTH);
}
