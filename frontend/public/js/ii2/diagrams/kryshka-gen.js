// Своя копия js/ii1/diagrams/kryshka.js для типа II-2 - типы не зависят друг от друга
// (правка одного не задевает другие).
// ГОСТ 10198-91, тип II-1: чертёж «Крышка» - рисуется программно (SVG) на
// любое сочетание продольных/поперечных брусьев, в геометрии и стиле
// присланных фото крышки (kryshka_0l_3p.jpg и kryshka_4l_4p.jpg, сами фото
// на сайте не используются): крышка - просто прямоугольник внешней
// границы, без досок (по указанию пользователя), продольные брусья
// светло-серые (крайние - вровень с краями крышки, по длине - с отступом на
// толщину торцевой доски), поперечные - тёмно-серые, короче крышки на
// толщину бокового щита сверху и снизу. Поперечные брусья: промежутки -
// gapDist, ширина - crossBeamW (в масштабе длины крышки), группа - по
// середине крышки (отступы от краёв получаются равными); не помещаются с
// зазором - сужаются; если так плотно, что брусья слились бы и так, - заглушка.
// Подписи - как на фото того же вида (без продольных - «0×3», с продольными -
// «4×4»), кроме привязанных к первому поперечному брусу (отступ от края и
// толщина бокового щита) - они сдвигаются к его фактическому месту. Плюс
// размер «расстояние между краями соседних брусьев» (kryshkaGapRecords).

const KRYSHKA_GEN = {
  0: { tpl: '0_3', IW: 1201, IH: 761, x0: 7.5, x1: 1190.5, y0: 9.5, y1: 751.5 },
  2: { tpl: '4_4', IW: 1209, IH: 840, x0: 11.5, x1: 1195, y0: 10.5, y1: 828.5 },
};
const KRYSHKA_GEN_BEAM = 74;      // ширина бруса (как на фото)
const KRYSHKA_GEN_INSET = 37.5;   // отступ брусьев от края: торцевая доска / боковой щит
const KRYSHKA_GEN_STROKE = 5.5;

function kryshkaGenerated(longbeamCount, crossBeamCount, lengthVal, gapDistVal, crossBeamW){
  const G = longbeamCount > 0 ? KRYSHKA_GEN[2] : KRYSHKA_GEN[0];
  const f = v => v.toFixed(1);
  const rect = (x0, y0, x1, y1, fill) => `<rect x="${f(x0)}" y="${f(y0)}" width="${f(x1 - x0)}" height="${f(y1 - y0)}" fill="${fill}"/>`;
  // Поперечные брусья: шаг - по расчёту (ширина бруса + промежуток gapDist,
  // в масштабе длины крышки), вся группа - по середине крышки (симметрично:
  // отступ в расчёте - от внутренней стенки, а крышка на чертеже - по
  // наружным размерам).
  const span = G.x1 - G.x0, pxPerMm = span / lengthVal;
  const bw = crossBeamW > 0 ? crossBeamW : 100;
  const startMm = (lengthVal - (crossBeamCount * bw + (crossBeamCount - 1) * gapDistVal)) / 2;
  const centers = Array.from({length: crossBeamCount}, (_, i) => G.x0 + (startMm + bw / 2 + i * (bw + gapDistVal)) * pxPerMm);
  const pitch = crossBeamCount > 1 ? centers[1] - centers[0] : span;
  // брусья сужаются, если не помещаются с зазором (не меньше 40% шага)
  const beamW = Math.min(KRYSHKA_GEN_BEAM, 0.6 * pitch, 1.2 * (centers[0] - G.x0));
  if(diagramIsTooDense(pitch - beamW - KRYSHKA_GEN_STROKE, G.IW)) return null;

  let shapes = rect(G.x0, G.y0, G.x1, G.y1, '#fff');
  // продольные брусья
  if(longbeamCount > 0){
    const lx0 = G.x0 + KRYSHKA_GEN_INSET, lx1 = G.x1 - KRYSHKA_GEN_INSET;
    for(let i = 0; i < longbeamCount; i++){
      const y = G.y0 + (G.y1 - G.y0 - KRYSHKA_GEN_BEAM) * i / (longbeamCount - 1);
      shapes += rect(lx0, y, lx1, y + KRYSHKA_GEN_BEAM, '#d9d9d9');
    }
  }
  // поперечные брусья
  const cy0 = G.y0 + KRYSHKA_GEN_INSET + 0.5, cy1 = G.y1 - KRYSHKA_GEN_INSET - 0.5;
  centers.forEach(c => { shapes += rect(c - beamW / 2, cy0, c + beamW / 2, cy1, '#a6a6a6'); });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${G.IW}" height="${G.IH}" viewBox="0 0 ${G.IW} ${G.IH}">`
    + `<rect width="100%" height="100%" fill="#fff"/>`
    + `<g stroke="#000" stroke-width="${KRYSHKA_GEN_STROKE}">${shapes}</g></svg>`;
  return { img: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), IW: G.IW, IH: G.IH, tpl: G.tpl,
    firstBeamX: centers[0] - beamW / 2, secondBeamX: centers[1] - beamW / 2, beamW };
}

