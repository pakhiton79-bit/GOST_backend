// ГОСТ 10198-91, тип I-1: чертёж "Щит боковой". Вынесено из i1/diagrams.js
// в отдельный файл (по узлам - см. также torec.js, kryshka-dno.js).
const BOK_I1_2_IMG_B64  = "/images/bok_i1_2planks.jpg"; // натуральный размер 1178x876 (2 планки, без раскосины)
const BOK_I1_3_IMG_B64  = "/images/bok_i1_3planks.jpg"; // натуральный размер 1807x884 (3 планки, без раскосины)
const BOK_I1_4_IMG_B64  = "/images/bok_i1_4planks.jpg"; // натуральный размер 2208x834 (4 планки, без раскосины)
const BOK_I1_2R_IMG_B64 = "/images/bok_i1_2planks_1raskosina.jpg"; // натуральный размер 1141x891 (2 планки, 1 раскосина)
const BOK_I1_3R_IMG_B64 = "/images/bok_i1_3planks_2raskosina.jpg"; // натуральный размер 1812x909 (3 планки, 2 раскосины)
const BOK_I1_4R_IMG_B64 = "/images/bok_i1_4planks_3raskosina.jpg"; // натуральный размер 2212x790 (4 планки, 3 раскосины)
// X-образные раскосины (галочка xRaskosina) - те же картинки с отражённой
// раскосиной, спрятанной под исходной; калибровка та же (сгенерированы из
// исходных программно).
const BOK_I1_X_IMG = {
  '1_2': "/images/bok_i1_2planks_1raskosina_x.jpg",
  '1_3': "/images/bok_i1_3planks_2raskosina_x.jpg",
  '1_4': "/images/bok_i1_4planks_3raskosina_x.jpg",
};

// Калибровка по разметке, присланной пользователем для bok_i1_2planks.jpg
// (records с линиями/стрелками для варианта "2 планки, без раскосины") -
// перенесена на остальные 5 фото по аналогии (те же 4 группы стрелок:
// вертикальный размер, толщина у выступающего угла, отступ от края до
// крайней планки, длина доски), координаты которых у каждого фото свои:
// IW/IH - натуральный размер фото; stubL/stubR - центр крайней (не
// выступающей) вертикальной линии по краям щита; p1L - центр левого края
// первой планки; topY/botY - y верхней/нижней линии рамки щита.
//
// p1R/p2L - центр правого края первой планки и левого края второй планки
// (найдены по пиксельным данным самих фото - анализ построчного скана
// тёмных пикселей) - нужны для скобки "расстояние между соседними
// планками" (по запросу пользователя, см. diagramBokPhoto ниже).
//
// Эти же 6 фото и эта же калибровка переиспользуются для Крышки и Дна (по
// указанию пользователя, см. kryshka-dno.js) - у всех трёх деталей
// (Бок/Крышка/Дно) общая раскладка поясов планок (единый plankCount,
// единый edgeDist), поэтому отдельных фото под крышку/дно больше не нужно.
const BOK_I1_GEOM = {
  '0_2': {img: BOK_I1_2_IMG_B64,  IW:1178, IH:876, stubL:71.5, p1L:207.5, p1R:341.5, p2L:853.5, stubR:1123.5, topY:68.5, botY:786.5},
  '0_3': {img: BOK_I1_3_IMG_B64,  IW:1807, IH:884, stubL:55.5, p1L:190.5, p1R:324.5, p2L:836.5, stubR:1752.5, topY:73.5, botY:792.5},
  '0_4': {img: BOK_I1_4_IMG_B64,  IW:2208, IH:834, stubL:73.5, p1L:193.5, p1R:312.5, p2L:767.5, stubR:2153.5, topY:90.5, botY:728.5},
  '1_2': {img: BOK_I1_2R_IMG_B64, IW:1141, IH:891, stubL:32.5, p1L:168.5, p1R:302,   p2L:814,   stubR:1084.5, topY:89.5, botY:807.5},
  '1_3': {img: BOK_I1_3R_IMG_B64, IW:1812, IH:909, stubL:66.5, p1L:201.5, p1R:335,   p2L:847,   stubR:1763.5, topY:95.5, botY:814.5},
  '1_4': {img: BOK_I1_4R_IMG_B64, IW:2212, IH:790, stubL:68.5, p1L:188.5, p1R:307,   p2L:762,   stubR:2148.5, topY:69.5, botY:707.5},
};

