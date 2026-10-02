// Подгонка чертежей под их слот в ряду «чертёж | таблица деталей» - на
// экране (fitDiagramsOnScreen) и в печатном листе (fitDiagramsForPrint).
//
// Подписи размеров и стрелки нарисованы ЗА пределами картинки (до ~70px
// ниже, ~28px выше, у некоторых чертежей и заметно левее/правее - например,
// у 2-этажных чертежей торца). Вёрстка про этот вылет не знает, поэтому
// соседние секции наезжали друг на друга. Для каждого чертежа измеряются
// настоящие границы (картинка + подписи + стрелки), и:
//   1) если с вылетами он не помещается в ширину слота - чертёж целиком
//      (картинка, подписи, стрелки - через --dk) пропорционально уменьшается;
//      соседнюю таблицу не двигаем никогда;
//   2) если место остаётся - картинка увеличивается до ширины слота (подписи
//      прежнего размера), но не выше DIAGRAM_GROW_MAX_H: так каждый чертёж
//      I-3/II-1 занимает всё своё место (как у I-1). Чертежи I-1 и I-2
//      (data-max-size) уже рассчитаны на максимальный размер, общий вид ящика
//      (без стрелок) - не чертёж; их не увеличиваем;
//   3) вылет сверху/снизу резервируется отступами (на экране - margin у
//      чертежа, в печати - padding у слота), и весь чертёж вместе с
//      подписями ставится по центру слота; ряд выровнен по центру, поэтому
//      по вертикали чертёж - по центру таблицы деталей;
//   4) чертежи одной группы (data-size-group на слоте, напр. щиты торцевой и
//      боковой у II-1) приводятся к меньшему из масштабов участников - иначе
//      парные чертежи получались заметно разного размера.

// Ширина слота на десктопе (.diagram-slot{width:300px}) - запасное значение,
// если слот не удалось измерить.
const DIAGRAM_SLOT_BUDGET = 300;
// Предельная высота картинки при увеличении (та же, что у чертежей I-1).
const DIAGRAM_GROW_MAX_H = 240;
// Запас от края слота слева и справа: без него подпись с большим вылетом
// (напр. «Щит торцевой» II-1 на 3 стойки - рамка на фото занимает самую
// большую долю кадра) вставала впритык к краю и визуально «выходила за
// пределы» - по репорту пользователя.
const DIAGRAM_SAFETY_PAD = 6;
// Предел уменьшения чертежа.
const DIAGRAM_MIN_SCALE = 0.3;

// Границы чертежа вместе с подписями и стрелками (координаты стрелок в SVG
// могут быть отрицательными - за пределами картинки): { box - сама
// картинка, top/bottom/left/right - общий охват }.
function measureDiagram(wrap){
  const box = wrap.getBoundingClientRect();
  let top = box.top, bottom = box.bottom, left = box.left, right = box.right;

  wrap.querySelectorAll('.diagram-label').forEach(lbl=>{
    const r = lbl.getBoundingClientRect();
    if(r.height){
      top = Math.min(top, r.top);
      bottom = Math.max(bottom, r.bottom);
      left = Math.min(left, r.left);
      right = Math.max(right, r.right);
    }
  });

  const svg = wrap.querySelector('svg');
  if(svg && svg.viewBox && svg.viewBox.baseVal){
    try{
      const bb = svg.getBBox();
      const sr = svg.getBoundingClientRect();
      const vb = svg.viewBox.baseVal;
      if(vb.width && vb.height && sr.width && sr.height){
        const sx = sr.width / vb.width, sy = sr.height / vb.height;
        top = Math.min(top, sr.top + bb.y * sy);
        bottom = Math.max(bottom, sr.top + (bb.y + bb.height) * sy);
        left = Math.min(left, sr.left + bb.x * sx);
        right = Math.max(right, sr.left + (bb.x + bb.width) * sx);
      }
    }catch(e){ /* getBBox недоступен - останутся отступы по подписям */ }
  }
  return {box, top, bottom, left, right};
}

// Вылеты за картинку по сторонам, целые px; слева и справа - с запасом
// DIAGRAM_SAFETY_PAD.
function diagramOverflow(m){
  return {
    top: Math.max(0, Math.ceil(m.box.top - m.top)),
    bottom: Math.max(0, Math.ceil(m.bottom - m.box.bottom)),
    left: Math.max(0, Math.ceil(m.box.left - m.left)) + DIAGRAM_SAFETY_PAD,
    right: Math.max(0, Math.ceil(m.right - m.box.right)) + DIAGRAM_SAFETY_PAD,
  };
}

// Масштаб чертежа целиком: ширина картинки и --dk (подписи, стрелки).
function setDiagramScale(wrap, width0, scale){
  wrap.style.width = Math.round(width0 * scale) + 'px';
  wrap.style.setProperty('--dk', scale.toFixed(3));
}

