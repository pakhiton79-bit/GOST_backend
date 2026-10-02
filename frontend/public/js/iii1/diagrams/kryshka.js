// ГОСТ 10198-91, тип III-1: чертёж «Крышка» - вид снизу, генерируется (SVG)
// в стиле сгенерированной крышки II-1 (js/ii1/diagrams/kryshka.js): форма
// всегда одна, доски крышки - белый прямоугольник без досок (наружная длина
// × ширина груза), продольные брусья (2 шт.) - светло-серые, вровень с
// длинными краями, на всю длину; поперечные - тёмно-серые, между
// продольными впритык (по указанию пользователя), крайние - по концам
// крышки, остальные - равномерно между ними (как в расчёте). Ширина бруса -
// условная; слишком плотно - заглушка.
// Размеры: наружная длина, ширина крышки, промежуток между поперечными
// брусьями.
const KRYSHKA_III1 = { IW: 1200, IH: 820, x0: 10, x1: 1190, y0: 40, y1: 780 };
const KRYSHKA_III1_BEAM = 74;      // ширина бруса на чертеже
const KRYSHKA_III1_STROKE = 5.5;

function diagramKryshkaIII1Generated(crossCount, gapMm, lenVal, widthVal, widthPx, labelScale){
  const G = KRYSHKA_III1, BW = KRYSHKA_III1_BEAM;
  if(!(crossCount >= 2)) return diagramTooDense();
  const f = v => v.toFixed(1);
  const rect = (x0, y0, x1, y1, fill) => `<rect x="${f(x0)}" y="${f(y0)}" width="${f(x1 - x0)}" height="${f(y1 - y0)}" fill="${fill}"/>`;
  // Поперечные брусья: крайние - по концам, промежутки равные; много
  // брусьев - уже (промежуток не меньше 0.6 бруса).
  const span = G.x1 - G.x0;
  const beamW = Math.min(BW, span / (crossCount + 0.6 * (crossCount - 1)));
  const gapPx = (span - crossCount * beamW) / (crossCount - 1);
  if(diagramIsTooDense(gapPx - KRYSHKA_III1_STROKE, G.IW)) return diagramTooDense();
  const bx = i => G.x0 + i * (beamW + gapPx);       // левая кромка i-го бруса

  let shapes = rect(G.x0, G.y0, G.x1, G.y1, '#fff');
  shapes += rect(G.x0, G.y0, G.x1, G.y0 + BW, '#d9d9d9');
  shapes += rect(G.x0, G.y1 - BW, G.x1, G.y1, '#d9d9d9');
  for(let i = 0; i < crossCount; i++) shapes += rect(bx(i), G.y0 + BW, bx(i) + beamW, G.y1 - BW, '#a6a6a6');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${G.IW}" height="${G.IH}" viewBox="0 0 ${G.IW} ${G.IH}">`
    + `<rect width="100%" height="100%" fill="#fff"/>`
    + `<g stroke="#000" stroke-width="${KRYSHKA_III1_STROKE}">${shapes}</g></svg>`;
  const img = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

  const rec = [
    // Наружная длина - сверху.
    {type:'line', x1:G.x0, y1:G.y0, x2:G.x0, y2:-70},
    {type:'line', x1:G.x1, y1:G.y0, x2:G.x1, y2:-70},
    {type:'double', x1:G.x0, y1:-50, x2:G.x1, y2:-50, lx:(G.x0 + G.x1) / 2, ly:-50, text:dimLabel(lenVal)+' мм'},
    // Ширина крышки - справа.
    {type:'line', x1:G.x1, y1:G.y0, x2:G.x1 + 110, y2:G.y0},
    {type:'line', x1:G.x1, y1:G.y1, x2:G.x1 + 110, y2:G.y1},
    {type:'double', x1:G.x1 + 85, y1:G.y0, x2:G.x1 + 85, y2:G.y1, lx:G.x1 + 85, ly:(G.y0 + G.y1) / 2, text:dimLabel(widthVal)+' мм', vertical:true},
  ];
  // Промежуток между 1-м и 2-м поперечными брусьями: внутри, если подпись
  // помещается между наконечниками, иначе - перемычка и выноска снизу.
  const x1 = bx(0) + beamW, x2 = bx(1), mid = (x1 + x2) / 2, y = (G.y0 + G.y1) / 2;
  const text = dimLabel(gapMm)+' мм';
  const k = G.IW / (widthPx || DIAGRAM_DEFAULT_WIDTH), ls = labelScale || 1;
  const labelW = (text.length * 8.2 + 16) * ls * k, headLen = 9 * photoStrokeScale(G.IW);
  if(x2 - x1 >= labelW + 2 * headLen + 6 * k){
    rec.push({type:'double', x1, y1:y, x2, y2:y, lx:mid, ly:y, text});
  } else {
    rec.push({type:'line', x1, y1:y, x2, y2:y});
    rec.push({type:'single', x1:mid, y1:G.IH + 90, x2:mid, y2:y, lx:mid, ly:G.IH + 106, text});
  }
  return renderDiagram(img, 'Крышка - схема расположения деталей (вид снизу)', G.IW, G.IH, rec, widthPx, photoStrokeScale(G.IW), labelScale);
}

function diagramKryshkaIII1(calc, widthPx){
  const row = (calc.kryshka || []).find(r => r.name === 'Поперечный брус крышки');
  const n = row ? Math.round(parseFloat(row.qty)) : calc.crossBeamCount;
  return diagramKryshkaIII1Generated(n, calc.gapDistCross, calc.outerL, calc.W, widthPx, III1_PANEL_LABEL_SCALE);
}