// Единый масштаб всех чертежей I-1 (по запросу пользователя: раньше ширина
// у всех была одна - 260px (торец - 150px), а высота рамки щита на фото
// разная, поэтому Бок/Крышка/Дно на 2 планки выходили почти вдвое крупнее,
// чем на 4, а торец - то крупнее, то мельче бока). Ширина каждого фото
// подбирается так, чтобы ВЫСОТА РАМКИ щита (topY..botY) на экране была у всех
// чертежей расчёта одинаковой (framePx) - у Бока/Крышки/Дна и у Торца.
// Ширина планок на исходных фото тоже одинаковая (~120-134px при одинаковой
// высоте рамки), поэтому планки/доски на всех чертежах выглядят одного
// размера, а длина щита - пропорционально числу поясов.
//
// framePx - максимально возможная (по уточнению пользователя: чертежи
// должны занимать всё выделенное место, а не быть мелкими) - см.
// i1PageFramePx(): берётся наибольшая высота рамки, при которой КАЖДЫЙ
// чертёж расчёта помещается в слот (I1_MAX_W по ширине картинки,
// I1_MAX_H по высоте). Упирается обычно в самый длинный чертёж (Бок/
// Крышка/Дно) - остальные получаются в том же масштабе.
// Сейчас общий масштаб не используется: каждый чертёж получает свой
// максимальный размер (i1PanelFramePx/i1TorecFramePx ниже, по указанию
// пользователя) и на узком экране сжимается независимо от остальных.
const I1_FRAME_PX = 84;   // запасное значение, если framePx не передан
const I1_MAX_W = 290;     // ширина картинки: слот 340px минус вылет подписей
const I1_MAX_H = 240;     // высота картинки
const I1_TOREC_OVERFLOW = 1.16; // стрелка/подпись высоты торца - на 16% правее фото
function i1DiagramWidth(IW, frameH, framePx){
  return Math.round((framePx || I1_FRAME_PX) * IW / frameH);
}
function i1FrameFit(IW, IH, frameH, maxW){
  return Math.min(maxW * frameH / IW, I1_MAX_H * frameH / IH);
}
// Размеры фото (без картинки) для числа поясов/наличия раскосины - те же
// правила выбора, что и в bokGeom() ниже.
function bokGeomDims(plankQty, hasRaskosinaVal){
  return plankQty > 4 ? BOK_GEN : BOK_I1_GEOM[bokGeomKey(plankQty, hasRaskosinaVal)];
}
function i1PageFramePx(plankQty, bokHasRaskosina, kdHasRaskosina){
  const fits = [bokHasRaskosina, kdHasRaskosina].map(r=>{
    const g = bokGeomDims(plankQty, r);
    return i1FrameFit(g.IW, g.IH, g.botY - g.topY, I1_MAX_W);
  });
  fits.push(bokHasRaskosina
    ? i1FrameFit(1352, 1158, 1107, I1_MAX_W / I1_TOREC_OVERFLOW)
    : i1FrameFit(1354, 1134, 1103, I1_MAX_W / I1_TOREC_OVERFLOW));
  return Math.floor(Math.min(...fits));
}
// По указанию пользователя («каждый чертёж - на всё своё место») общий
// масштаб отменён: высота рамки подбирается для КАЖДОГО чертежа отдельно -
// максимальная, при которой именно он помещается в слот.
function i1PanelFramePx(plankQty, hasRaskosina){
  const g = bokGeomDims(plankQty, hasRaskosina);
  return Math.floor(i1FrameFit(g.IW, g.IH, g.botY - g.topY, I1_MAX_W));
}
function i1TorecFramePx(hasRaskosina){
  return Math.floor(hasRaskosina
    ? i1FrameFit(1352, 1158, 1107, I1_MAX_W / I1_TOREC_OVERFLOW)
    : i1FrameFit(1354, 1134, 1103, I1_MAX_W / I1_TOREC_OVERFLOW));
}
// Толщина линий/стрелок на экране - как у обычного чертежа шириной
// DIAGRAM_DEFAULT_WIDTH, независимо от того, насколько узким/широким вышел
// конкретный чертёж (photoStrokeScale рассчитан на ширину 260px).
function i1StrokeScale(IW, widthPx){
  return photoStrokeScale(IW) * DIAGRAM_DEFAULT_WIDTH / widthPx;
}

// Расстояния на чертеже (между планками, от края) - как и все подписи
// размеров, целые мм с округлением вверх (dimLabel в common-diagrams.js):
// middle/(count-1) и отступ при ручном зазоре бывают дробными.
function fmtMm(v){
  return String(dimLabel(v));
}

