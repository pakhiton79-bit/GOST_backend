// ГОСТ 10198-91, тип II-1: согласование размеров ящика.
//
// Толщина стойки зависит от наружной высоты ящика (табл. стоек), наружная
// высота - от полоза, доски дна и брусьев крышки, а полоз (Табл. 19) - от
// длины ящика, которая сама зависит от толщины стойки. Замкнутый круг
// решается 4 итерациями - за это время значения стабилизируются.
const { subfloorThicknessRaw, polozSection165, floorBoardThicknessNew } = require('../i3/sections');
const { floorBoardThickness } = require('../i3/data/table4');
const { crossBeamThickness } = require('../i3/data/table14');
const { selectSkid19, minSkidsByWidth162 } = require('../i3/data/table19');
const { stojkaSection, minCountBySpan, clearGapBySpan, longBeamSection } = require('./logic');

const CROSS_BEAM_W = 100;         // ширина поперечного бруса крышки (Табл. 14 - всегда 100 мм)
const CROSS_BEAM_MAX_GAP = 700;   // расстояние между краями поперечных брусьев крышки (и от стенки до крайнего)
const LONG_BEAM_MAX_AXIS = 800;   // шаг осей продольных брусьев крышки
const ITERATIONS = 4;

// c - контекст расчёта (см. compute.js): входные данные, skinT, ov, round.
function stabilizeSizes(c) {
  const { L, W, H, MASS, ov, round, skinT } = c;
  let stojkaT = skinT, stojkaExceeded = false;
  let len = L, outerW = W, skidCalcWidth = W;
  let skid = { t: 0, w: 0, count: 0 }, skidTableInfo = null, polozSimpleExceeded = false;
  let crossBeamT = 0, crossBeamExceeded = false, crossBeamCount = 0, standardCrossBeamCount = 0;
  let longBeamT = 0, longBeamW = 100, longBeamCount = 0, longBeamExceeded = false;
  let floorBoardT = 0, floorBoardExceeded = false;
  let sub = { t: 0, w: 0, l: 0, qty: 0 };
  let outerH = 0;

  for (let iter = 0; iter < ITERATIONS; iter++) {
    len = L + (stojkaT + skinT) * 2;
    outerW = W + (stojkaT + skinT) * 2;
    skidCalcWidth = W + stojkaT * 2;

    // Поперечные брусья крышки - равномерно по длине: отступы от стенок
    // равны промежуткам между брусьями («Оптимизировать размеры» их не
    // меняет - по указанию пользователя). Штатно - наименьшее число (не
    // меньше 2), при котором и отступы, и промежутки между краями брусьев
    // ≤ 700 мм: (L - n·100) / (n + 1) ≤ 700  =>  n ≥ (L - 700) / 800.
    // Число, заданное вручную (c.lidCrossBeamCount), - целое не меньше 2,
    // проверки отступа - в compute.js.
    const crossBeamRaw = crossBeamThickness(MASS, outerW);
    crossBeamExceeded = crossBeamRaw.exceeded;
    crossBeamT = ov('t21', round(crossBeamRaw.value), 'Толщина поперечного бруса крышки');
    standardCrossBeamCount = Math.max(2, Math.ceil((L - CROSS_BEAM_MAX_GAP) / (CROSS_BEAM_MAX_GAP + CROSS_BEAM_W)));
    crossBeamCount = c.lidCrossBeamCount > 0 ? Math.max(2, Math.round(c.lidCrossBeamCount)) : standardCrossBeamCount;

    // Полозья: при сплошном жёстком основании - п.1.6.5 и число по ширине,
    // иначе - Табл. 19.
    if (c.solidRigidBase) {
      const poloz = polozSection165(MASS);
      polozSimpleExceeded = poloz.exceeded;
      const countDefault = (W > 1100) ? 3 : 2;
      const minNeeded = minSkidsByWidth162(skidCalcWidth, poloz.w);
      skid = { t: round(poloz.h, 'Полоз'), w: poloz.w, count: countDefault < minNeeded ? minNeeded : countDefault };
      skidTableInfo = null;
    } else {
      const sel = selectSkid19(MASS, len, skidCalcWidth, c.availableThicknesses);
      skid = { t: round(sel.h, 'Полоз'), w: sel.w, count: sel.count };
      skidTableInfo = sel;
    }
    // Ручная толщина полоза (ячейка таблицы или «Тонкая настройка») - в
    // расчёт (высота ящика, объём); ширина - по таблице.
    skid.t = ov('t9', skid.t, 'Толщина полоза');

    // Подполозная доска (п.1.6.11): при погрузке погрузчиком - не тоньше 50 мм.
    const t10Raw = c.forkliftLoading ? Math.max(subfloorThicknessRaw(MASS), 50) : subfloorThicknessRaw(MASS);
    sub = { t: ov('t10', round(t10Raw), 'Толщина подполозной доски'), w: Math.min(skid.w, 150), l: len - 400, qty: skid.count };

    // Доска дна: при креплении к доскам дна - Табл. 4, иначе - по массе.
    if (c.fasteningType === 'floor_boards') {
      const distanceMm = skid.count > 1 ? skidCalcWidth / (skid.count - 1) : skidCalcWidth;
      const fb = floorBoardThickness(MASS, L, W, distanceMm);
      floorBoardT = round(fb.value); floorBoardExceeded = fb.exceeded;
    } else {
      floorBoardT = round(floorBoardThicknessNew(MASS));
    }
    floorBoardT = ov('floorBoardT', floorBoardT, 'Толщина доски дна');

    outerH = (c.removeSkidBoards ? 0 : sub.t) + skid.t + floorBoardT + H + crossBeamT + longBeamT + skinT;

    const stj = stojkaSection(MASS, outerH);
    stojkaT = ov('tStojka', round(stj.t), 'Толщина стойки');
    stojkaExceeded = stj.exceeded;

    // Продольные брусья крышки (доски крышки - всегда поперёк ящика, по
    // указанию пользователя продольное расположение убрано).
    longBeamCount = minCountBySpan(W, 100, LONG_BEAM_MAX_AXIS);
    const longBeamAxis = clearGapBySpan(W, 100, longBeamCount) + 100; // ось-в-ось
    const crossBeamAxis = (L + CROSS_BEAM_W) / (crossBeamCount + 1);
    const lb = longBeamSection(crossBeamAxis, c.roundBoardWidths, longBeamAxis);
    longBeamT = ov('tLongbeam', round(lb.t), 'Толщина продольного бруса крышки');
    longBeamW = lb.w; longBeamExceeded = lb.exceeded;
  }

  return {
    stojkaT, stojkaExceeded, len, outerW, outerH,
    skid, skidTableInfo, polozSimpleExceeded, sub,
    crossBeamT, crossBeamW: CROSS_BEAM_W, crossBeamCount, standardCrossBeamCount, crossBeamExceeded,
    crossBeamMaxGap: CROSS_BEAM_MAX_GAP,
    longBeamT, longBeamW, longBeamCount, longBeamExceeded,
    floorBoardT, floorBoardExceeded,
  };
}

module.exports = { stabilizeSizes };
