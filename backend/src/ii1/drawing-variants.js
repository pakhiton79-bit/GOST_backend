// ГОСТ 10198-91, тип II-1: какие готовые чертежи крышки есть на клиенте -
// только для текста предупреждения «на чертеже ближайший вариант». Сами
// чертежи и такой же выбор - во frontend/public/js/ii1/diagrams/ (независимые
// копии). Щиты торцевой и боковой рисуются на любое число стоек (на 5 и
// более - сгенерированный чертёж), поэтому для них предупреждения нет.

// Крышка: сочетания число продольных × число поперечных брусьев.
const KRYSHKA_LONG_OPTIONS = [0, 2, 3, 4];
const KRYSHKA_CROSS_BY_LONG = { 0: [2, 3, 4], 2: [2, 3], 3: [2, 3, 4], 4: [4] };

const nearest = (options, v) => options.reduce((a, b) => Math.abs(b - v) < Math.abs(a - v) ? b : a);

function nearestKryshkaVariant(longbeamCount, crossBeamCount) {
  const bestLong = nearest(KRYSHKA_LONG_OPTIONS, longbeamCount);
  const bestCross = nearest(KRYSHKA_CROSS_BY_LONG[bestLong], crossBeamCount);
  return { longbeamCount: bestLong, crossBeamCount: bestCross, exact: bestLong === longbeamCount && bestCross === crossBeamCount };
}

module.exports = { nearestKryshkaVariant };
