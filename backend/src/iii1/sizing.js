// ГОСТ 10198-91, тип III-1: согласование размеров ящика.
//
// Толщина стойки зависит от наружной высоты ящика (Табл. 12), наружная
// высота - от полоза, доски дна и брусьев крышки, а полоз (Табл. 19) - от
// длины ящика, которая сама зависит от толщины каркаса. Замкнутый круг
// решается 4 итерациями - за это время значения стабилизируются.
const { subfloorThicknessRaw, polozSection165, floorBoardThicknessNew } = require('../i3/sections');
const { floorBoardThickness } = require('../i3/data/table4');
const { selectSkid19, minSkidsByWidth162 } = require('../i3/data/table19');
const { stojkaSection, beamSection9, minCountBySpan } = require('./logic');

const CROSS_BEAM_MAX_GAP = 700;   // промежуток между краями поперечных брусьев крышки (и от стенки до крайнего), по указанию пользователя
const CROSS_BEAM_OPT_EDGE = 2;    // «Оптимизировать размеры»: отступ от стенки до крайнего бруса больше на 2 мм
const LONG_BEAM_MAX_AXIS = 800;   // шаг осей продольных брусьев крышки
const ITERATIONS = 4;

// c - контекст расчёта (см. compute.js): входные данные, skinT, ov, round.
function stabilizeSizes(c) {
  const { L, W, H, MASS, ov, round, skinT } = c;
  let stojkaT = skinT, stojkaExceeded = false, frameT = skinT;
  let len = L, outerW = W, skidCalcWidth = W;
  let skid = { t: 0, w: 0, count: 0 }, skidTableInfo = null, polozSimpleExceeded = false;
  let beam9 = { t: 0, w: 100, exceeded: false };
  let wallBeamT = 0, crossBeamT = 0, crossBeamCount = 0, standardCrossBeamCount = 0, crossBeamAxis = 0;
  let longBeamT = 0, longBeamCount = 0;
  let floorBoardT = 0, floorBoardExceeded = false;
  let sub = { t: 0, w: 0, l: 0, qty: 0 };
  let outerH = 0;

  for (let iter = 0; iter < ITERATIONS; iter++) {
    // Каркас стенки - стойки (Табл. 12) и продольные брусья (Табл. 9)
    // встык в одной плоскости: толщина каркаса - большая из двух.
    len = L + (frameT + skinT) * 2;
    outerW = W + (frameT + skinT) * 2;
    skidCalcWidth = W + frameT * 2;

    // Поперечные брусья крышки - равномерно по длине: отступы от стенок
    // равны промежуткам между брусьями, при «Оптимизировать размеры» отступы
    // больше на edgeAdd = 2 мм. Штатно - наименьшее число (не меньше 2), при
    // котором и отступы, и промежутки между краями брусьев ≤ 700 мм; число,
    // заданное вручную (c.lidCrossBeamCount), - целое не меньше 2.
    const beamW = beam9.w;
    const edgeAdd = c.optimizeSizes ? CROSS_BEAM_OPT_EDGE : 0;
    standardCrossBeamCount = Math.max(2, Math.ceil((L - CROSS_BEAM_MAX_GAP + edgeAdd) / (CROSS_BEAM_MAX_GAP + beamW - edgeAdd)));
    crossBeamCount = c.lidCrossBeamCount > 0 ? Math.max(2, Math.round(c.lidCrossBeamCount)) : standardCrossBeamCount;
    // Расстояние между осями поперечных брусьев - колонка Табл. 9. Брусья
    // рамы крышки и продольные брусья стенок - одного сечения (п.1.8.1).
    crossBeamAxis = (L + beamW) / (crossBeamCount + 1);
    beam9 = beamSection9(MASS, crossBeamAxis);
    wallBeamT = ov('tWallBeam', round(beam9.t), 'Толщина продольного бруса стенки');
    crossBeamT = ov('t21', round(beam9.t), 'Толщина поперечного бруса крышки');

    // Полозья: при сплошном жёстком основании - п.1.6.5 и число по ширине,
    // иначе - Табл. 19 (как у II-1).
    if (c.solidRigidBase) {
      const poloz = polozSection165(MASS);
      polozSimpleExceeded = poloz.exceeded;
      const countDefault = (W > 1100) ? 3 : 2;
      const minNeeded = minSkidsByWidth162(skidCalcWidth, poloz.w);
      skid = { t: poloz.h, w: poloz.w, count: countDefault < minNeeded ? minNeeded : countDefault };
      skidTableInfo = null;
    } else {
      const sel = selectSkid19(MASS, len, skidCalcWidth, c.availableThicknesses);
      skid = { t: sel.h, w: sel.w, count: sel.count };
      skidTableInfo = sel;
    }
    skid.tGost = skid.t;
    skid.t = ov('t9', skid.t, 'Толщина полоза', { cell: false });

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

    // Продольные брусья крышки - только при поперечном расположении досок
    // (доски лежат на них, поперечные брусья набиты снизу), сечение - Табл. 9.
    if (c.lidLayout === 'transverse') {
      longBeamCount = minCountBySpan(W, beam9.w, LONG_BEAM_MAX_AXIS);
      longBeamT = ov('tLongbeam', round(beam9.t), 'Толщина продольного бруса крышки');
    } else {
      longBeamT = 0; longBeamCount = 0;
    }

    outerH = (c.removeSkidBoards ? 0 : sub.t) + skid.t + floorBoardT + H + crossBeamT + longBeamT + skinT;

    const stj = stojkaSection(MASS, outerH);
    stojkaT = ov('tStojka', round(stj.t), 'Толщина стойки');
    stojkaExceeded = stj.exceeded;
    frameT = Math.max(stojkaT, wallBeamT);
  }

  return {
    stojkaT, stojkaExceeded, frameT, len, outerW, outerH,
    skid, skidTableInfo, polozSimpleExceeded, sub,
    beamW: beam9.w, beam9Exceeded: beam9.exceeded, crossBeamAxis, wallBeamT,
    crossBeamT, crossBeamCount, standardCrossBeamCount,
    crossBeamMaxGap: CROSS_BEAM_MAX_GAP, crossBeamEdgeAdd: c.optimizeSizes ? CROSS_BEAM_OPT_EDGE : 0,
    longBeamT, longBeamCount,
    floorBoardT, floorBoardExceeded,
  };
}

module.exports = { stabilizeSizes };
