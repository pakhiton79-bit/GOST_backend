// ГОСТ 10198-91, тип I-1: чертежи "Крышка" и "Дно". По указанию
// пользователя переиспользуют то же фото/калибровку (BOK_I1_GEOM) и ту же
// функцию рисования (diagramBokPhoto), что и "Щит боковой" - см. bokovoy.js
// (должен грузиться раньше этого файла - см. порядок <script> в i1.html).
function diagramKryshka(widthVal, plankTVal, edgeVal, boardLenVal, plankQty, hasRaskosinaVal, xRaskosinaVal){
  return diagramBokPhoto(bokGeom(plankQty, hasRaskosinaVal, xRaskosinaVal), widthVal, plankTVal, edgeVal, boardLenVal, 'Крышка');
}
function diagramDno(widthVal, plankTVal, edgeVal, boardLenVal, plankQty, hasRaskosinaVal, xRaskosinaVal){
  return diagramBokPhoto(bokGeom(plankQty, hasRaskosinaVal, xRaskosinaVal), widthVal, plankTVal, edgeVal, boardLenVal, 'Дно');
}
