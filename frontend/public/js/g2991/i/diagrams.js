// ГОСТ 2991-85, тип I: чертежи узлов - плоские схемы, как у II-1 (функция
// diagramG2991Panel - js/g2991/ii1/diagrams/panels.js): узел - белый
// прямоугольник без досок, подписи - длина и высота (у дна и крышки -
// ширина). Планок у торца нет. «Без крышки» - 2 доски у краёв.
// Общий вид ящика (плитка «Итог» и печать) - рисунок пользователя,
// увеличенный в 3 раза.
const BOX_G2991_I_IMG = "/images/box_g2991_i.png";

function diagramsG2991I(calc){
  const d = calc.drawing;
  return {
    dno: diagramG2991Panel('Дно - схема', d.dnoL, d.dnoW, 'h', null),
    kryshka: calc.noLid
      ? diagramG2991Panel('Вместо крышки - схема', d.dnoL, d.dnoW, 'edges', null)
      : diagramG2991Panel('Крышка - схема', d.dnoL, d.dnoW, 'h', null),
    torec: diagramG2991Panel('Щит торцевой - схема', d.torecW, d.H, 'h', null),
    bokovoy: diagramG2991Panel('Щит боковой - схема', d.bokL, d.H, 'h', null),
  };
}
