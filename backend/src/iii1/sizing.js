// ГОСТ 10198-91, тип III-1: согласование размеров ящика.
//
// Толщина каркаса щитов зависит от наружной высоты ящика (Табл. 12),
// наружная высота - от полоза и доски дна, а полоз (Табл. 19) - от длины
// ящика, которая сама зависит от толщины каркаса торцевого щита. Замкнутый
// круг решается 4 итерациями - за это время значения стабилизируются.
const { subfloorThicknessRaw, polozSection165, floorBoardThicknessNew } = require('../i3/sections');
const { floorBoardThickness } = require('../i3/data/table4');
const { selectSkid19, minSkidsByWidth162 } = require('../i3/data/table19');
const { stojkaSection } = require('./logic');

const BEAM_W = 100;               // ширина стоек, горизонтальных брусьев щитов, брусьев крышки и продольного бруса дна
const CROSS_BEAM_MAX_GAP = 700;   // промежуток между краями поперечных брусьев крышки (и от стенки до крайнего), по указанию пользователя
const CROSS_BEAM_AXIS_MIN = 500, CROSS_BEAM_AXIS_MAX = 800; // настройка расстояния между осями поперечных брусьев крышки (п.1.8.1)
const LONG_BEAM_COUNT = 2;        // продольные брусья крышки
const ITERATIONS = 4;

// Поперечные брусья крышки (n шт. шириной w) по длине крышки len (наружная
// длина ящика): крайние - вровень с концами крышки, остальные - равномерно
// между ними (по указанию пользователя). gap - промежуток между краями
// соседних, axis - расстояние между осями.
function crossBeamLayout(len, w, n) {
  const gap = (len - n * w) / (n - 1);
  return { gap, axis: gap + w };
}

// Число поперечных брусьев крышки: заданное вручную (c.lidCrossBeamCount) -
// целое не меньше 2; по расстоянию между осями (c.lidCrossBeamAxis, 500-800
// мм) - наименьшее, при котором оно не больше заданного; штатно -
// наименьшее (не меньше 2), при котором промежутки между краями брусьев
// ≤ 700 мм.
function crossBeamCounts(c, len) {
  const standard = Math.max(2, Math.ceil((len + CROSS_BEAM_MAX_GAP) / (CROSS_BEAM_MAX_GAP + BEAM_W) - 1e-9));
  if (c.lidCrossBeamCount > 0) return { standard, count: Math.max(2, Math.round(c.lidCrossBeamCount)), axisSet: 0 };
  if (c.lidCrossBeamAxis > 0) {
    const axisSet = Math.min(CROSS_BEAM_AXIS_MAX, Math.max(CROSS_BEAM_AXIS_MIN, c.lidCrossBeamAxis));
    const count = Math.max(2, Math.ceil((len - BEAM_W) / axisSet - 1e-9) + 1);
    return { standard, count, axisSet };
  }
  return { standard, count: standard, axisSet: 0 };
}