// Подписи сгенерированной крышки: записи фото-шаблона, у которых подписи
// отступа и толщины бокового щита привязаны к первому поперечному брусу -
// сдвинуты к его месту (xb - левая кромка, w - ширина).
function kryshkaGeneratedRecords(g, torecBoard, sideFrame, width, length, edgeDist, beamGap, sideEdge){
  const xb = g.firstBeamX, w = g.beamW;
  if(g.tpl === '0_3') return [
    {type:'line', x1:xb + w, y1:716, x2:xb, y2:716},
    {type:'line', x1:xb - 62, y1:752, x2:xb + w + 35, y2:752},
    {type:'line', x1:xb + w / 2, y1:716, x2:xb + w / 2, y2:752},
    {type:'single', x1:-92, y1:737, x2:xb + w / 2, y2:734, lx:-142, ly:737, text:sideFrame+' мм'},
    {type:'line', x1:7, y1:307, x2:8, y2:531},
    {type:'line', x1:xb, y1:307, x2:xb, y2:530},
    {type:'line', x1:8, y1:381, x2:xb, y2:382},
    {type:'single', x1:-141, y1:570, x2:(8 + xb) / 2, y2:382, lx:-140, ly:586, text:edgeDist+' мм'},
    {type:'line', x1:8, y1:84, x2:8, y2:-89},
    {type:'line', x1:1191, y1:-96, x2:1191, y2:84},
    {type:'double', x1:1191, y1:-64, x2:6, y2:-63, lx:600, ly:-81, text:length+' мм'},
    {type:'line', x1:998, y1:10, x2:1317, y2:10},
    {type:'line', x1:1318, y1:751, x2:1000, y2:751},
    {type:'double', x1:1276, y1:10, x2:1276, y2:752},
    {type:'label', lx:1276, ly:344, text:width+' мм', vertical:true},
  ];
  // Доски выступают и по бокам (см. ii2KryshkaImage в kryshka.js; без
  // него pad нет - как было): всё ниже верхнего края
  // досок сдвинуто на p, нижний край досок - на 2p. Подпись выступа досок
  // за торцы поперечных брусьев (sideFrame) - от верхнего края досок до
  // поперечного бруса (он - на p ниже, чем был).
  const p = g.pad || 0;
  // Выступ досок по боку. С продольными брусьями (p > 0) - по указанию
  // пользователя две выноски: край досок - крайний продольный брус
  // (sideEdge - обшивка бока) и продольный брус - поперечный (beamGap -
  // стойка бока); при оптимизации размеров обе +2 мм (по указанию
  // пользователя). Иначе одна - край досок - поперечный брус (sideFrame).
  const yl = 10.5 + p, yc = 49 + p, xa = xb - 40;
  const sideRecords = p > 0 && beamGap !== undefined && sideEdge !== undefined ? [
    {type:'line', x1:xa - 20, y1:12, x2:xa + 20, y2:11},
    {type:'line', x1:xa, y1:12, x2:xa, y2:yl},
    {type:'single', x1:-134, y1:-60, x2:xa, y2:(12 + yl) / 2, lx:-145, ly:-60, text:sideEdge+' мм'},
    {type:'line', x1:xb, y1:yl, x2:xb + w, y2:yl},
    {type:'line', x1:xb, y1:yc, x2:xb + w, y2:yc},
    {type:'line', x1:xb + 0.65 * w, y1:yl, x2:xb + 0.65 * w, y2:yc},
    {type:'single', x1:-134, y1:130, x2:xb + 0.65 * w, y2:(yl + yc) / 2, lx:-145, ly:130, text:beamGap+' мм'},
  ] : [
    {type:'line', x1:xb, y1:yc, x2:xb + w, y2:yc},
    {type:'line', x1:xb, y1:12, x2:xb + w, y2:11},
    {type:'line', x1:xb + 0.65 * w, y1:12, x2:xb + 0.65 * w, y2:yc},
    {type:'single', x1:-134, y1:(12 + yc) / 2, x2:xb + 0.65 * w, y2:(12 + yc) / 2, lx:-145, ly:(12 + yc) / 2, text:sideFrame+' мм'},
  ];
  return [
    {type:'line', x1:49, y1:511 + p, x2:49, y2:830 + p},
    {type:'line', x1:11, y1:332 + p, x2:11, y2:953 + 2 * p},
    {type:'line', x1:11, y1:744 + p, x2:49, y2:744 + p},
    {type:'single', x1:31, y1:1002 + 2 * p, x2:31, y2:744 + p, lx:31, ly:1003 + 2 * p, text:torecBoard+' мм'},
    ...sideRecords,
    {type:'line', x1:1046, y1:12, x2:1343, y2:10},
    {type:'line', x1:1046, y1:829 + 2 * p, x2:1352, y2:829 + 2 * p},
    {type:'double', x1:1312, y1:10, x2:1313, y2:829 + 2 * p, lx:1313, ly:(10 + 829 + 2 * p) / 2, text:width+' мм', vertical:true},
    {type:'line', x1:1195, y1:752 + p, x2:1198, y2:930 + 2 * p},
    {type:'double', x1:11, y1:911 + 2 * p, x2:1198, y2:910 + 2 * p, lx:611, ly:912 + 2 * p, text:length+' мм'},
    {type:'line', x1:xb, y1:331 + p, x2:xb, y2:509 + p},
    {type:'line', x1:10, y1:372 + p, x2:xb, y2:373 + p},
    {type:'single', x1:-105, y1:517 + p, x2:(10 + xb) / 2, y2:374 + p, lx:-121, ly:534 + p, text:edgeDist+' мм'},
  ];
}