// Чертёж по фото бокового щита - общий для Бока/Крышки/Дна (по уточнению
// пользователя): dimVal - вертикальный размер на фото (у Бока - высота
// груза H, у Крышки/Дна - ширина груза с учётом толщин стенок, см. вызовы
// в js/i1/calc-i1.js); plankTVal - толщина у выступающего верхнего левого
// угла первой планки (у каждого щита своя - calc.drawPlankT: планка
// бока/крышки, у дна - полоз либо планка дна); edgeVal - отступ от
// края доски до кромки крайней планки; gapVal - расстояние между КРОМКАМИ
// соседних планок (calc.plankGap = plank.middle/(plankQty-1), ширина самих
// планок уже вычтена); partTitle - заголовок чертежа ("Щит боковой"/
// "Крышка"/"Дно").
//
// Все отступы подписей от рамки заданы в экранных пикселях (px - сколько
// единиц фото приходится на 1px при базовой ширине чертежа), а не в долях
// IW/IH, как раньше: при общем масштабе (см. i1PageFramePx) фото разной
// ширины рисуются с разным коэффициентом, и доли давали бы разные зазоры
// между подписями на разных вариантах.
function diagramBokPhoto(g, dimVal, plankTVal, edgeVal, gapVal, boardLenVal, partTitle, framePx){
  const IW = g.IW, IH = g.IH, topY = g.topY, botY = g.botY;
  const stubL = g.stubL, p1L = g.p1L, p1R = g.p1R, p2L = g.p2L, stubR = g.stubR;
  const widthPx = i1DiagramWidth(IW, botY - topY, framePx);
  const px = IW / widthPx;

  // Стрелка вертикального размера - у правого внешнего края щита (stubR, а
  // не у последней планки - там она уходила бы слишком далеко вправо, через
  // весь правый торцевой обрез щита), с небольшим отступом за кадр.
  const dimFarX = stubR + 20*px;
  const dblArrowX = stubR + 11*px;

  // Стрелка длины доски - над фото, от края до края щита.
  const topLineY = topY - 24*px;

  // Стрелка толщины - указывает на выступающий верхний левый угол первой
  // планки; подпись - в том же ряду, что и стрелка длины доски, слева.
  // Подпись длины доски - по центру щита, но не ближе 80px к подписи
  // толщины (на узких чертежах, напр. 2 планки, по центру они бы
  // наложились друг на друга).
  const thickTargetY = topY*0.67;
  const thickTailX = p1L - 12*px, thickTailY = topLineY;
  const lenLabelX = Math.max((stubL+stubR)/2, thickTailX + 80*px);

  // Нижнее поле под рамкой щита (снимки содержат запас по высоте специально
  // под скобки): на одном уровне bracketY - скобка "отступ от края до
  // крайней планки" (stubL..p1L) и двойная стрелка "расстояние между
  // соседними планками" (p1R..p2L, между кромками 1-го и 2-го пояса).
  // Подписи - под фото в два ряда: 1-й ряд - зазор между планками (прямо под
  // своей стрелкой), 2-й ряд - отступ от края (со сноской к своей скобке).
  // Раньше стрелка зазора стояла сверху, между рамкой и стрелкой длины
  // доски, и её подпись перекрывалась подписями толщины и длины доски - по
  // репорту пользователя.
  const bracketYStart = botY - 0.085*IH, bracketYEnd = IH;
  const bracketY = botY + 0.44*(IH-botY);
  const bracketMidX = (stubL+p1L)/2;
  const gapMidX = (p1R+p2L)/2;
  const gapLabelY = IH + 14*px;
  const edgeLabelX = stubL + 34*px, edgeLabelY = IH + 42*px;

  const dim = dimLabel(dimVal);
  const plankT = dimLabel(plankTVal);
  const boardLen = dimLabel(boardLenVal);

  const records = [
    {type:'line', x1:stubR, y1:topY, x2:dimFarX, y2:topY},
    {type:'line', x1:stubR, y1:botY, x2:dimFarX, y2:botY},
    {type:'double', x1:dblArrowX, y1:topY, x2:dblArrowX, y2:botY, lx:dblArrowX+2*px, ly:(topY+botY)/2, text: dim+' мм', vertical:true},

    {type:'single', x1:thickTailX, y1:thickTailY, x2:p1L, y2:thickTargetY, lx:thickTailX, ly:thickTailY, text: plankT+' мм'},

    {type:'line', x1:stubL, y1:topY, x2:stubL, y2:topLineY},
    {type:'line', x1:stubR, y1:topY, x2:stubR, y2:topLineY},
    {type:'double', x1:stubL, y1:topLineY, x2:stubR, y2:topLineY, lx:lenLabelX, ly:topLineY, text: boardLen+' мм'},

    {type:'line', x1:p1R, y1:bracketYStart, x2:p1R, y2:bracketYEnd},
    {type:'line', x1:p2L, y1:bracketYStart, x2:p2L, y2:bracketYEnd},
    {type:'double', x1:p1R, y1:bracketY, x2:p2L, y2:bracketY, lx:gapMidX, ly:gapLabelY, text: fmtMm(gapVal)+' мм'},

    {type:'line', x1:stubL, y1:bracketYStart, x2:stubL, y2:bracketYEnd},
    {type:'line', x1:p1L, y1:bracketYStart, x2:p1L, y2:bracketYEnd},
    {type:'line', x1:stubL, y1:bracketY, x2:p1L, y2:bracketY},
    {type:'single', x1:edgeLabelX, y1:edgeLabelY, x2:bracketMidX, y2:bracketY, lx:edgeLabelX, ly:edgeLabelY, text: fmtMm(edgeVal)+' мм'}
  ];

  return renderDiagram(g.img, partTitle + ' - схема расположения деталей', IW, IH, records, widthPx, i1StrokeScale(IW, widthPx));
}

