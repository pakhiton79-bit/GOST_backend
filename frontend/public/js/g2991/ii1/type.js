// ГОСТ 2991-85, тип II-1: описание типа для общих скриптов страницы
// (js/g2991/*.js - опции, вывод, печать, расчёт) и чертежи узлов - плоские схемы (diagramG2991Panel,
// js/g2991/panels.js): дно, крышка (или 2 доски «Без крышки»), торец с
// планками (доски горизонтально или вертикально), бок.
// Общий вид ящика (плитка «Итог» и печать) - присланный рисунок, увеличенный в 3 раза.
const BOX_G2991_II1_IMG = "/images/box_g2991_ii1.png";

// Чертежи узлов II-1 по результату расчёта.
function diagramsG2991II1(calc){
  const d = calc.drawing;
  return {
    dno: diagramG2991Panel('Дно - схема', d.dnoL, d.dnoW, 'h', null, 0, 0, g2991RowsLayout(calc.dno)),
    kryshka: calc.noLid
      ? diagramG2991Panel('Вместо крышки - схема', d.dnoL, d.dnoW, 'edges', null)
      : diagramG2991Panel('Крышка - схема', d.dnoL, d.dnoW, 'h', null, 0, 0, g2991RowsLayout(calc.kryshka)),
    torec: calc.verticalEnd
      ? diagramG2991Panel('Щит торцевой - схема', d.torecW, d.H, 'v', 'h', d.plankW, d.plankGap, g2991RowsLayout(calc.torec))
      : diagramG2991Panel('Щит торцевой - схема', d.torecW, d.H, 'h', 'v', d.plankW, d.plankGap, g2991RowsLayout(calc.torec)),
    bokovoy: diagramG2991Panel('Щит боковой - схема', d.bokL, d.H, 'h', null, 0, 0, g2991RowsLayout(calc.bokovoy)),
  };
}

// Описание типа: ключ (localStorage - gost2991-ii1-...), заголовок и
// подзаголовок печати, галочки опций, общий вид, чертежи, адрес расчёта.
const G2991_TYPE = {
  key: 'ii1',
  title: 'тип II-1',
  subtitle: 'Ящик дощатый неразборный плотный, торцовые стенки на двух планках',
  checkboxes: ['concentrated', 'packet', 'verticalEnd', 'noLid'],
  boxImg: BOX_G2991_II1_IMG,
  diagrams: diagramsG2991II1,
  api: '/api/g2991ii1/calculate',
};