// Размер «расстояние между краями 1-го и 2-го поперечных брусьев» - как
// подпись отступа: линия между брусьями у края крышки (без продольных
// брусьев - у нижнего, с ними - у верхнего, под первым продольным) и
// выноска к её середине от подписи за чертежом (снизу / сверху - там, где
// нет других размеров). Подпись между брусьями не помещается никогда (даже
// при 2 брусьях промежуток меньше трети длины крышки), поэтому всегда снаружи.
function kryshkaGapRecords(g, gapDist){
  const x1 = g.firstBeamX + g.beamW, x2 = g.secondBeamX, mid = (x1 + x2) / 2;
  const below = g.tpl === '0_3';
  const y = below ? 690 : 120 + (g.pad || 0); // под первым продольным брусом
  // дальше подписи толщины бокового щита, чтобы не касаться её
  const tail = below ? g.IH + 100 : -100, ly = below ? tail + 16 : tail - 16;
  return [
    {type:'line', x1, y1:y, x2, y2:y},
    {type:'single', x1:mid, y1:tail, x2:mid, y2:y, lx:mid, ly, text:gapDist+' мм'},
  ];
}

// Ширина поперечного бруса крышки - из таблицы крышки (для расстановки
// брусьев на сгенерированном чертеже).
function crossBeamWidth(kryshkaRows){
  const row = (kryshkaRows || []).find(r => r.name === 'Внутренний поперечный брус');
  const w = row ? parseFloat(row.w) : NaN;
  return w > 0 ? w : 100;
}

// torecBoardVal - выступ досок крышки за концы продольных брусьев (толщина
// доски торца, при оптимизации размеров (по умолчанию) +2 мм - calc.lidOverhangLong);
// отсутствует на чертеже при продольных=0 (как на фото - доска торца там не
// подписывается вовсе, по самой инструкции). sideFrameVal - выступ досок за
// торцы поперечных брусьев (толщина стойки + доски обшивки бока, при
// оптимизации размеров (по умолчанию) +2 мм - calc.lidOverhangCross).
// widthVal/lengthVal - наружные ширина/длина ящика (outerW/k9Base).
// edgeDistVal - расстояние от стенки до края крайнего поперечного бруса
// (calc.edgeDistCross), gapDistVal - между краями соседних брусьев
// (calc.gapDistCross): брусья делят длину крышки на (count+1) равных
// промежутков, а не flush-edge, как у стоек каркаса.
function diagramKryshka(longbeamCount, crossBeamCount, torecBoardVal, sideFrameVal, widthVal, lengthVal, widthPxOverride, edgeDistVal, crossBeamW, gapDistVal){
  const g = kryshkaGenerated(longbeamCount, crossBeamCount, lengthVal, gapDistVal, crossBeamW);
  if(!g) return diagramTooDense();
  const records = kryshkaGeneratedRecords(g, dimLabel(torecBoardVal), dimLabel(sideFrameVal), dimLabel(widthVal), dimLabel(lengthVal), dimLabel(edgeDistVal))
    .concat(kryshkaGapRecords(g, dimLabel(gapDistVal)));
  return renderDiagram(g.img, 'Крышка - схема расположения деталей', g.IW, g.IH, records, widthPxOverride, photoStrokeScale(g.IW));
}
