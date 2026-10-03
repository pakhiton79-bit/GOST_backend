// ГОСТ 10198-91, тип I-4: чертёж «Дно» - изометрия в стиле фото дна I-3
// (белая заливка, чёрный контур), генерируется (SVG) не в масштабе, т.к. на
// фото I-3 доски дна сплошные. Форма всегда одна (ширина - 0.55 длины),
// сечения деталей - условные, одной величины u; реальные размеры - в
// подписях. Сборка - как у I-3: снизу подполозные доски (если есть), на них
// полозья (крайние - по краям дна), на полозьях - торцовые брусья с
// отступом от концов (щит торцевой) и между ними доски дна поперёк ящика -
// с промежутками (как у щитов I-4: светло-серые, промежутки - в реальной
// доле, но не уже четверти пролёта на доску, чтобы были видны); без
// промежутков - доски вплотную; «Убрать доски дна» - досок нет.
// Размеры: длина полоза, ширина дна, отступ торцового бруса от конца,
// промежуток между досками дна.
const DNO_I4_LEN = 1000, DNO_I4_RATIO = 0.55, DNO_I4_U = 50;
const DNO_I4_IW = 2008, DNO_I4_STROKE = 6;
const DNO_I4_MAX_SKIDS = 10, DNO_I4_MAX_BOARDS = 30;
const DNO_I4_C = Math.cos(Math.PI/6), DNO_I4_S = Math.sin(Math.PI/6);

// Изометрия: x - вдоль длины (вверх-вправо), y - поперёк (вверх-влево), z -
// вверх; ближний угол (x=0, y=0) - внизу.
function dnoI4Proj(x, y, z){
  return [(x - y)*DNO_I4_C, -(x + y)*DNO_I4_S - z];
}

