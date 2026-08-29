// ГОСТ 10198-91, тип I-3: точка входа для табличных данных и формул -
// реэкспортирует всё из ./sections.js (небольшие формулы по отдельным
// пунктам) и ./data/table19.js, ./data/table4.js, ./data/table14.js
// (объёмные таблицы), чтобы compute.js по-прежнему делал один
// require('./tables') и не зависел от того, как именно разложены данные
// внутри - разделение на файлы ниже сделано только ради размера файлов.
const sections = require('./sections');
const table19 = require('./data/table19');
const table4 = require('./data/table4');
const table14 = require('./data/table14');

module.exports = {
  ...sections,
  ...table19,
  ...table4,
  ...table14,
};