// Чертёж для 5 и более поясов планок (по репорту пользователя: при ручной
// настройке числа поясов/расстояния между ними часто выходит больше 4
// поясов, а фото есть только для 2-4 - раньше в этом случае показывался
// чертёж на 4 пояса, т.е. заведомо не тот вариант). Эти фото - простая
// линейная графика (прямоугольники + диагонали), поэтому для N >= 5 чертёж
// строится программно (SVG) в той же системе координат и с той же
// геометрией, что и фото на 4 пояса (bok_i1_4planks.jpg, 2208x834): рамка
// щита, выступ планок на 42px вверх/вниз, отступ крайней планки от края
// щита 120px, ширина планки 119px, линии 6px. Полная ширина - как у фото на
// 4 пояса, поэтому масштаб (высота рамки, см. I1_FRAME_PX) у всех вариантов
// общий; планки/промежутки делят эту ширину (если на планку 119px
// промежутки выходят уже 1.2 ширины планки - пропорционально сужаются и
// планки). Раскосины - как на фото: во всех промежутках "/", в последнем -
// "\"; X-образные - встречная раскосина рисуется ПОД исходной (исходная
// целая, встречная - из кусков), как на *_x фото.
const BOK_GEN = {IW:2208, IH:834, topY:90.5, botY:728.5, stubL:73.5, stubR:2153.5, plankTop:48.5, plankBot:770.5, edge:120, plankW:119, stroke:6};
// Раскосина - полоса шириной PW (как у планок) из угла в угол секции,
// обрезанная по секции. hTop/hBot - есть ли у верхней/нижней кромки секции
// горизонтальная планка (по указанию пользователя): если есть - конец
// раскосины заходит в угол и примыкает и к вертикальной, и к горизонтальной
// планке; если нет (кромка щита) - упирается только в вертикальную планку:
// средняя линия смещена от угла на половину её высоты, и полоса касается
// кромки лишь в самом углу.
function braceStrip(l, r, top, bot, rising, PW, hTop, hBot, fmt){
  const yL = rising ? bot : top, yR = rising ? top : bot;      // углы, куда идёт раскосина
  const hL = rising ? hBot : hTop, hR = rising ? hTop : hBot;  // есть ли там гор. планка
  const inL = rising ? -1 : 1, inR = rising ? 1 : -1;          // направление "внутрь" по y
  let T = PW, x0, y0, x1, y1;
  for(let i=0; i<40; i++){
    x0 = l; y0 = yL + (hL ? 0 : inL*T/2);
    x1 = r; y1 = yR + (hR ? 0 : inR*T/2);
    T = PW * Math.hypot(x1-x0, y1-y0) / (x1-x0);
  }
  const len = Math.hypot(x1-x0, y1-y0), nx = -(y1-y0)/len, ny = (x1-x0)/len;
  let poly = [[l,top],[r,top],[r,bot],[l,bot]];
  [1, -1].forEach(sgn=>{
    const d = p => sgn*(nx*(p[0]-x0) + ny*(p[1]-y0)) - PW/2;
    const out = [];
    for(let i=0; i<poly.length; i++){
      const a = poly[i], b = poly[(i+1)%poly.length], da = d(a), db = d(b);
      if(da <= 1e-9) out.push(a);
      if((da <= 1e-9) !== (db <= 1e-9)){ const t = da/(da-db); out.push([a[0]+t*(b[0]-a[0]), a[1]+t*(b[1]-a[1])]); }
    }
    poly = out;
  });
  return `<polygon points="${poly.map(p=>fmt(p[0])+','+fmt(p[1])).join(' ')}"/>`;
}
function bokGeomGenerated(n, hasRaskosinaVal, xRaskosinaVal){
  const G = BOK_GEN;
  const x0 = G.stubL + G.edge, x1 = G.stubR - G.edge;
  // Сгенерированный чертёж (5+ планок): планки и раскосины уже, чем на фото
  // (по указанию пользователя - на фото-ширине 119 они выглядели слишком
  // широкими при большом числе планок).
  let plankW = 85;
  let bay = (x1 - x0 - n*plankW)/(n-1);
  if(bay < 1.2*plankW){
    plankW = (x1 - x0)/(n + 1.2*(n-1));
    bay = 1.2*plankW;
  }
  const px = i => x0 + i*(plankW + bay); // левый край i-й планки (с 0)
  const f = v => v.toFixed(1);
  // Раскосина - шириной планки; горизонтальных планок у щита нет, поэтому
  // она упирается только в вертикальные планки (см. braceStrip ниже).
  const band = (l, r, rising) => braceStrip(l, r, G.topY, G.botY, rising, plankW, false, false, f);
  let shapes = `<rect x="${f(G.stubL)}" y="${f(G.topY)}" width="${f(G.stubR-G.stubL)}" height="${f(G.botY-G.topY)}"/>`;
  if(hasRaskosinaVal){
    for(let i=0; i<n-1; i++){
      const l = px(i) + plankW, r = px(i+1);
      // Смена направления - посередине (по указанию пользователя): левая
      // половина пролётов «/», правая «\»; при нечётном числе пролётов
      // центральный - как левая половина (/ / / \ \).
      const rising = i < Math.ceil((n-1)/2);
      if(xRaskosinaVal) shapes += band(l, r, !rising);
      shapes += band(l, r, rising);
    }
  }
  for(let i=0; i<n; i++){
    shapes += `<rect x="${f(px(i))}" y="${f(G.plankTop)}" width="${f(plankW)}" height="${f(G.plankBot-G.plankTop)}"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${G.IW}" height="${G.IH}" viewBox="0 0 ${G.IW} ${G.IH}">`
    + `<rect width="100%" height="100%" fill="#fff"/>`
    + `<g fill="#fff" stroke="#000" stroke-width="${G.stroke}" stroke-linejoin="miter">${shapes}</g></svg>`;
  return {
    img: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg),
    IW:G.IW, IH:G.IH, stubL:G.stubL, p1L:px(0), p1R:px(0)+plankW, p2L:px(1), stubR:G.stubR, topY:G.topY, botY:G.botY
  };
}

