// ГОСТ 10198-91, тип III-1: болты (не пиломатериал - в объём не входят).
//   1) Крепление торцовых брусьев дна к полозьям (Табл. 26): диаметр по
//      массе груза и числу полозьев, по одному болту на пересечение бруса и
//      полоза.
//   2) Сборка щитов (прил. 17, п.2.16): диаметр 12 мм (наибольший
//      допустимый), шаг не более 1000 мм, не менее 2 на соединение, не ближе
//      200 мм от концов. Соединения: 4 вертикальных угла стенок (по высоте
//      щита), стенки с дном и крышка со стенками (по периметру ящика).
const { endBeamBoltDiameter } = require('./logic');

const ASSEMBLY_BOLT_D = 12;
const BOLT_MAX_STEP = 1000;
const BOLT_END_DIST = 200;

// Число болтов на соединение длиной len.
function boltsPerJoint(len) {
  return Math.max(2, Math.ceil((len - 2 * BOLT_END_DIST) / BOLT_MAX_STEP - 1e-9) + 1);
}

// s - согласованные размеры (sizing.js), panelH - высота щита.
function boltRows(mass, s, panelH) {
  const endBeamD = endBeamBoltDiameter(mass, s.skid.count);
  const endBeamQty = 2 * s.skid.count;
  const perimeter = 2 * boltsPerJoint(s.len) + 2 * boltsPerJoint(s.outerW);
  const assemblyQty = 4 * boltsPerJoint(panelH) + 2 * perimeter;
  return [
    { name: 'Болт сборки щитов', d: ASSEMBLY_BOLT_D, qty: assemblyQty },
    { name: 'Болт крепления торцовых брусьев дна к полозьям', d: endBeamD, qty: endBeamQty },
  ];
}

module.exports = { boltRows };