// c - контекст расчёта (см. compute.js): входные данные, skinT, ov, round.
function stabilizeSizes(c) {
  const { L, W, H, MASS, ov, round, skinT } = c;
  let frameGost = skinT, stojkaExceeded = false, torFrameT = skinT, bokFrameT = skinT;
  let lidBeamT = 0, dnoBeamT = 0;
  let len = L, outerW = W, skidSpace = W;
  let skid = { t: 0, w: 0, count: 0 }, skidTableInfo = null, polozSimpleExceeded = false;
  let floorBoardT = 0, floorBoardExceeded = false;
  let sub = { t: 0, w: 0, l: 0, qty: 0 };
  let outerH = 0;

  for (let iter = 0; iter < ITERATIONS; iter++) {
    // Каркас снаружи обшивки: длина - по торцевым щитам, ширина - по боковым.
    len = L + (skinT + torFrameT) * 2;
    outerW = W + (skinT + bokFrameT) * 2;
    // Полозья - между продольными брусьями дна; в оптимальном варианте
    // (c.optimized, продольных брусьев нет) - по ширине груза и обшивке
    // боковых щитов.
    skidSpace = c.optimized ? W + skinT * 2 : outerW - BEAM_W * 2;

    // Полозья: при сплошном жёстком основании - п.1.6.5 и число по ширине,
    // иначе - Табл. 19 (как у II-1). Шаг осей полозьев ≤ 1200 мм (п.1.6.2).
    if (c.solidRigidBase) {
      const poloz = polozSection165(MASS);
      polozSimpleExceeded = poloz.exceeded;
      const countDefault = (W > 1100) ? 3 : 2;
      const minNeeded = minSkidsByWidth162(skidSpace, poloz.w);
      skid = { t: round(poloz.h, 'Полоз'), w: poloz.w, count: countDefault < minNeeded ? minNeeded : countDefault };
      skidTableInfo = null;
    } else {
      const sel = selectSkid19(MASS, len, skidSpace, c.availableThicknesses);
      skid = { t: round(sel.h, 'Полоз'), w: sel.w, count: sel.count };
      skidTableInfo = sel;
    }
    skid.t = ov('t9', skid.t, 'Толщина полоза');

    // Подполозная доска (п.1.6.11): при погрузке погрузчиком - не тоньше 50 мм.
    const t10Raw = c.forkliftLoading ? Math.max(subfloorThicknessRaw(MASS), 50) : subfloorThicknessRaw(MASS);
    // Ширина подполозной доски - всегда как у полоза (по указанию
    // пользователя; раньше - не больше 150 мм).
    sub = { t: ov('t10', round(t10Raw), 'Толщина подполозной доски'), w: skid.w, l: len - 400, qty: skid.count };

    // Доска дна: при креплении к доскам дна - Табл. 4, иначе - по массе.
    if (c.fasteningType === 'floor_boards') {
      const distanceMm = skid.count > 1 ? skidSpace / (skid.count - 1) : skidSpace;
      const fb = floorBoardThickness(MASS, L, W, distanceMm);
      floorBoardT = round(fb.value); floorBoardExceeded = fb.exceeded;
    } else {
      floorBoardT = round(floorBoardThicknessNew(MASS));
    }
    floorBoardT = ov('floorBoardT', floorBoardT, 'Толщина доски дна');

    // Над грузом снаружи - брусья крышки и доски крышки (по указанию
    // пользователя толщина бруса крышки входит в наружную высоту; lidBeamT -
    // с прошлой итерации, к концу цикла устанавливается).
    outerH = (c.removeSkidBoards ? 0 : sub.t) + skid.t + floorBoardT + H + lidBeamT + skinT;

    // Каркас щита - стойки и горизонтальные брусья одной толщины по Табл. 12
    // (своя у торцевого и бокового щита). Брусья крышки и продольный брус дна
    // штатно - как горизонтальный брус бокового щита.
    const stj = stojkaSection(MASS, outerH);
    frameGost = round(stj.t);
    stojkaExceeded = stj.exceeded;
    torFrameT = ov('tTorFrame', frameGost, 'Толщина каркаса торцевого щита');
    bokFrameT = ov('tBokFrame', frameGost, 'Толщина каркаса бокового щита');
    // Поле каркаса «Тонкой настройки» брусья крышки и продольный брус дна не
    // меняет - у них свои поля (по указанию пользователя); правка ячейки
    // каркаса бокового щита в таблице - меняет, как раньше.
    const mo = c.manualOverrides || {};
    const bokFrameNoFine = mo.tBokFrame > 0 ? mo.tBokFrame : frameGost;
    lidBeamT = ov('tLidBeam', bokFrameNoFine, 'Толщина брусьев крышки');
    dnoBeamT = ov('tDnoBeam', bokFrameNoFine, 'Толщина продольного бруса дна');
  }

  const cross = crossBeamCounts(c, len);

  return {
    frameGost, stojkaExceeded, torFrameT, bokFrameT, len, outerW, outerH,
    skid, skidTableInfo, polozSimpleExceeded, sub, skidSpace,
    beamW: BEAM_W, lidBeamT, dnoBeamT,
    crossBeamCount: cross.count, standardCrossBeamCount: cross.standard, crossBeamAxisSet: cross.axisSet,
    crossBeamLayout: crossBeamLayout(len, BEAM_W, cross.count),
    crossBeamMaxGap: CROSS_BEAM_MAX_GAP,
    longBeamCount: LONG_BEAM_COUNT,
    floorBoardT, floorBoardExceeded,
  };
}

module.exports = { stabilizeSizes };
