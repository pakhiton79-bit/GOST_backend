// Общие для типов I-3 и I-1 функции/данные отрисовки чертежей-фото
// (используются в src/diagrams.js и src/i1/diagrams.js).

const TOREC_1_IMG_B64 = "/images/torec_1.png"; // натуральный размер 1352x1158 (вариант с 1 раскосиной)
const TOREC_0_IMG_B64 = "/images/torec_0.jpg"; // натуральный размер 1354x1134 (вариант без раскосины, H<=600мм либо W<=600мм)

function headTriangle(fromX,fromY,toX,toY,scale){
  const angle = Math.atan2(toY-fromY, toX-fromX);
  const headLen = 9*scale, headW = 6.5*scale;
  const bx = toX - headLen*Math.cos(angle), by = toY - headLen*Math.sin(angle);
  const px1 = bx + (headW/2)*Math.sin(angle), py1 = by - (headW/2)*Math.cos(angle);
  const px2 = bx - (headW/2)*Math.sin(angle), py2 = by + (headW/2)*Math.cos(angle);
  return {bx,by,poly:`${toX},${toY} ${px1.toFixed(1)},${py1.toFixed(1)} ${px2.toFixed(1)},${py2.toFixed(1)}`};
}

// общий рендер схемы: картинка на заднем плане + стрелки/линии (SVG, в натуральных
// пиксельных координатах картинки) + подписи (HTML-блоки, фиксированный шрифт).
// strokeScale — множитель толщины линий/стрелок и размера наконечников относительно
// базовых значений (1.5px линия, наконечник 9×6.5px); нужен, потому что разные чертежи
// сидят на картинках очень разного натурального размера (напр. Дно — 2008×1212, у
// остальных пока ~300px) и один и тот же абсолютный пиксельный размер линии на них
// выглядит по-разному. По умолчанию 1 (старые маленькие чертежи), для Дна передаём 10.
// Единая нормировка толщины линий/стрелок для чертежей-фотографий: толщина линии в
// SVG задаётся в пикселях самого фото, а разные фото имеют разное натуральное
// разрешение, поэтому одинаковый strokeScale даёт разную видимую на экране толщину.
// Эталон — чертёж Дна (натуральная ширина 2008px, scale=10, подобран визуально).
// Для любого другого фото пересчитываем scale пропорционально его ширине, чтобы
// видимая толщина линий совпадала с эталоном независимо от разрешения снимка.
const PHOTO_STROKE_REF_WIDTH = 2008, PHOTO_STROKE_REF_SCALE = 10;
function photoStrokeScale(imgNaturalWidth){
  return PHOTO_STROKE_REF_SCALE * imgNaturalWidth / PHOTO_STROKE_REF_WIDTH;
}

// Ширина чертежа по умолчанию (см. .diagram-wrap в CSS) и максимальная высота,
// до которой он может «вырасти» при портретной ориентации фото (высота больше
// ширины, напр. 2-этажный торец на 1 раскосину). Без этого ограничения такие
// чертежи получались значительно выше обычных и налезали на соседнюю таблицу.
const DIAGRAM_DEFAULT_WIDTH = 260;
const DIAGRAM_MAX_HEIGHT = 240;

function renderDiagram(imgB64, altText, IW, IH, records, widthPx, strokeScale){
  const scale = strokeScale || 1;
  const lineWidth = (1.5*scale).toFixed(2);
  let shapes = '';
  let labels = '';
  records.forEach(r=>{
    const hasLine = ('x1' in r);
    const hasLabel = ('lx' in r);
    if(hasLine){
      if(r.type==='line'){
        shapes += `<line x1="${r.x1}" y1="${r.y1}" x2="${r.x2}" y2="${r.y2}" stroke="#4E342E" stroke-width="${lineWidth}"/>`;
      } else if(r.type==='double'){
        const headStart = headTriangle(r.x2,r.y2,r.x1,r.y1,scale);
        const headEnd   = headTriangle(r.x1,r.y1,r.x2,r.y2,scale);
        shapes += `<line x1="${headStart.bx.toFixed(1)}" y1="${headStart.by.toFixed(1)}" x2="${headEnd.bx.toFixed(1)}" y2="${headEnd.by.toFixed(1)}" stroke="#4E342E" stroke-width="${lineWidth}"/>`;
        shapes += `<polygon points="${headStart.poly}" fill="#4E342E"/>`;
        shapes += `<polygon points="${headEnd.poly}" fill="#4E342E"/>`;
      } else if(r.type==='single'){
        const head = headTriangle(r.x1,r.y1,r.x2,r.y2,scale);
        shapes += `<line x1="${r.x1}" y1="${r.y1}" x2="${head.bx.toFixed(1)}" y2="${head.by.toFixed(1)}" stroke="#4E342E" stroke-width="${lineWidth}"/>`;
        shapes += `<polygon points="${head.poly}" fill="#4E342E"/>`;
      }
    }
    if(hasLabel){
      const lx = (r.lx/IW*100).toFixed(2), ly = (r.ly/IH*100).toFixed(2);
      const labelClass = r.vertical ? 'diagram-label diagram-label-vertical' : 'diagram-label';
      labels += `<div class="${labelClass}" style="left:${lx}%;top:${ly}%">${r.text}</div>`;
    }
  });
  let w = widthPx;
  if(!w){
    w = DIAGRAM_DEFAULT_WIDTH;
    if(w * IH / IW > DIAGRAM_MAX_HEIGHT){
      w = Math.round(DIAGRAM_MAX_HEIGHT * IW / IH);
    }
  }
  const sizeStyle = ` style="width:${w}px;flex-basis:${w}px"`;
  // data-base-width дублирует исходную (авторскую, до любых экранных/печатных
  // подгонок) ширину как атрибут, а не только инлайн-стиль - печать (см.
  // printBox() в src/common-print.js) читает именно его, а не style.width:
  // к моменту печати style.width у чертежа уже мог измениться (реальный
  // масштаб на экране после reserveDiagramOverflowScreen, или вовсе очищен в
  // buildPrintHtml перед вставкой в печатную область) - и раньше печать по
  // ошибке подставляла заглушку 260px для ЛЮБОГО чертежа, если style.width
  // на тот момент был пуст, из-за чего разная авторская ширина торца (210px
  // у типа I-3, меньше у типа I-1) в печати никогда не применялась.
  return `<div class="diagram-wrap" data-base-width="${w}"${sizeStyle}>
    <img src="${imgB64}" alt="${altText}">
    <svg class="diagram-arrows" viewBox="0 0 ${IW} ${IH}" preserveAspectRatio="none">
      ${shapes}
    </svg>
    <div class="diagram-labels">${labels}</div>
  </div>`;
}

