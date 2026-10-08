// ГОСТ 10198-91, тип III-1: чертёж «Дно» - изометрия в стиле фото дна II-1
// (белая заливка, чёрный контур 6px), генерируется (SVG) не в масштабе:
// форма всегда одна (ширина - 0.55 длины, как на фото дна II-1), сечения
// деталей - условные, одной величины u; реальные размеры - в подписях.
// Сборка (по указанию пользователя): снизу подполозные доски (если есть),
// на них полозья; по длинным краям на уровне полозьев - продольные брусья
// дна (прибиты к доскам дна снизу), полозья - равномерно между ними; сверху
// - доски дна одной плоскостью на всю наружную длину и ширину; торцовые
// брусья - на полозьях на уровне досок дна (выступают над ними), длиной по
// ширине груза, с отступом от концов дна (обшивка + каркас торцевого щита).
// Размеры: наружная длина, наружная ширина, отступ торцового бруса (как у
// дна II-1 - выносные линии и стрелка сверху).
const DNO_III1_LEN = 1000;                 // длина дна в условных единицах
const DNO_III1_RATIO = 0.55;               // ширина к длине
const DNO_III1_U = 50;                     // условная величина сечения деталей
const DNO_III1_IW = 2008;                  // ширина картинки (как у фото дна II-1)
const DNO_III1_STROKE = 6;
const DNO_III1_MAX_SKIDS = 10;             // больше - заглушка

// Изометрия: x - вдоль длины (на экране вверх-вправо), y - поперёк (вверх-
// влево), z - вверх. Ближний угол (x=0, y=0) - внизу.
const DNO_III1_C = Math.cos(Math.PI/6), DNO_III1_S = Math.sin(Math.PI/6);
function dnoIII1Proj(x, y, z){
  return [(x - y)*DNO_III1_C, -(x + y)*DNO_III1_S - z];
}

