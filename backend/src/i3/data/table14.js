// ГОСТ 10198-91, Таблица 14: толщина поперечных брусьев крышки для
// нештабелируемых ящиков (тип I-3), по массе груза и наружной ширине.
// Вынесено из tables.js в отдельный файл.
const T14_WIDTHS = [1000, 1500, 2000, 2500, 3200];
const TABLE14 = [
  { maxMass: 1000, t: [32, 32, 32, 40, 40] },
  { maxMass: 3000, t: [32, 32, 40, 50, 50] },
  { maxMass: 5000, t: [32, 40, 50, 60, 75] },
  { maxMass: 8000, t: [40, 50, 60, 75, 75] },
  { maxMass: 12000, t: [40, 60, 75, 75, 100] },
  { maxMass: 20000, t: [50, 75, 75, 100, 100] },
];
function crossBeamThickness(mass, outerWmm) {
  let exceeded = false;
  let row = TABLE14.find(r => mass <= r.maxMass);
  if (!row) { row = TABLE14[TABLE14.length - 1]; exceeded = true; }
  let colIdx = T14_WIDTHS.findIndex(w => outerWmm <= w);
  if (colIdx === -1) { colIdx = T14_WIDTHS.length - 1; exceeded = true; }
  return { value: row.t[colIdx], exceeded };
}

module.exports = { T14_WIDTHS, TABLE14, crossBeamThickness };