// Уменьшение чертежа, пока он с вылетами не впишется в slotWidth (не меньше
// DIAGRAM_MIN_SCALE). width0 - ширина картинки при масштабе 1. На экране
// (fixedLeft = null) оба вылета замеряются заново на каждом шаге: при узком
// слоте (мобильный) отступ, посчитанный до сжатия, не давал уменьшению
// освободить место. В печати левый вылет fixedLeft зарезервирован один раз
// при полном масштабе и в ходе уменьшения не пересчитывается.
function shrinkDiagramToSlot(wrap, slotWidth, width0, fixedLeft){
  let scale = 1;
  for(let i = 0; i < 8; i++){
    if(fixedLeft == null) wrap.style.marginLeft = '0px';
    const m = measureDiagram(wrap), o = diagramOverflow(m);
    const left = fixedLeft == null ? o.left : fixedLeft;
    if(left + m.box.width + o.right <= slotWidth || scale <= DIAGRAM_MIN_SCALE) break;
    scale = Math.max(DIAGRAM_MIN_SCALE, fixedLeft == null
      ? scale * (slotWidth - 4) / (m.box.width + left + o.right)
      : scale * (slotWidth - 4 - left) / (m.box.width + o.right));
    setDiagramScale(wrap, width0, scale);
  }
  return scale;
}

// Можно ли увеличивать картинку (см. п.2 в начале файла).
function diagramCanGrow(slot, wrap){
  return !slot.hasAttribute('data-max-size') && !!wrap.querySelector('svg.diagram-arrows');
}

// Увеличение картинки (без подписей), пока она с вылетами помещается в
// slotWidth и не выше maxH. Возвращает множитель (1 - не увеличивали).
function growDiagramToSlot(wrap, slotWidth, maxH, width0){
  const setWidth = g => { wrap.style.width = Math.round(width0 * g) + 'px'; };
  const measureGaps = () => {
    wrap.style.marginLeft = '0px';
    const m = measureDiagram(wrap), o = diagramOverflow(m);
    return {box: m.box, lo: o.left, ro: o.right};
  };
  let g = 1;
  for(let i = 0; i < 6; i++){
    const m = measureGaps();
    if(!m.box.width || !m.box.height) break;
    const k = Math.min((slotWidth - 4 - m.lo - m.ro) / m.box.width, maxH / m.box.height);
    const next = Math.max(1, g * k);
    if(Math.abs(next - g) < 0.005) break;
    g = next;
    setWidth(g);
  }
  // Подстраховка: если после последнего шага охват всё же не влез - шаг назад.
  for(let i = 0; i < 6 && g > 1; i++){
    const m = measureGaps();
    if(m.lo + m.box.width + m.ro <= slotWidth) break;
    g = Math.max(1, g * (slotWidth - 4) / (m.lo + m.box.width + m.ro));
    setWidth(g);
  }
  return g;
}

// При увеличении картинки линии SVG (толщина задана в единицах viewBox)
// утолщались бы пропорционально - на экране компенсируем, чтобы они
// оставались прежней толщины (в печати толщину задаёт CSS).
function setDiagramStrokeGrowth(wrap, g){
  wrap.querySelectorAll('svg.diagram-arrows line').forEach(l=>{
    if(!l.dataset.sw0) l.dataset.sw0 = l.getAttribute('stroke-width') || '';
    const sw0 = parseFloat(l.dataset.sw0);
    if(sw0) l.setAttribute('stroke-width', String(sw0 / g));
  });
}

// Отступ картинки слева: весь чертёж - картинка вместе с вылетающими
// подписями и стрелками (о - diagramOverflow) - по центру слота (по
// указанию пользователя); левый вылет всегда виден целиком.
function centeredMarginLeft(slotWidth, boxWidth, o){
  return Math.max(o.left, o.left + (slotWidth - (o.left + boxWidth + o.right)) / 2);
}

// Подгонка одного чертежа на экране. forcedScale - масштаб, заданный извне
// (второй проход для групп, см. fitDiagramSlots); иначе подбирается.
// Возвращает масштаб.
function fitDiagramOnScreen(slot, wrap, forcedScale){
  const baseWidth = parseFloat(wrap.dataset.baseWidth) || parseFloat(getComputedStyle(wrap).width) || 260;
  // Сброс перед замером (иначе накапливаются отступы/масштаб предыдущего расчёта).
  wrap.style.marginTop = '0px';
  wrap.style.marginBottom = '0px';
  wrap.style.marginLeft = '0px';
  wrap.style.width = baseWidth + 'px';
  wrap.style.setProperty('--dk', '1');
  slot.style.width = '';
  slot.style.flexBasis = '';

  // Ширина - реальная ширина слота: на узких экранах (≤700px) он у́же 300px.
  const slotWidth = slot.getBoundingClientRect().width || DIAGRAM_SLOT_BUDGET;

  let scale;
  if(forcedScale != null){
    scale = forcedScale;
    setDiagramScale(wrap, baseWidth, scale);
  } else {
    scale = shrinkDiagramToSlot(wrap, slotWidth, baseWidth, null);
    const grow = scale >= 1 && diagramCanGrow(slot, wrap) ? growDiagramToSlot(wrap, slotWidth, DIAGRAM_GROW_MAX_H, baseWidth) : 1;
    setDiagramStrokeGrowth(wrap, grow);
  }

  // На экране ряд выровнен по верху, поэтому вылет сверху/снизу
  // резервируется отступами самого чертежа.
  wrap.style.marginLeft = '0px';
  const m = measureDiagram(wrap), o = diagramOverflow(m);
  const marginLeft = centeredMarginLeft(slotWidth, m.box.width, o);
  wrap.style.marginTop = o.top + 'px';
  wrap.style.marginBottom = o.bottom + 'px';
  wrap.style.marginLeft = marginLeft + 'px';
  return scale;
}