// skidCount - число полозьев, hasSub - есть подполозные доски, lenVal,
// widthVal, insetVal - подписи (наружные длина и ширина, отступ торцового
// бруса), мм; insetRatio - отступ к ширине торцового бруса (для рисунка).
// noLongBeams - без продольных брусьев дна (оптимальный вариант III-1):
// полозья - по всей ширине.
function diagramDnoIII1Generated(skidCount, hasSub, lenVal, widthVal, insetVal, insetRatio, widthPx, labelScale, noLongBeams){
  if(!(skidCount >= 1) || skidCount > DNO_III1_MAX_SKIDS) return diagramTooDense();
  const u = DNO_III1_U;
  const L = DNO_III1_LEN;
  const W = L * DNO_III1_RATIO;
  // Сечения (условные): полоз u×u (при многих полозьях - уже), подполозная
  // доска - 0.9 ширины полоза × 0.35u, продольный брус 0.8u×0.45u (верх -
  // вровень с полозьями), доски дна 0.35u, торцовый брус шириной u, высотой
  // u от верха полозьев.
  const subH = hasSub ? 0.35*u : 0, skidH = u;
  const skidTop = subH + skidH;
  const beamW = noLongBeams ? 0 : 0.8*u, beamH = noLongBeams ? 0 : 0.45*u;
  const slabTop = skidTop + 0.35*u;
  const endW = u, endTop = skidTop + u;
  const inset = u * Math.min(1, Math.max(0.3, insetRatio));
  const endY0 = (W - W*0.92)/2, endY1 = W - endY0; // торцовый брус - по ширине груза (чуть короче дна)

  // Полозья - равномерно между продольными брусьями, крайние - вплотную к ним;
  // много полозьев - уже (промежуток не меньше половины полоза).
  const space = W - 2*beamW;
  const skidW = Math.min(u, space / (skidCount + 0.5*(skidCount - 1)));
  if(skidW < 0.25*u) return diagramTooDense();
  const skidY = [];
  if(skidCount === 1) skidY.push(beamW + (space - skidW)/2);
  else for(let i=0; i<skidCount; i++) skidY.push(beamW + i*(space - skidW)/(skidCount - 1));

  // Коробки: [x0, x1, y0, y1, z0, z1]; рисуем от дальних к ближним.
  const boxes = [];
  const subLen = L*0.84, subX0 = (L - subLen)/2;
  const lower = [];
  skidY.forEach(y=>{
    if(hasSub) lower.push({ b:[subX0, subX0 + subLen, y + 0.05*skidW, y + 0.95*skidW, 0, subH], depth:y, order:0 });
    lower.push({ b:[0, L, y, y + skidW, subH, skidTop], depth:y, order:1 });
  });
  if(!noLongBeams){
    lower.push({ b:[0, L, 0, beamW, skidTop - beamH, skidTop], depth:0, order:1 });
    lower.push({ b:[0, L, W - beamW, W, skidTop - beamH, skidTop], depth:W - beamW, order:1 });
  }
  lower.sort((a, b) => (b.depth - a.depth) || (a.order - b.order));
  lower.forEach(o => boxes.push(o.b));
  boxes.push([0, L, 0, W, skidTop, slabTop]);                       // доски дна
  boxes.push([L - inset - endW, L - inset, endY0, endY1, slabTop, endTop]); // дальний торцовый брус
  boxes.push([inset, inset + endW, endY0, endY1, slabTop, endTop]);         // ближний

  // Масштаб и сдвиг: картинка шириной DNO_III1_IW с полями.
  const pts = [];
  boxes.forEach(b=>{ [b[0], b[1]].forEach(x=>[b[2], b[3]].forEach(y=>[b[4], b[5]].forEach(z=>pts.push(dnoIII1Proj(x, y, z))))); });
  const minX = Math.min(...pts.map(p=>p[0])), maxX = Math.max(...pts.map(p=>p[0]));
  const minY = Math.min(...pts.map(p=>p[1])), maxY = Math.max(...pts.map(p=>p[1]));
  const pad = DNO_III1_STROKE;
  const k = (DNO_III1_IW - 2*pad) / (maxX - minX);
  const IW = DNO_III1_IW, IH = Math.round((maxY - minY)*k + 2*pad);
  const P = (x, y, z) => { const p = dnoIII1Proj(x, y, z); return [pad + (p[0] - minX)*k, pad + (p[1] - minY)*k]; };
  const f = v => v.toFixed(1);
  const poly = ps => `<polygon points="${ps.map(p=>f(p[0])+','+f(p[1])).join(' ')}"/>`;

  // Видимые грани коробки: верх, торец x0 (влево-вниз), бок y0 (вправо-вниз).
  let shapes = '';
  boxes.forEach(([x0, x1, y0, y1, z0, z1])=>{
    shapes += poly([P(x0,y0,z1), P(x1,y0,z1), P(x1,y1,z1), P(x0,y1,z1)]);
    shapes += poly([P(x0,y0,z0), P(x0,y1,z0), P(x0,y1,z1), P(x0,y0,z1)]);
    shapes += poly([P(x0,y0,z0), P(x1,y0,z0), P(x1,y0,z1), P(x0,y0,z1)]);
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${IW}" height="${IH}" viewBox="0 0 ${IW} ${IH}">`
    + `<rect width="100%" height="100%" fill="#fff"/>`
    + `<g fill="#fff" stroke="#000" stroke-width="${DNO_III1_STROKE}" stroke-linejoin="round">${shapes}</g></svg>`;
  const img = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

  // Размеры. d - вынос размерной линии (в условных единицах).
  const d = 1.6*u, zb = skidTop - beamH;
  const rec = [];
  const line = (a, b) => rec.push({type:'line', x1:a[0], y1:a[1], x2:b[0], y2:b[1]});
  const dbl = (a, b, text) => { const m = [(a[0]+b[0])/2, (a[1]+b[1])/2]; rec.push({type:'double', x1:a[0], y1:a[1], x2:b[0], y2:b[1], lx:m[0], ly:m[1], text}); };
  // Наружная длина - вдоль ближнего правого края (y = 0), снизу.
  line(P(0, 0, zb), P(0, -d*1.3, zb)); line(P(L, 0, zb), P(L, -d*1.3, zb));
  dbl(P(0, -d, zb), P(L, -d, zb), dimLabel(lenVal)+' мм');
  // Наружная ширина - вдоль ближнего левого края (x = 0), по низу досок дна.
  line(P(0, 0, skidTop), P(-d*1.3, 0, skidTop)); line(P(0, W, skidTop), P(-d*1.3, W, skidTop));
  dbl(P(-d, 0, skidTop), P(-d, W, skidTop), dimLabel(widthVal)+' мм');
  // Отступ торцового бруса - как у дна II-1: выносные линии от конца дна и
  // от бруса влево (за дальний левый край), между ними перемычка, на неё
  // сверху - стрелка с подписью.
  const yL = W + d*1.1;
  line(P(0, W, slabTop), P(0, yL + 0.3*u, slabTop));
  line(P(inset, endY1, endTop), P(inset, yL + 0.3*u, endTop));
  line(P(inset, yL, slabTop), P(inset, yL, endTop));
  line(P(0, yL, slabTop), P(inset, yL, slabTop));
  const tip = P(inset/2, yL, slabTop), from = P(inset/2, yL, slabTop + 2.6*u);
  rec.push({type:'single', x1:from[0], y1:from[1], x2:tip[0], y2:tip[1]});
  const lab = P(inset/2, yL, slabTop + 3.4*u);
  rec.push({lx:lab[0], ly:lab[1], text:dimLabel(insetVal)+' мм'});

  return renderDiagram(img, 'Дно - схема расположения деталей', IW, IH, rec, widthPx, photoStrokeScale(IW), labelScale);
}

function diagramDnoIII1(calc, widthPx){
  const rows = calc.dno;
  const skidCount = dnoSkidCount(rows);
  const hasSub = rows.some(r => r.name === 'Подполозная доска');
  const endRow = rows.find(r => r.name === 'Торцовый брус дна');
  const inset = calc.skin.value + calc.torFrameT;
  const endW = endRow && parseFloat(endRow.w) > 0 ? parseFloat(endRow.w) : 100;
  const noLongBeams = !rows.some(r => r.name === 'Продольный брус дна');
  return diagramDnoIII1Generated(skidCount, hasSub, calc.outerL, calc.outerW, inset, inset / endW, widthPx, III1_PANEL_LABEL_SCALE, noLongBeams);
}
