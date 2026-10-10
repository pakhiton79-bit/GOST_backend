// ГОСТ 2991-85, тип I: описание типа для общих скриптов страницы
// (js/g2991/*.js - опции, вывод, печать, расчёт) и чертежи узлов - плоские схемы, как у II-1 (функция
// diagramG2991Panel - js/g2991/panels.js): узел - белый
// прямоугольник, стыки досок - тонкими линиями (у щитов - снизу вверх, в
// порядке строк таблицы), подписи - длина и высота (у дна и крышки -
// ширина). Планок у торца нет. «Без крышки» - 2 доски у краёв.
// Общий вид ящика (плитка «Итог» и печать) - рисунок пользователя,
// увеличенный в 3 раза.
const BOX_G2991_I_IMG = "/images/box_g2991_i.png";

function diagramsG2991I(calc){
  const d = calc.drawing;
  return {
    dno: diagramG2991Panel('Дно - схема', d.dnoL, d.dnoW, 'h', null, 0, 0, g2991RowsLayout(calc.dno)),
    kryshka: calc.noLid
      ? diagramG2991Panel('Вместо крышки - схема', d.dnoL, d.dnoW, 'edges', null)
      : diagramG2991Panel('Крышка - схема', d.dnoL, d.dnoW, 'h', null, 0, 0, g2991RowsLayout(calc.kryshka)),
    torec: diagramG2991Panel('Щит торцевой - схема', d.torecW, d.H, 'h', null, 0, 0, g2991RowsLayout(calc.torec)),
    bokovoy: diagramG2991Panel('Щит боковой - схема', d.bokL, d.H, 'h', null, 0, 0, g2991RowsLayout(calc.bokovoy)),
  };
}

// Описание типа: ключ (localStorage - gost2991-i-...), заголовок и
// подзаголовок печати, галочки опций, общий вид, чертежи, адрес расчёта.
const G2991_TYPE = {
  key: 'i',
  title: 'тип I',
  subtitle: 'Ящик дощатый неразборный плотный, торцовые стенки без планок',
  checkboxes: ['concentrated', 'packet', 'noLid'],
  boxImg: BOX_G2991_I_IMG,
  diagrams: diagramsG2991I,
  api: '/api/g2991i/calculate',
};
