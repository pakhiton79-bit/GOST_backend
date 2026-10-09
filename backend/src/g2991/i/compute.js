// ГОСТ 2991-85, тип I (плотный, торцовые стенки цельные, без планок; груз до
// 35 кг): расчёт ящика. ЗАГОТОВКА: пока только толщины досок по ГОСТ;
// детали (длины, количество), объём, масса и норма времени - по таблице
// пользователя, когда она будет.
//
// Решения пользователя:
//   - ввод - как в ГОСТ 10198-91: размеры груза (= внутренние размеры ящика)
//     и масса;
//   - толщины - строго по таблице 2, без поправок п. 1.9-1.15 (порода,
//     пакетные перевозки, сосредоточенная нагрузка, пояса);
//   - расчётный размер: для боковых стенок - внутренняя высота, для дна и
//     крышки - внутренняя ширина (п. 1.9);
//   - масса больше 35 кг - считается по строке 35 кг с предупреждением;
//   - длина больше 1200 мм - по строке 1200;
//   - торец - 1,5 толщины боковой стенки, округление вверх по ряду
//     9/13/16/19/22/25 (п. 1.14);
//   - галочка «Без крышки» (п. 1.2): вместо крышки 2 доски толщиной как у
//     дна и шириной 40-60 мм у верхних кромок стенок.
const { findNegativeField, inputLimitsError } = require('../../helpers');
const { table2Thickness, g2991RoundUp } = require('../table2');

const TYPE_I_MAX_MASS = 35; // таблица 1

function computeGost2991I(input) {
  const { L, W, H, MASS } = input;
  if (![L, W, H, MASS].every(v => v > 0)) return { error: 'Заполните все поля размеров и массы положительными числами.' };
  const limitErr = inputLimitsError(input);
  if (limitErr) return { error: limitErr };

  const bok = table2Thickness(MASS, L, H, TYPE_I_MAX_MASS);
  const dno = table2Thickness(MASS, L, W, TYPE_I_MAX_MASS);
  const torecT = g2991RoundUp(bok.thickness * 1.5);
  const noLid = !!input.noLid;

  const basis = r => `табл. 2: масса до ${r.rowMass} кг, длина до ${r.rowLength} мм, размер до ${r.colSize} мм`;
  const thicknessRows = [
    { name: 'Доски боковых стенок', t: bok.thickness, basis: `${basis(bok)} (по высоте)` },
    { name: 'Доски дна', t: dno.thickness, basis: `${basis(dno)} (по ширине)` },
    noLid
      ? { name: 'Доски вместо крышки (2 шт., ширина 40-60 мм)', t: dno.thickness, basis: 'п. 1.2: толщина как у досок дна' }
      : { name: 'Доски крышки', t: dno.thickness, basis: `${basis(dno)} (по ширине)` },
    { name: 'Доски торцовых стенок', t: torecT, basis: `п. 1.14: 1,5 × ${bok.thickness} мм с округлением вверх` },
  ];

  const warnings = [];
  if (MASS > TYPE_I_MAX_MASS) warnings.push(`Тип I - для грузов до ${TYPE_I_MAX_MASS} кг (таблица 1 ГОСТ 2991-85). Толщины взяты по строке ${TYPE_I_MAX_MASS} кг.`);
  if (L > 1200) warnings.push('Длина больше 1200 мм: для масс до 35 кг в таблице 2 нет строки «св. 1200», толщины взяты по строке 1200 мм.');

  const result = {
    innerL: L, innerW: W, innerH: H, mass: MASS, noLid,
    thickness: { bok: bok.thickness, dno: dno.thickness, kryshka: dno.thickness, torec: torecT },
    thicknessRows,
    warnings,
  };
  const negField = findNegativeField(result);
  if (negField) return { error: 'При таких размерах и массе груза получаются недопустимые размеры деталей - рассчитать ящик нельзя.' };
  return result;
}

module.exports = { computeGost2991I };
