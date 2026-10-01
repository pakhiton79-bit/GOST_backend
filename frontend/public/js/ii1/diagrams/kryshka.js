// ГОСТ 10198-91, тип II-1: чертёж «Крышка» - рисуется программно (SVG) на
// любое сочетание продольных/поперечных брусьев, в геометрии и стиле
// присланных фото крышки (сняты с kryshka_0l_3p.jpg и kryshka_4l_4p.jpg,
// сами фото больше не используются): крышка - просто прямоугольник внешней
// границы, без досок (по указанию пользователя), продольные брусья
// светло-серые (крайние - вровень с краями крышки, по длине - с отступом на
// толщину торцевой доски), поперечные - тёмно-серые, короче крышки на
// толщину бокового щита сверху и снизу. Поперечные брусья стоят по расчёту:
// отступ от края и зазоры - edgeDist, ширина - crossBeamW (в масштабе длины
// крышки); не помещаются с зазором - сужаются; если так плотно, что брусья
// слились бы и так, - заглушка.
// Подписи - как на фото того же вида (без продольных - «0×3», с продольными -
// «4×4»), кроме привязанных к первому поперечному брусу (отступ от края и
// толщина бокового щита) - они сдвигаются к его фактическому месту.

const KRYSHKA_GEN = {
  0: { tpl: '0_3', IW: 1201, IH: 761, x0: 7.5, x1: 1190.5, y0: 9.5, y1: 751.5 },
  2: { tpl: '4_4', IW: 1209, IH: 840, x0: 11.5, x1: 1195, y0: 10.5, y1: 828.5 },
};
const KRYSHKA_GEN_BEAM = 74;      // ширина бруса (как на фото)
const KRYSHKA_GEN_INSET = 37.5;   // отступ брусьев от края: торцевая доска / боковой щит
const KRYSHKA_GEN_STROKE = 5.5;

function kryshkaGenerated(longbeamCount, crossBeamCount, lengthVal, edgeDistVal, crossBeamW){
  const G = longbeamCount > 0 ? KRYSHKA_GEN[2] : KRYSHKA_GEN[0];
  const f = v => v.toFixed(1);
  const rect = (x0, y0, x1, y1, fill) => `<rect x="${f(x0)}" y="${f(y0)}" width="${f(x1 - x0)}" height="${f(y1 - y0)}" fill="${fill}"/>`;
  // Поперечные брусья: центры по расчётным отступу и зазорам (в масштабе длины).
  const span = G.x1 - G.x0, pxPerMm = span / lengthVal;
  const bw = crossBeamW > 0 ? crossBeamW : 100;
  const centers = Array.from({length: crossBeamCount}, (_, i) => G.x0 + (edgeDistVal + bw / 2 + i * (bw + edgeDistVal)) * pxPerMm);
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
  return { img: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), IW: G.IW, IH: G.IH, tpl: G.tpl, firstBeamX: centers[0] - beamW / 2, beamW };
}

// Подписи сгенерированной крышки: записи фото-шаблона, у которых подписи
// отступа и толщины бокового щита привязаны к первому поперечному брусу -
// сдвинуты к его месту (xb - левая кромка, w - ширина).
function kryshkaGeneratedRecords(g, torecBoard, sideFrame, width, length, edgeDist){
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
  return [
    {type:'line', x1:49, y1:511, x2:49, y2:830},
    {type:'line', x1:11, y1:332, x2:11, y2:953},
    {type:'line', x1:11, y1:744, x2:49, y2:744},
    {type:'single', x1:31, y1:1002, x2:31, y2:744, lx:31, ly:1003, text:torecBoard+' мм'},
    {type:'line', x1:xb, y1:49, x2:xb + w, y2:49},
    {type:'line', x1:xb, y1:12, x2:xb + w, y2:11},
    {type:'line', x1:xb + 0.65 * w, y1:12, x2:xb + 0.65 * w, y2:49},
    {type:'single', x1:-134, y1:32, x2:xb + 0.65 * w, y2:32, lx:-145, ly:32, text:sideFrame+' мм'},
    {type:'line', x1:1046, y1:12, x2:1343, y2:10},
    {type:'line', x1:1046, y1:829, x2:1352, y2:829},
    {type:'double', x1:1312, y1:10, x2:1313, y2:829, lx:1313, ly:308, text:width+' мм', vertical:true},
    {type:'line', x1:1195, y1:752, x2:1198, y2:930},
    {type:'double', x1:11, y1:911, x2:1198, y2:910, lx:611, ly:912, text:length+' мм'},
    {type:'line', x1:xb, y1:331, x2:xb, y2:509},
    {type:'line', x1:10, y1:372, x2:xb, y2:373},
    {type:'single', x1:-105, y1:517, x2:(10 + xb) / 2, y2:374, lx:-121, ly:534, text:edgeDist+' мм'},
  ];
}

// Ширина поперечного бруса крышки - из таблицы крышки (для расстановки
// брусьев на сгенерированном чертеже).
function crossBeamWidth(kryshkaRows){
  const row = (kryshkaRows || []).find(r => r.name === 'Внутренний поперечный брус');
  const w = row ? parseFloat(row.w) : NaN;
  return w > 0 ? w : 100;
}

// torecBoardVal - толщина доски торца (t32Display, с косметическим +2мм при
// «Оптимизировать размеры» - см. calc-ii1.js); отсутствует на чертеже при
// продольных=0 (как на фото - доска торца там не подписывается вовсе, по
// самой инструкции). sideFrameVal - толщина стойки +
// толщина доски обшивки бока (sideFrameDisplay - та же косметическая +2мм
// надбавка при «Оптимизировать размеры», по аналогии с torecBoardVal).
// widthVal/lengthVal - наружные ширина/длина ящика (outerW/k9Base).
// edgeDistVal - расстояние от края крышки до края крайнего поперечного
// бруса (calc.edgeDistCross) - по методике I-3: брусья делят длину крышки
// на (count+1) равных промежутков, а не flush-edge, как у стоек каркаса.
function diagramKryshka(longbeamCount, crossBeamCount, torecBoardVal, sideFrameVal, widthVal, lengthVal, widthPxOverride, edgeDistVal, crossBeamW){
  const g = kryshkaGenerated(longbeamCount, crossBeamCount, lengthVal, edgeDistVal, crossBeamW);
  if(!g) return diagramTooDense();
  const records = kryshkaGeneratedRecords(g, dimLabel(torecBoardVal), dimLabel(sideFrameVal), dimLabel(widthVal), dimLabel(lengthVal), dimLabel(edgeDistVal));
  return renderDiagram(g.img, 'Крышка - схема расположения деталей', g.IW, g.IH, records, widthPxOverride, photoStrokeScale(g.IW));
}
