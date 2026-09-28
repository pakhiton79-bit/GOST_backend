// ГОСТ 10198-91, тип I-1: фото щита с поясами планок (2-4 планки, с
// раскосинами и без) и их калибровка. Одни и те же фото - для бокового щита,
// крышки и дна: раскладка поясов у них общая.
//
// Калибровка (координаты в пикселях фото):
//   IW, IH       - размер фото;
//   stubL, stubR - левый и правый край щита;
//   p1L, p1R     - левая и правая кромки первой планки;
//   p2L          - левая кромка второй планки;
//   topY, botY   - верхняя и нижняя линии рамки щита.
// Ключ - '<есть раскосины 0|1>_<число планок>'.
const PANEL_PHOTOS = {
  '0_2': {img: "/images/bok_i1_2planks.jpg",             IW:1178, IH:876, stubL:71.5, p1L:207.5, p1R:341.5, p2L:853.5, stubR:1123.5, topY:68.5, botY:786.5},
  '0_3': {img: "/images/bok_i1_3planks.jpg",             IW:1807, IH:884, stubL:55.5, p1L:190.5, p1R:324.5, p2L:836.5, stubR:1752.5, topY:73.5, botY:792.5},
  '0_4': {img: "/images/bok_i1_4planks.jpg",             IW:2208, IH:834, stubL:73.5, p1L:193.5, p1R:312.5, p2L:767.5, stubR:2153.5, topY:90.5, botY:728.5},
  '1_2': {img: "/images/bok_i1_2planks_1raskosina.jpg",  IW:1141, IH:891, stubL:32.5, p1L:168.5, p1R:302,   p2L:814,   stubR:1084.5, topY:89.5, botY:807.5},
  '1_3': {img: "/images/bok_i1_3planks_2raskosina.jpg",  IW:1812, IH:909, stubL:66.5, p1L:201.5, p1R:335,   p2L:847,   stubR:1763.5, topY:95.5, botY:814.5},
  '1_4': {img: "/images/bok_i1_4planks_3raskosina.jpg",  IW:2212, IH:790, stubL:68.5, p1L:188.5, p1R:307,   p2L:762,   stubR:2148.5, topY:69.5, botY:707.5},
};

// X-образные раскосины: те же фото со встречной раскосиной под исходной,
// калибровка та же.
const PANEL_PHOTOS_X = {
  '1_2': "/images/bok_i1_2planks_1raskosina_x.jpg",
  '1_3': "/images/bok_i1_3planks_2raskosina_x.jpg",
  '1_4': "/images/bok_i1_4planks_3raskosina_x.jpg",
};

// Ключ фото для числа планок (меньше 2 - как 2, больше 4 - как 4).
function panelPhotoKey(plankQty, hasRaskosinaVal){
  let n = plankQty;
  if(n < 2) n = 2;
  if(n > 4) n = 4;
  return (hasRaskosinaVal ? '1' : '0') + '_' + n;
}

function panelPhoto(plankQty, hasRaskosinaVal, xRaskosinaVal){
  const key = panelPhotoKey(plankQty, hasRaskosinaVal);
  const g = PANEL_PHOTOS[key];
  return (xRaskosinaVal && PANEL_PHOTOS_X[key]) ? Object.assign({}, g, {img: PANEL_PHOTOS_X[key]}) : g;
}