// skidCount - число полозьев, hasSub - есть подполозные доски, boardQty -
// число досок дна (0 - убраны), gap - промежуток досок дна ({ gap, share })
// или null; lenVal, widthVal, insetVal - подписи, мм; insetRatio - отступ
// торцового бруса к его ширине (для рисунка).
function diagramDnoI4Generated(skidCount, hasSub, boardQty, gap, lenVal, widthVal, insetVal, insetRatio){
  if(!(skidCount >= 1) || skidCount > DNO_I4_MAX_SKIDS) return diagramTooDense();
  const u = DNO_I4_U, L = DNO_I4_LEN, W = L * DNO_I4_RATIO;
  const subH = hasSub ? 0.35*u : 0, skidH = u, skidTop = subH + skidH;
  const boardTop = skidTop + 0.35*u, endW = u, endTop = skidTop + u;
  const inset = u * Math.min(1, Math.max(0.3, insetRatio));
  const skidW = Math.min(u, W / (skidCount + 0.5*(skidCount - 1)));
  if(skidW < 0.25*u) return diagramTooDense();
  const skidY = skidCount === 1 ? [(W - skidW)/2] : Array.from({length: skidCount}, (_, i) => i*(W - skidW)/(skidCount - 1));

  // Доски дна между торцовыми брусьями: ширина доски b и промежуток g по
  // реальной доле (не меньше 0.25, чтобы было видно).
  const bx0 = inset + endW, bx1 = L - inset - endW, span = bx1 - bx0;
  const n = Math.min(DNO_I4_MAX_BOARDS, Math.max(0, Math.round(boardQty)));
  let boards = [];
  if(n > 0){
    if(gap && n > 1){
      const share = Math.max(gap.share || 0, 0.25);
      const g = span * share / (n - 1), b = (span - g*(n - 1)) / n;
      boards = Array.from({length: n}, (_, i) => [bx0 + i*(b + g), bx0 + i*(b + g) + b]);
    } else {
      boards = [[bx0, bx1]];                         // сплошь - одной плоскостью
    }
  }

  // Коробки [x0, x1, y0, y1, z0, z1] от дальних к ближним.
  const boxes = [];
  const subLen = L*0.84, subX0 = (L - subLen)/2;
  skidY.slice().reverse().forEach(y=>{
    if(hasSub) boxes.push({ b:[subX0, subX0 + subLen, y + 0.05*skidW, y + 0.95*skidW, 0, subH] });
    boxes.push({ b:[0, L, y, y + skidW, subH, skidTop] });
  });
  boxes.push({ b:[L - inset - endW, L - inset, 0, W, skidTop, endTop] });  // дальний торцовый брус
  boards.slice().reverse().forEach(([x0, x1]) => boxes.push({ b:[x0, x1, 0, W, skidTop, boardTop], fill: gap ? I4_BOARD_FILL : '' }));
  boxes.push({ b:[inset, inset + endW, 0, W, skidTop, endTop] });          // ближний

  const pts = [];
  boxes.forEach(({b})=>{ [b[0], b[1]].forEach(x=>[b[2], b[3]].forEach(y=>[b[4], b[5]].forEach(z=>pts.push(dnoI4Proj(x, y, z))))); });
  const minX = Math.min(...pts.map(p=>p[0])), maxX = Math.max(...pts.map(p=>p[0]));
  const minY = Math.min(...pts.map(p=>p[1])), maxY = Math.max(...pts.map(p=>p[1]));
  const pad = DNO_I4_STROKE;
  const k = (DNO_I4_IW - 2*pad) / (maxX - minX);
  const IW = DNO_I4_IW, IH = Math.round((maxY - minY)*k + 2*pad);
  const P = (x, y, z) => { const p = dnoI4Proj(x, y, z); return [pad + (p[0] - minX)*k, pad + (p[1] - minY)*k]; };
  const f = v => v.toFixed(1);
  const poly = (ps, fill) => `<polygon points="${ps.map(p=>f(p[0])+','+f(p[1])).join(' ')}"${fill ? ` fill="${fill}"` : ''}/>`;
  let shapes = '';
  boxes.forEach(({b:[x0, x1, y0, y1, z0, z1], fill})=>{
    shapes += poly([P(x0,y0,z1), P(x1,y0,z1), P(x1,y1,z1), P(x0,y1,z1)], fill);
    shapes += poly([P(x0,y0,z0), P(x0,y1,z0), P(x0,y1,z1), P(x0,y0,z1)], fill);
    shapes += poly([P(x0,y0,z0), P(x1,y0,z0), P(x1,y0,z1), P(x0,y0,z1)], fill);
  });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${IW}" height="${IH}" viewBox="0 0 ${IW} ${IH}">`
    + `<rect width="100%" height="100%" fill="#fff"/>`
    + `<g fill="#fff" stroke="#000" stroke-width="${DNO_I4_STROKE}" stroke-linejoin="round">${shapes}</g></svg>`;
  const img = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

  const d = 1.6*u, rec = [];
  const line = (a, b) => rec.push({type:'line', x1:a[0], y1:a[1], x2:b[0], y2:b[1]});
  const dbl = (a, b, text) => rec.push({type:'double', x1:a[0], y1:a[1], x2:b[0], y2:b[1], lx:(a[0]+b[0])/2, ly:(a[1]+b[1])/2, text});
  // Длина полоза - вдоль ближнего правого края, снизу.
  line(P(0, 0, subH), P(0, -d*1.3, subH)); line(P(L, 0, subH), P(L, -d*1.3, subH));
  dbl(P(0, -d, subH), P(L, -d, subH), dimLabel(lenVal)+' мм');
  // Ширина дна - вдоль ближнего левого края, по низу досок.
  line(P(0, 0, skidTop), P(-d*1.3, 0, skidTop)); line(P(0, W, skidTop), P(-d*1.3, W, skidTop));
  dbl(P(-d, 0, skidTop), P(-d, W, skidTop), dimLabel(widthVal)+' мм');
  // Отступ торцового бруса от конца - выносные линии влево за дальний край,
  // перемычка, стрелка сверху (как у дна III-1).
  const yL = W + d*1.1;
  line(P(0, W, skidTop), P(0, yL + 0.3*u, skidTop));
  line(P(inset, W, endTop), P(inset, yL + 0.3*u, endTop));
  line(P(inset, yL, skidTop), P(inset, yL, endTop));
  line(P(0, yL, skidTop), P(inset, yL, skidTop));
  const tip = P(inset/2, yL, skidTop), from = P(inset/2, yL, skidTop + 2.6*u);
  rec.push({type:'single', x1:from[0], y1:from[1], x2:tip[0], y2:tip[1]});
  const lab = P(inset/2, yL, skidTop + 3.4*u);
  rec.push({lx:lab[0], ly:lab[1], text:dimLabel(insetVal)+' мм'});
  // Промежуток между досками дна - у середины дна, за дальним краем:
  // выносные линии от кромок досок, перемычка, стрелка сверху.
  if(gap && boards.length > 1){
    const gi = Math.floor((boards.length - 1)/2), xa = boards[gi][1], xb = boards[gi+1][0], yG = W + d*0.8;
    line(P(xa, W, boardTop), P(xa, yG + 0.3*u, boardTop));
    line(P(xb, W, boardTop), P(xb, yG + 0.3*u, boardTop));
    line(P(xa, yG, boardTop), P(xb, yG, boardTop));
    const gt = P((xa + xb)/2, yG, boardTop), gf = P((xa + xb)/2, yG, boardTop + 2.6*u);
    rec.push({type:'single', x1:gf[0], y1:gf[1], x2:gt[0], y2:gt[1]});
    const gl = P((xa + xb)/2, yG, boardTop + 3.4*u);
    rec.push({lx:gl[0], ly:gl[1], text:dimLabel(gap.gap)+' мм'});
  }
  return renderDiagram(img, 'Дно - схема расположения деталей', IW, IH, rec, undefined, photoStrokeScale(IW));
}

// Чертёж дна для результата расчёта (подписи - те же величины, что у дна
// I-3).
function diagramDnoFor(calc){
  const rows = calc.dno || [];
  const boardQty = rows.filter(r => /^Доска дна/.test(r.name)).reduce((s, r) => s + (parseFloat(r.qty) || 0), 0);
  const endRow = rows.find(r => r.name === 'Торцовый брус дна');
  const endW = endRow && parseFloat(endRow.w) > 0 ? parseFloat(endRow.w) : 100;
  return diagramDnoI4Generated(dnoSkidCount(rows), rows.some(r => r.name === 'Подполозная доска'), boardQty,
    calc.boardGaps.dno, calc.k9Base, calc.outerW - calc.t40*2, calc.torecFrameThickness, calc.torecFrameThickness / endW);
}