// Подгонка одного чертежа в печатном листе (ширина картинки уже задана
// applyDiagramWidths под масштаб листа --pk). Вылет сверху/снизу -
// padding слота (ряд в печати выровнен по центру); он считается при
// полном масштабе и пересчитывается только после увеличения картинки.
function fitDiagramForPrint(slot, wrap, forcedScale){
  slot.style.paddingTop = '0px';
  slot.style.paddingBottom = '0px';
  wrap.style.marginLeft = '0px';
  const reserveVertical = o => {
    slot.style.paddingTop = o.top + 'px';
    slot.style.paddingBottom = o.bottom + 'px';
  };

  const o0 = diagramOverflow(measureDiagram(wrap));
  reserveVertical(o0);
  // Левый вылет - отступом самой картинки внутри слота фиксированной ширины
  // (margin у слота сдвигал бы и соседнюю таблицу).
  wrap.style.marginLeft = o0.left + 'px';

  const slotWidth = slot.getBoundingClientRect().width;
  const fullWidth = wrap.getBoundingClientRect().width;
  wrap.style.setProperty('--dk', '1');
  let scale;
  if(forcedScale != null){
    scale = forcedScale;
    setDiagramScale(wrap, fullWidth, scale);
  } else {
    scale = shrinkDiagramToSlot(wrap, slotWidth, fullWidth, o0.left);
    if(scale >= 1 && diagramCanGrow(slot, wrap)){
      const pk = parseFloat(getComputedStyle(slot).getPropertyValue('--pk')) || 1;
      const g = growDiagramToSlot(wrap, slotWidth, DIAGRAM_GROW_MAX_H * pk, fullWidth);
      if(g > 1) reserveVertical(diagramOverflow(measureDiagram(wrap)));
    }
  }

  const m = measureDiagram(wrap);
  wrap.style.marginLeft = centeredMarginLeft(slotWidth, m.box.width, diagramOverflow(m)) + 'px';
  return scale;
}

// Все чертежи контейнера: fitSlot - подгонка одного (fitDiagramOnScreen /
// fitDiagramForPrint), resetSlot - подготовка каждого слота, в т.ч. без
// чертежа. Затем группы data-size-group приводятся к меньшему масштабу.
function fitDiagramSlots(container, fitSlot, resetSlot){
  const processed = [];
  container.querySelectorAll('.diagram-slot').forEach(slot=>{
    if(resetSlot) resetSlot(slot);
    const wrap = slot.querySelector('.diagram-wrap');
    if(!wrap) return;
    processed.push({slot, wrap, scale: fitSlot(slot, wrap, null)});
  });

  const groups = {};
  processed.forEach(p=>{
    const g = p.slot.dataset.sizeGroup;
    if(!g) return;
    (groups[g] = groups[g] || []).push(p);
  });
  Object.values(groups).forEach(members=>{
    if(members.length < 2) return;
    const minScale = Math.min(...members.map(m=>m.scale));
    members.forEach(m=>{
      if(m.scale > minScale + 1e-6) fitSlot(m.slot, m.wrap, minScale);
    });
  });
}

// Экран: после каждого расчёта (render-*.js) и при изменении размера окна.
function fitDiagramsOnScreen(container){
  fitDiagramSlots(container, fitDiagramOnScreen);
}

// Печатный лист: при каждой пробе масштаба листа (fitPrintAreaToOnePage).
// margin-left сбрасывается у каждого слота, в т.ч. без чертежа (напр. «Общий
// вид ящика» без фото): иначе CSS-отступ по умолчанию сдвигал таблицу рядом
// с ним относительно таблиц деталей других узлов.
function fitDiagramsForPrint(printArea){
  fitDiagramSlots(printArea, fitDiagramForPrint, slot => { slot.style.marginLeft = '0px'; });
}

// При изменении размера уже открытой страницы (сузили окно) чертежи
// подгоняются заново - иначе оставался масштаб под старую ширину слота.
// Пропускаем, если #boardTables сейчас не отображается (print-режим,
// #tooNarrow) - замеры дали бы нулевые размеры.
let _resizeReflowTimer = null;
window.addEventListener('resize', ()=>{
  clearTimeout(_resizeReflowTimer);
  _resizeReflowTimer = setTimeout(()=>{
    const boardTablesEl = document.getElementById('boardTables');
    if(boardTablesEl && boardTablesEl.children.length && boardTablesEl.offsetParent !== null){
      fitDiagramsOnScreen(boardTablesEl);
    }
  }, 150);
});