// Фото есть только для 2-4 планок; для 5 и более - bokGeomGenerated() выше.
function bokGeomKey(plankQty, hasRaskosinaVal){
  let n = plankQty;
  if(n < 2) n = 2;
  if(n > 4) n = 4; // 5+ поясов - bokGeomGenerated(), см. bokGeom() ниже
  return (hasRaskosinaVal ? '1' : '0') + '_' + n;
}

function bokGeom(plankQty, hasRaskosinaVal, xRaskosinaVal){
  if(plankQty > 4) return bokGeomGenerated(Math.round(plankQty), hasRaskosinaVal, xRaskosinaVal);
  const key = bokGeomKey(plankQty, hasRaskosinaVal);
  const g = BOK_I1_GEOM[key];
  return (xRaskosinaVal && BOK_I1_X_IMG[key]) ? Object.assign({}, g, {img: BOK_I1_X_IMG[key]}) : g;
}

function diagramBokovoy(heightVal, plankTVal, edgeVal, gapVal, boardLenVal, plankQty, hasRaskosinaVal, xRaskosinaVal, framePx){
  return diagramBokPhoto(bokGeom(plankQty, hasRaskosinaVal, xRaskosinaVal), heightVal, plankTVal, edgeVal, gapVal, boardLenVal, 'Щит боковой', framePx);
}
