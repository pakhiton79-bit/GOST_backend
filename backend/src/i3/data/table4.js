// ГОСТ 10198-91, Таблица 4 (п.1.6.9): толщина досок дна при креплении груза
// к доскам дна, по удельной нагрузке и расстоянию между осями смежных
// полозьев. Вынесено из tables.js в отдельный файл (используется только
// комплектацией "к доскам дна", variant === 'floor_boards' в compute.js).
const T4_LOADS = [0.10, 0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50];
const T4_DISTANCES = [500, 600, 800, 1000, 1200];
const TABLE4 = [
  [19, 19, 19, 22, 25],
  [19, 19, 22, 32, 32],
  [19, 22, 25, 32, 40],
  [19, 22, 32, 40, 40],
  [19, 22, 32, 40, 50],
  [22, 25, 32, 40, 50],
  [22, 25, 40, 50, 50],
  [22, 32, 40, 50, 50],
];
function floorBoardThickness(mass, Lmm, Wmm, distanceMm) {
  const S_cm2 = (Lmm / 10) * (Wmm / 10);
  const udel = mass / S_cm2;
  let exceeded = false;
  if (udel < 0.10) return { value: 19, udel, exceeded: false };
  let rowIdx = T4_LOADS.findIndex(v => udel <= v);
  if (rowIdx === -1) { rowIdx = T4_LOADS.length - 1; exceeded = true; }
  let colIdx = T4_DISTANCES.findIndex(v => distanceMm <= v);
  if (colIdx === -1) { colIdx = T4_DISTANCES.length - 1; exceeded = true; }
  return { value: TABLE4[rowIdx][colIdx], udel, exceeded };
}

module.exports = { T4_LOADS, T4_DISTANCES, TABLE4, floorBoardThickness };
