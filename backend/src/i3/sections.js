// ГОСТ 10198-91, тип I-3: небольшие формулы/таблицы по отдельным пунктам
// (не привязанные к объёмным табличным данным - те вынесены в ./data/).
// Вынесено из tables.js в отдельный файл.

// п.1.6.11: толщина подполозной доски в зависимости от массы груза.
function subfloorThicknessRaw(mass) {
  if (mass <= 1000) return 25;
  if (mass <= 5000) return 32;
  if (mass <= 10000) return 40;
  return 50;
}

// п.1.6.15: толщина досок, планок и раскосов боковых, торцовых стенок и
// крышки ящиков типов I-3, I-4 в зависимости от массы груза.
function wallThickness(mass) {
  if (mass <= 1000) return { value: 19, exceeded: false };
  if (mass <= 3000) return { value: 22, exceeded: false };
  return { value: 22, exceeded: true };
}

// п.1.6.5: высота и ширина полозьев для грузов со сплошным жёстким
// основанием при строплении за полозья в пределах основания груза.
function polozSection165(mass) {
  const table = [
    { max: 800, h: 44, w: 100 },
    { max: 1000, h: 50, w: 100 },
    { max: 3000, h: 75, w: 125 },
    { max: 5000, h: 100, w: 100 },
    { max: 10000, h: 125, w: 150 },
    { max: 20000, h: 150, w: 175 },
  ];
  let row = table.find(r => mass <= r.max);
  let exceeded = false;
  if (!row) { row = table[table.length - 1]; exceeded = true; }
  return { h: row.h, w: row.w, exceeded };
}

// п.1.6.8: толщина и ширина торцовых брусьев дна по массе груза.
function endBeamSection(mass) {
  if (mass <= 1000) return { h: 44, w: 100, exceeded: false };
  if (mass <= 2000) return { h: 60, w: 100, exceeded: false };
  if (mass <= 3500) return { h: 75, w: 100, exceeded: false };
  if (mass <= 5000) return { h: 100, w: 100, exceeded: false };
  return { h: 125, w: 125, exceeded: true };
}

// Толщина доски дна по массе груза (крепление за полозья, "новое правило").
function floorBoardThicknessNew(mass) {
  return mass <= 1000 ? 16 : 19;
}

module.exports = {
  subfloorThicknessRaw, wallThickness, polozSection165,
  endBeamSection, floorBoardThicknessNew,
};
