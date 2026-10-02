// ГОСТ 10198-91, тип I-2: чертёж «Щит торцевой». Того же вида, что фото
// торца I-1/I-3 (рамка из планок, раскосина), но нарисованный (SVG) в
// координатах фото, а под рамкой - 3 доски с промежутками (видны в проёме
// рамки, см. boards.js). Размеры щита ставят общие функции торца из
// common-diagrams.js (калибровка фото та же).

// Координаты - центры линий фото: наружный контур щита, ширина планки
// рамки; frameH - высота рамки (по концам стрелки вертикального размера) -
// для подбора размера на экране (i2TorecFramePx в sizing.js).
const TOREC_GEN = {
  1: { IW:1352, IH:1158, frameH:1107, x0:25.5, x1:1328.5, y0:34.5, y1:1134.5, plank:215 }, // с раскосиной (как torec_1.png)
  0: { IW:1354, IH:1134, frameH:1103, x0:34.5, x1:1337.5, y0:19.5, y1:1119.5, plank:215 }, // без раскосины (как torec_0.jpg)
};
const TOREC_GEN_STROKE = 8;
const TOREC_GEN_BOARD_GAP = 0.05; // промежуток между досками - доля высоты щита (на экране - как у щитов)

// Картинка торца и размер промежутка. boardGap - промежуток обшивки торца
// { gap, ... } или null (сплошной, доски вплотную).
function torecGenerated(hasRaskosinaVal, xRaskosinaVal, boardGap){
  const G = TOREC_GEN[hasRaskosinaVal ? 1 : 0];
  const f = v => v.toFixed(1);
  const rect = (x0, y0, x1, y1) => `<rect x="${f(x0)}" y="${f(y0)}" width="${f(x1-x0)}" height="${f(y1-y0)}"/>`;
  const strips = boardStrips(G.y0, G.y1, !!boardGap, TOREC_GEN_BOARD_GAP);
  // Проём рамки: между вертикальными и горизонтальными планками.
  const l = G.x0 + G.plank, r = G.x1 - G.plank, top = G.y0 + G.plank, bot = G.y1 - G.plank;
  // доски - светло-серые (как брусья на чертежах II-1), рамка поверх - белая
  let shapes = strips.map(s => rect(G.x0, s[0], G.x1, s[1]).replace('/>', ' fill="#d9d9d9"/>')).join('');
  shapes += rect(G.x0, G.y0, G.x1, top) + rect(G.x0, bot, G.x1, G.y1) + rect(G.x0, top, l, bot) + rect(r, top, G.x1, bot);
  if(hasRaskosinaVal){
    if(xRaskosinaVal) shapes += braceStrip(l, r, top, bot, true, G.plank, true, true, f);
    shapes += braceStrip(l, r, top, bot, false, G.plank, true, true, f);
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${G.IW}" height="${G.IH}" viewBox="0 0 ${G.IW} ${G.IH}">`
    + `<rect width="100%" height="100%" fill="#fff"/>`
    + `<g fill="#fff" stroke="#000" stroke-width="${TOREC_GEN_STROKE}" stroke-linejoin="miter">${shapes}</g></svg>`;
  // Промежуток - размер слева от щита: выносные линии от кромок досок у
  // первого промежутка (виден в проёме рамки) через левую планку наружу.
  const records = boardGap
    ? boardGapRecords(l, G.x0 - 70, strips[0][1], strips[1][0], 110, 25, boardGap.gap)
    : [];
  return { G, img: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), records };
}

function diagramTorec(heightVal, widthVal, hasRaskosinaVal, xRaskosinaVal, framePx, boardGap){
  const gen = torecGenerated(hasRaskosinaVal, xRaskosinaVal, boardGap);
  const w = i2DiagramWidth(gen.G.IW, gen.G.frameH, framePx);
  const strokeScale = i2StrokeScale(gen.G.IW, w);
  if(hasRaskosinaVal) return diagramEndPanel1Raskosina(heightVal, widthVal, w, gen.img, strokeScale, gen.records);
  return diagramEndPanelNoRaskosina(heightVal, widthVal, w, strokeScale, gen.img, gen.records);
}