function diagramPlaceholder(label){
  // Временная заглушка вместо чертежа, для которого фото ещё не прислано.
  return `<div class="diagram-wrap diagram-placeholder" style="display:flex;align-items:center;justify-content:center;min-height:160px;border:1px dashed var(--border-input);border-radius:12px;color:var(--ink-soft);font-size:13px;text-align:center;padding:12px;">Чертёж «${label}» ещё не готов</div>`;
}

// Чертежи торцевого щита (эта функция и все diagramEndPanel*Raskosina в
// src/diagrams.js) заданы явной шириной 210px вместо DIAGRAM_DEFAULT_WIDTH
// (260px, как у остальных чертежей) - по замечанию пользователя, на общем
// фоне остальных чертежей торец выглядел заметно крупнее (при том же
// формальном размере слота его фото зрительно доминировало). У функции
// diagramEndPanel2Floors1Raskosina явную ширину не задаём - у неё портретная (высокая) фотография и она и так
// автоматически ужимается по высоте (DIAGRAM_MAX_HEIGHT) сильнее, чем 210px.
// widthPxOverride - необязательный параметр (по умолчанию 210, как у типа
// I-3): у типа I-1 (см. src/i1/diagrams.js) остальные чертежи (Дно/Крышка/
// Бок) - широкие "приземистые" фото совсем другой пропорции, и при том же
// 210px торец на их фоне выглядел непропорционально крупным (само фото почти
// квадратное) - там передаётся своё, меньшее значение.
function diagramEndPanel1Raskosina(heightPlusT12Val, innerWidthVal, widthPxOverride){
  // Фото-чертёж для варианта с 1 раскосиной (натуральный размер 1352×1158).
  // Подпись высоты — полная высота рамы щита = высота груза + толщина доски дна.
  const val = Math.round(heightPlusT12Val);
  const innerWidth = Math.round(innerWidthVal);

  const records = [
    {type:'line', x1:1111, y1:36, x2:1541, y2:32},
    {type:'line', x1:1117, y1:1136, x2:1549, y2:1138},
    {type:'double', x1:1501, y1:33, x2:1499, y2:1140, lx:1483, ly:597, text: val+' мм', vertical:true},
    {type:'line', x1:1330, y1:922, x2:1328, y2:1318},
    {type:'line', x1:27, y1:922, x2:29, y2:1327},
    {type:'double', x1:30, y1:1275, x2:1330, y2:1277, lx:650, ly:1275, text: innerWidth+' мм'}
  ];

  return renderDiagram(TOREC_1_IMG_B64, 'Щит торцевой (1 раскосина) - схема расположения деталей', 1352, 1158, records, widthPxOverride || 210, photoStrokeScale(1352));
}

function diagramEndPanelNoRaskosina(heightPlusT12Val, widthVal, widthPxOverride){
  // Фото-чертёж для варианта без раскосины (H≤600мм либо W≤600мм — п.1.6.5/п.102 docx,
  // независимо друг от друга отключают раскосину на торце). Просто рамка из планок и
  // досок торца без диагоналей. Натуральный размер фото 1354×1134.
  // Высота = высота груза + толщина доски дна (то же значение, которым заполняется
  // доска торца, см. fbTorec); ширина = ширина груза (совпадает с k32).
  const val = Math.round(heightPlusT12Val);
  const width = Math.round(widthVal);

  const records = [
    {type:'line', x1:1122, y1:21, x2:1562, y2:19},
    {type:'line', x1:1122, y1:1118, x2:1565, y2:1118},
    {type:'double', x1:1514, y1:20, x2:1515, y2:1123, lx:1499, ly:562, text: val+' мм', vertical:true},
    {type:'line', x1:1337, y1:905, x2:1340, y2:1308},
    {type:'line', x1:35, y1:906, x2:35, y2:1308},
    {type:'double', x1:36, y1:1265, x2:1341, y2:1265, lx:696, ly:1271, text: width+' мм'}
  ];

  return renderDiagram(TOREC_0_IMG_B64, 'Щит торцевой (без раскосины) - схема расположения деталей', 1354, 1134, records, widthPxOverride || 210, photoStrokeScale(1354));
}
