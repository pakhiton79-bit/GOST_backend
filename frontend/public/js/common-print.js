/* ===================== МЕХАНИКА ПЕЧАТИ =====================

   Печатаем в этом же окне (без всплывающих окон — они подвешивали вкладку).
   Содержимое собирается в #printArea, который всегда отрисован реальными
   размерами (просто сдвинут за экран), поэтому его высоту можно честно
   измерить ДО печати.

   Почему лист раньше заполнялся наполовину и почему просто «увеличить шрифт»
   не помогало:
     • ширина листа — жёсткий лимит (733 px), а чертёж и таблица стоят в ряд;
       если раздуть шрифт/чертёж, таблице перестаёт хватать ширины и её
       содержимое начинает переноситься и наезжать;
     • по высоте же оставалось ~половина листа пустой, и это никак не
       использовалось.
   Поэтому:
     1) размеры подобраны под бюджет ширины (см. CSS выше) — это максимум,
        который влезает без переносов;
     2) чертежи увеличиваются на PRINT_DIAGRAM_FACTOR (насколько позволяет
        та же ширина);
     3) остаток высоты листа измеряется и равномерно распределяется между
        секциями — за счёт этого лист заполняется целиком;
     4) если содержимое всё же переросло лист (крупный расчёт, длинные
        названия) — включается пропорциональное уменьшение, чтобы второй,
        пустой лист не появился никогда.
*/
// Логотип водяного знака (см. print-watermark ниже) - вырезан из фото,
// загруженного пользователем (белая буква «Г» на сплошном фоне), и
// перекрашен в цвет бренда с прозрачным фоном.
// В отличие от исходного (фронтенд-only) репозитория, где картинки
// встраивались в HTML как base64 при сборке (см. __IMG: в build.py) - здесь
// обычный статический файл, отдаётся Express'ом как есть (см. server.js).
const LOGO_B64 = "/images/logo_watermark.png";

const PRINT_PAGE = { wMM:210, hMM:297, marginMM:8, pxPerMM:96/25.4 };
// Масштаб чертежей при печати относительно экранного. Меньше 1, потому что
// вокруг чертежа резервируется место под вылетающие подписи (см.
// reserveDiagramOverflow) — за счёт этого освобождается ширина под таблицы,
// и их шрифт удаётся поднять до 20px.
const PRINT_DIAGRAM_FACTOR = 0.885;

// Три взаимоисключающих статуса расчёта рядом с кнопками «Рассчитать»/
// «Печать» (#calcCheck/#calcOutdated/#calcError в разметке, см. calc-status
// в style.css) - .active переключает видимость (visibility, не display,
// чтобы ширина обёртки не менялась - см. .calc-status в style.css).
// state: 'check' (успешно посчитано), 'outdated' (результаты на экране
// устарели - вход поменялся после расчёта), 'error' (расчёт заблокирован -
// сервер вернул calc.error, или не удалось связаться с сервером) или
// null/любое другое значение - все три скрыты (до первого расчёта, либо
// только что открытая пустая форма).
function setCalcStatus(state){
  const ids = {check:'calcCheck', outdated:'calcOutdated', error:'calcError'};
  Object.keys(ids).forEach(key=>{
    const el = document.getElementById(ids[key]);
    if(el) el.classList.toggle('active', key === state);
  });
}

// Собирает содержимое #printArea из текущих результатов и проставляет
// data-base-width у чертежей (см. комментарий ниже, откуда он был раньше) -
// общая часть для printBox() (см. ниже) и для подстраховки на случай печати
// НЕ через кнопку (см. beforeprint в самом низу файла).
function buildAndSizePrintArea(){
  const scaleBox = document.getElementById('printScale');
  scaleBox.innerHTML = buildPrintHtml();

  // Чертежи имеют разный собственный масштаб (у торца он меньше, чтобы не
  // доминировать над остальными узлами; у бокового щита - чтобы подписи не
  // залезали на таблицу). data-base-width уже проставлен в разметке самим
  // renderDiagram() (см. src/common-diagrams.js) - это авторская ширина,
  // не зависящая от того, что buildPrintHtml() чуть выше очистил style.width
  // у клона. Раньше здесь читался именно (уже пустой к этому моменту)
  // style.width, из-за чего печать всегда попадала в запасной 260 для ЛЮБОГО
  // чертежа - авторская ширина торца (у типа I-3 меньше, чем у остальных
  // узлов; у типа I-1 - ещё меньше) в печати не применялась вообще. Общий вид
  // ящика (не из renderDiagram(), своей ширины не имеет) - как и раньше, 260.
  scaleBox.querySelectorAll('.diagram-wrap').forEach(wrap=>{
    if(!wrap.dataset.baseWidth){
      wrap.dataset.baseWidth = parseFloat(wrap.style.width) || 260;
    }
  });
}

function printBox(){
  if(document.getElementById('results').style.display !== 'block'){
    alert('Сначала выполните расчёт — нажмите «Рассчитать».');
    return;
  }

  buildAndSizePrintArea();
  const scaleBox = document.getElementById('printScale');

  // Важно: сразу после innerHTML браузер мог ещё не декодировать вставленные
  // <img> (чертежи, общий вид ящика, водяной знак) — их scrollHeight в этот
  // момент может быть занижен. Раньше это скрывалось запасом по высоте;
  // как только запас исчез (например, из-за добавленного комментария),
  // страница начала не помещаться на печати, хотя при замере «влезала».
  // Поэтому ждём decode() всех картинок и только потом меряем и подгоняем.
  const images = Array.from(scaleBox.querySelectorAll('img'));
  const ready = images.map(img => img.decode ? img.decode().catch(()=>{}) : Promise.resolve());

  Promise.all(ready).then(()=>{
    fitPrintAreaToOnePage(document.getElementById('printArea'));
    window.print();
  });
}

// Стрелки/линии размеров на чертежах (записи с x1/y1/x2/y2 в records, см.
// renderDiagram() в js/common-diagrams.js) - живой <svg class="diagram-arrows">
// поверх картинки. html2canvas рисует SVG заметно хуже основного HTML: не
// подхватывает внешние CSS-правила его потомков (см. #printArea
// .diagram-arrows line{stroke-width:calc(var(--pk)*var(--dk)*3px)!important;}
// в style.css - при обычной печати оно делает стрелки заметно толще, чем на
// экране) И теряет/обрывает часть самих линий (в т.ч. те, что по задумуке
// выходят за пределы viewBox чертежа - overflow:visible, подписи специально
// вынесены за рамку фото) - в PDF стрелки получались частично отсутствующими
// или как на экране тонкими - по репорту пользователя ("не перенеслись либо
// с косяками, не те толщины"). Лечится не попыткой подстроиться под html2canvas
// (у него это давняя, так и не исправленная слабость SVG-рендера), а тем, что
// КАЖДЫЙ <svg class="diagram-arrows"> перед съёмкой заменяется на обычный
// <img>, отрисованный из него самим браузером (см. rasterizeDiagramArrows
// ниже) - html2canvas после этого рисует уже готовую растровую картинку
// (что он умеет надёжно, как и все остальные чертежи-фото), а не сырой SVG.
// PDF_ARROW_STROKE_FACTOR - множитель поверх обычного печатного stroke-width
// (var(--pk)*var(--dk)*3px, см. #printArea .diagram-arrows line в style.css).
// В PDF стрелки всё равно оставались еле заметными даже после исправления
// самого механизма переноса - по репорту пользователя ("слишком тонкие,
// их не видно") - поэтому здесь заведомо толще, чем при обычной печати,
// а не просто "как при печати".
const PDF_ARROW_STROKE_FACTOR = 4;
function bakeDiagramArrowStrokeWidths(printArea){
  const scaleBox = document.getElementById('printScale');
  const pk = parseFloat(getComputedStyle(scaleBox).getPropertyValue('--pk')) || 1;
  printArea.querySelectorAll('.diagram-wrap').forEach(wrap=>{
    const dk = parseFloat(getComputedStyle(wrap).getPropertyValue('--dk')) || 1;
    const strokeWidth = (pk * dk * 3 * PDF_ARROW_STROKE_FACTOR).toFixed(2);
    wrap.querySelectorAll('.diagram-arrows line').forEach(line=>{
      line.setAttribute('stroke-width', strokeWidth);
    });
  });
}

// Заменяет каждый живой <svg class="diagram-arrows"> на <img>, отрисованный
// вручную через Canvas 2D (а не через <img src="data:image/svg+xml,...">,
// как в первой версии этой правки) - тот подход клипал часть линий: подписи
// на чертежах нарочно вынесены ЗА пределы viewBox (см. reserveDiagramOverflow
// в этом же файле), на экране/при обычной печати это держится на
// overflow:visible у живого SVG, но растровая картинка не может «вылезать»
// за собственные границы - при рендере в отдельный <img> всё, что было за
// пределами viewBox, обрезалось. Здесь координаты линий/наконечников (уже
// с запечёнными правильными stroke-width - см. bakeDiagramArrowStrokeWidths
// выше) читаются прямо из DOM и рисуются на canvas, размер которого заранее
// считается по фактическому охвату ВСЕХ фигур (включая те, что за пределами
// viewBox) - обрезки нет в принципе, независимо от того, насколько далеко
// вылетают подписи у конкретного чертежа.
function rasterizeDiagramArrows(printArea){
  const svgs = Array.from(printArea.querySelectorAll('svg.diagram-arrows'));
  const loads = svgs.map(svg => new Promise(resolve => {
    const wrap = svg.closest('.diagram-wrap');
    const vb = svg.viewBox.baseVal;
    const lines = Array.from(svg.querySelectorAll('line'));
    const polygons = Array.from(svg.querySelectorAll('polygon'));

    let minX = 0, minY = 0, maxX = vb.width, maxY = vb.height;
    const extend = (x, y) => {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    };
    lines.forEach(l=>{
      extend(parseFloat(l.getAttribute('x1')), parseFloat(l.getAttribute('y1')));
      extend(parseFloat(l.getAttribute('x2')), parseFloat(l.getAttribute('y2')));
    });
    polygons.forEach(p=>{
      p.getAttribute('points').trim().split(/\s+/).forEach(pair=>{
        const [x, y] = pair.split(',').map(Number);
        extend(x, y);
      });
    });
    const pad = 6; // запас на саму толщину линии вокруг крайних точек
    minX -= pad; minY -= pad; maxX += pad; maxY += pad;

    const wrapRect = wrap.getBoundingClientRect();
    const scaleX = wrapRect.width / vb.width;
    const scaleY = wrapRect.height / vb.height;
    const dpr = 2; // тот же множитель, что у scale:2 в html2canvas ниже - чёткие линии

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.ceil((maxX - minX) * scaleX * dpr));
    canvas.height = Math.max(1, Math.ceil((maxY - minY) * scaleY * dpr));
    const ctx = canvas.getContext('2d');
    ctx.scale(scaleX * dpr, scaleY * dpr);
    ctx.translate(-minX, -minY);

    lines.forEach(l=>{
      ctx.beginPath();
      ctx.moveTo(parseFloat(l.getAttribute('x1')), parseFloat(l.getAttribute('y1')));
      ctx.lineTo(parseFloat(l.getAttribute('x2')), parseFloat(l.getAttribute('y2')));
      ctx.strokeStyle = l.getAttribute('stroke') || '#8A4B26';
      ctx.lineWidth = parseFloat(l.getAttribute('stroke-width')) || 1;
      ctx.stroke();
    });
    polygons.forEach(p=>{
      const pts = p.getAttribute('points').trim().split(/\s+/).map(pair=>pair.split(',').map(Number));
      ctx.beginPath();
      pts.forEach(([x, y], i)=>{ i===0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); });
      ctx.closePath();
      ctx.fillStyle = p.getAttribute('fill') || '#8A4B26';
      ctx.fill();
    });

    const img = document.createElement('img');
    img.className = 'diagram-arrows';
    img.alt = '';
    img.style.position = 'absolute';
    img.style.left = (minX * scaleX) + 'px';
    img.style.top = (minY * scaleY) + 'px';
    img.style.width = ((maxX - minX) * scaleX) + 'px';
    img.style.height = ((maxY - minY) * scaleY) + 'px';
    img.style.pointerEvents = 'none';
    img.onload = resolve;
    img.onerror = resolve;
    img.src = canvas.toDataURL('image/png');
    svg.replaceWith(img);
  }));
  return Promise.all(loads);
}

// «Скачать PDF» - настоящее скачивание файла, БЕЗ системного диалога печати
// (который открывает printBox() выше) - по просьбе пользователя. Без
// сторонней библиотеки это невозможно: у веб-страницы нет API для сохранения
// файла на диск в обход диалога печати. html2canvas рисует уже собранный и
// подогнанный под лист #printArea в канвас, jsPDF оборачивает картинку в
// настоящий PDF-файл и сохраняет его через doc.save() - это вызывает обычное
// скачивание браузером (как клик по <a download>), а не печать.
// #printArea в обычном состоянии (см. #printArea в style.css) спрятан
// исключительно через opacity:0 (position:fixed;left:0;top:0, БЕЗ
// display:none) - его внутренняя вёрстка (flex-ряды чертёж/таблица и т.п.)
// не привязана к @media print и потому уже выглядит правильно даже сейчас;
// единственное, что нужно html2canvas - принудительно поднять opacity до 1
// на время съёмки. Это делается ТОЛЬКО в клоне документа (аргумент onclone),
// который html2canvas рендерит в скрытом iframe - сама страница пользователя
// ни на миг не меняется, поэтому никакого мелькания макета печати на экране
// не возникает.
function downloadPdf(){
  if(document.getElementById('results').style.display !== 'block'){
    alert('Сначала выполните расчёт — нажмите «Рассчитать».');
    return;
  }
  if(!window.html2canvas || !(window.jspdf && window.jspdf.jsPDF)){
    alert('Не удалось подготовить PDF. Попробуйте обновить страницу или воспользуйтесь кнопкой «Печать» (в диалоге печати можно сохранить как PDF).');
    return;
  }

  buildAndSizePrintArea();
  const scaleBox = document.getElementById('printScale');
  const images = Array.from(scaleBox.querySelectorAll('img'));
  const ready = images.map(img => img.decode ? img.decode().catch(()=>{}) : Promise.resolve());

  Promise.all(ready).then(()=>{
    const printArea = document.getElementById('printArea');
    fitPrintAreaToOnePage(printArea);
    bakeDiagramArrowStrokeWidths(printArea);
    return rasterizeDiagramArrows(printArea);
  }).then(()=>{
    const printArea = document.getElementById('printArea');
    // Масштаб 2x - иначе текст/тонкие линии чертежей на растровой картинке
    // внутри PDF выглядят размыто (#printArea отрисован под экранный DPI 1x).
    return window.html2canvas(printArea, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      onclone: (clonedDoc, clonedEl) => {
        clonedEl.style.opacity = '1';
        clonedEl.style.position = 'static';
        clonedEl.style.left = 'auto';
        clonedEl.style.top = 'auto';
        clonedEl.style.pointerEvents = 'auto';
      }
    });
  }).then(canvas => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const m = PRINT_PAGE.marginMM;
    const w = PRINT_PAGE.wMM - 2 * m;
    const h = PRINT_PAGE.hMM - 2 * m;
    // JPEG, а не PNG: страница содержит фото-чертежи (сами по себе JPEG,
    // см. IMG_PLACEHOLDER/photostroke в diagrams) - пересжатые в PNG canvas
    // они распухали в разы (12+ МБ на один лист) без заметного выигрыша в
    // качестве. При 0.92 файл на порядок легче, а текст/линии остаются
    // чёткими для печатной документации такого рода.
    doc.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', m, m, w, h);
    doc.save('gost-10198-91-raschet.pdf');
  }).catch(() => {
    alert('Не удалось создать PDF-файл. Попробуйте ещё раз или воспользуйтесь кнопкой «Печать» (в диалоге печати можно сохранить как PDF).');
  });
}

// Подстраховка на случай печати НЕ через кнопку «Печать»/«Скачать PDF»
// (Ctrl+P или пункт меню браузера «Печать»): без этого #printArea оставался
// либо пустым, либо с содержимым от прошлого расчёта под другой размер окна -
// window.print() в printBox() выше сам вызывает 'beforeprint', но кто-то
// может напечатать и напрямую, минуя printBox() - тогда сборка/подгонка
// страницы вообще не запускалась, и печать выходила необрезанной/наехавшей
// (подписи чертежей без зарезервированного места, остаток высоты листа не
// распределён) - по репорту пользователя ("нажал на клавишу... всё сползло").
// Событие 'beforeprint' не ждёт промисов, поэтому здесь - без async decode():
// картинки в #boardTables (тот же src, что и в клоне) уже отрисованы на
// экране к этому моменту, decode() для них практически мгновенен.
window.addEventListener('beforeprint', ()=>{
  const results = document.getElementById('results');
  if(!results || results.style.display !== 'block') return;
  buildAndSizePrintArea();
  fitPrintAreaToOnePage(document.getElementById('printArea'));
});

// Подписи размеров и стрелки нарисованы ЗА пределами прямоугольника картинки
// (по замерам — до ~70px ниже и ~28px выше, у некоторых чертежей и заметно
// левее/правее - например, у 2-этажных чертежей торца). Вёрстка про этот
// вылет не знает, поэтому соседние секции наезжали друг на друга. Здесь
// измеряются настоящие границы каждого чертежа и вылет резервируется
// отступами - в т.ч. margin-left теперь считается ПО ЭТОМУ чертежу, а не
// берётся как единая фиксированная оценка «на глаз» для всех сразу (было
// margin-left:44px в CSS): вылет влево у разных чертежей отличается в разы,
// а если задать общий отступ по худшему случаю - остальные чертежи занимали
// бы лишнее место, а если по «среднему» - то, что вылезает сильнее (как торец
// на 2 этажа), обрезалось бы уже на самой печати, т.к. вылет влево не
// увеличивает scrollWidth и потому не ловится проверкой fits() в
// fitPrintAreaToOnePage - страница «влезала» при замере, а печатала обрезанной.
function reserveDiagramOverflow(printArea){
  function processSlot(slot, wrap, forcedScale){
    slot.style.paddingTop = '0px';
    slot.style.paddingBottom = '0px';
    wrap.style.marginLeft = '0px';

    function measure(){
      const box = wrap.getBoundingClientRect();
      let top = box.top, bottom = box.bottom, left = box.left, right = box.right;

      // подписи в рамках
      wrap.querySelectorAll('.diagram-label').forEach(lbl=>{
        const r = lbl.getBoundingClientRect();
        if(r.height){
          top = Math.min(top, r.top);
          bottom = Math.max(bottom, r.bottom);
          left = Math.min(left, r.left);
          right = Math.max(right, r.right);
        }
      });

      // стрелки/линии SVG (координаты могут быть отрицательными)
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
        }catch(e){ /* getBBox недоступен — останутся отступы по подписям */ }
      }
      return {box, top, bottom, left, right};
    }

    const m0 = measure();
    slot.style.paddingTop = Math.max(0, Math.ceil(m0.box.top - m0.top)) + 'px';
    slot.style.paddingBottom = Math.max(0, Math.ceil(m0.bottom - m0.box.bottom)) + 'px';

    // Левый вылет резервируем margin-left НА САМОЙ КАРТИНКЕ (внутри слота),
    // а не на слоте целиком, как было раньше: у margin-left на .diagram-slot
    // вместе с ним сдвигается и соседняя таблица деталей (оба - элементы
    // одного flex-ряда), из-за чего у узла с большим вылетом (например, торец)
    // таблица «уезжала» правее, чем у остальных узлов на той же странице.
    // margin-left на wrap просто двигает картинку внутри уже фиксированной по
    // ширине ячейки (.diagram-slot{width:calc(var(--pk)*300px)} в style.css) -
    // таблица никогда не сдвигается.
    // SAFETY_PAD - небольшой запас, а не впритык до края слота (см. тот же
    // константу и комментарий в reserveDiagramOverflowScreen ниже) - у схемы
    // «3 укосины» чертежа «Щит торцевой» типа II-1 рамка щита занимает
    // самую большую долю кадра фото из всех присланных, поэтому те же ДОЛИ
    // отступа дают наибольший вылет в пикселях, и без запаса подпись
    // получалась впритык к краю слота - по репорту пользователя.
    const SAFETY_PAD = 6;

    const leftGap0 = Math.max(0, Math.ceil(m0.box.left - m0.left)) + SAFETY_PAD;
    wrap.style.marginLeft = leftGap0 + 'px';

    // Подстраховка: если отступ + сама картинка + вылет подписей/стрелок
    // ВПРАВО (за пределы самой картинки - как у widthVal-подписи чертежа
    // «Крышка» типа II-1, которая размещена почти у самого правого края
    // фото и потому торчит за его границу) не помещаются в фиксированную
    // ширину слота, чертёж наложился бы на таблицу (слот - overflow:visible,
    // это не ловится проверкой fits() в fitPrintAreaToOnePage, т.к. не меняет
    // scrollWidth). Раньше здесь проверялась только ширина САМОЙ картинки без
    // учёта вылета подписей вправо - тот же приём, что и в экранной версии
    // (reserveDiagramOverflowScreen в этом же файле): пропорционально
    // уменьшаем чертёж (картинку + подписи + стрелки, через --dk) в
    // несколько итераций, пока правый край (с учётом вылета) не впишется в
    // оставшуюся ширину слота.
    const slotWidth = slot.getBoundingClientRect().width;
    const fullWidth = wrap.getBoundingClientRect().width;
    wrap.style.setProperty('--dk', '1');
    // forcedScale (см. reserveScaleGroups в reserveDiagramOverflowScreen выше)
    // пропускает поиск и сразу применяет заданный извне масштаб - второй
    // проход, когда парный чертёж (data-size-group) требует более сильного
    // сжатия, чем нашлось бы для этого чертежа самостоятельно.
    let scale = 1;
    if(forcedScale != null){
      scale = forcedScale;
      wrap.style.width = Math.round(fullWidth * scale) + 'px';
      wrap.style.setProperty('--dk', scale.toFixed(3));
    } else {
      for(let i = 0; i < 8; i++){
        const mi = measure();
        const rightGap = Math.max(0, Math.ceil(mi.right - mi.box.right)) + SAFETY_PAD;
        const usedWidth = leftGap0 + mi.box.width + rightGap;
        if(usedWidth <= slotWidth || scale <= 0.3) break;
        scale = Math.max(0.3, scale * (slotWidth - 4 - leftGap0) / (mi.box.width + rightGap));
        wrap.style.width = Math.round(fullWidth * scale) + 'px';
        wrap.style.setProperty('--dk', scale.toFixed(3));
      }
    }

    // Центрируем САМУ КАРТИНКУ (а не весь охват вместе с вылетающими подписями)
    // в слоте. Первая попытка (центрирование охвата целиком) не подошла: вылет
    // подписей у разных узлов разный и часто несимметричный (слева/справа), и
    // при выравнивании охвата по центру сама картинка всё равно оказывалась в
    // разных узлах на разной высоте от центра слота - "лесенка" пропадала не
    // полностью, а при других размерах ящика (когда пропорция вылета меняется)
    // могла проявиться снова. Целимся ровно в центр слота для самой картинки,
    // но не ближе, чем позволяют вылет слева (leftGap) и вылет справа (rightGap,
    // чтобы не наехать на таблицу) - если картинка узкая, а вылет большой и
    // несимметричный, эти границы важнее идеальной центровки.
    const m = measure();
    const leftGap = Math.max(0, Math.ceil(m.box.left - m.left)) + SAFETY_PAD;
    const rightGap = Math.max(0, Math.ceil(m.right - m.box.right)) + SAFETY_PAD;
    const idealCenter = (slotWidth - m.box.width) / 2;
    const maxMargin = Math.max(leftGap, slotWidth - m.box.width - rightGap);
    const marginLeft = Math.min(Math.max(idealCenter, leftGap), maxMargin);
    wrap.style.marginLeft = marginLeft + 'px';

    return scale;
  }

  const processed = [];
  printArea.querySelectorAll('.diagram-slot').forEach(slot=>{
    // margin-left сбрасываем ДО проверки на wrap - иначе у пустого слота
    // (напр. «Общий вид ящика» у типа II-1, где фото ещё нет - см.
    // buildPrintHtml в src/ii1/calc.js) остаётся CSS-отступ по умолчанию
    // (#printArea .diagram-slot{margin-left:calc(var(--pk)*44px)}), а у
    // остальных слотов (где wrap есть) он явно обнулён ниже - из-за этого
    // левый край таблицы сразу после ТАКОГО слота (напр. сводная таблица
    // «Внутренние размеры груза»/«Итог») не совпадал с левым краем таблиц
    // деталей у остальных узлов, и вдобавок разъезжался на разную величину
    // от расчёта к расчёту (отступ масштабируется через --pk) - по репорту
    // пользователя.
    slot.style.marginLeft = '0px';
    const wrap = slot.querySelector('.diagram-wrap');
    if(!wrap) return;
    const scale = processSlot(slot, wrap, null);
    processed.push({slot, wrap, scale});
  });

  reserveScaleGroups(processed, processSlot);
}

// Экранный аналог reserveDiagramOverflow() выше. На экране .spec-row-diagram
// выровнен по верху (align-items:flex-start), а не по центру, как в печати -
// там паддинг сверху/снизу у .diagram-slot реально сдвигает его границы,
// здесь же для этого нужно двигать сам .diagram-wrap отступами: margin-top/
// margin-bottom сдвигают вниз всё содержимое (картинку+подписи+стрелки) внутри
// слота, освобождая место над ним (для заголовка узла) и под ним (для
// следующего узла), не трогая позицию самого слота в строке. Слева -
// аналогично margin-left. Справа же сосед - таблица деталей: её двигать нельзя
// (раньше так и было сделано - расширялся слот, но это раздвигало таблицу),
// поэтому вместо этого сам чертёж (картинка + SVG-стрелки + подписи, через
// --dk) пропорционально уменьшается, пока не впишется в фиксированную ширину
// слота.
const DIAGRAM_SLOT_BUDGET = 300; // соответствует .diagram-slot{width:300px}
// data-size-group на .diagram-slot (проставляется в HTML, см. напр. calc-ii1.js
// типа II-1 у Щита торцевого/бокового) - чертежи одной группы должны
// получаться одинакового итогового размера. Собственный вылет подписей за
// рамку у КАЖДОГО чертежа свой (у одного заметный, у другого почти нулевой),
// поэтому естественный (без синхронизации) масштаб --dk у них может сильно
// отличаться - тогда парные чертежи получались заметно разного размера,
// хотя должны выглядеть одинаково - по репорту пользователя со скриншотом.
// reserveScaleGroups() ниже выравнивает это ПОСЛЕ основного прохода: все
// чертежи группы приводятся к МЕНЬШЕМУ из естественных масштабов участников.
function reserveScaleGroups(processed, applyScale){
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
      if(m.scale > minScale + 1e-6){
        applyScale(m.slot, m.wrap, minScale);
      }
    });
  });
}

function reserveDiagramOverflowScreen(container){
  function processSlot(slot, wrap, forcedScale){
    const baseWidth = parseFloat(wrap.dataset.baseWidth) || parseFloat(getComputedStyle(wrap).width) || 260;

    function measure(){
      const box = wrap.getBoundingClientRect();
      let top = box.top, bottom = box.bottom, left = box.left, right = box.right;

      slot.querySelectorAll('.diagram-label').forEach(lbl=>{
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
        }catch(e){ /* getBBox недоступен — останутся отступы по подписям */ }
      }
      return {box, top, bottom, left, right};
    }

    // Сброс перед замером (иначе накапливаются отступы/масштаб предыдущего расчёта).
    wrap.style.marginTop = '0px';
    wrap.style.marginBottom = '0px';
    wrap.style.marginLeft = '0px';
    wrap.style.width = baseWidth + 'px';
    wrap.style.setProperty('--dk', '1');
    slot.style.width = '';
    slot.style.flexBasis = '';

    // Бюджет ширины - РЕАЛЬНАЯ ширина слота, а не жёсткая DIAGRAM_SLOT_BUDGET
    // (соответствует .diagram-slot{width:300px} только на десктопе). На узких
    // экранах (см. #boardTables .diagram-slot{width:100%!important} в
    // style.css, ≤700px) слот сжимается вместе с картой и может оказаться
    // заметно у́же 300px - при фиксированном бюджете чертёж считал, что места
    // больше, чем есть на самом деле, и подписи/стрелки вылезали за пределы
    // экрана целиком, а не только за пределы своего слота - по репорту
    // пользователя.
    const slotBudget = slot.getBoundingClientRect().width || DIAGRAM_SLOT_BUDGET;

    // SAFETY_PAD - небольшой запас (не только впритык до края слота), иначе
    // при вылете подписи почти на весь бюджет слота (напр. «Щит торцевой»
    // схема «3 укосины» типа II-1 - у неё рамка щита на фото занимает
    // самую большую долю кадра из всех присланных фото, поэтому те же
    // ДОЛИ отступа дают самый большой вылет в пикселях) отступ получался
    // ровно впритык (0-1px до края слота) - формально не налезает на
    // таблицу справа, но подпись слева визуально "выходит за пределы" -
    // по репорту пользователя.
    const SAFETY_PAD = 6;

    // Масштаб подбираем ПО ОБОИМ вылетам (левому и правому) СРАЗУ, замеряя
    // их заново на каждой итерации (margin-left временно обнуляется перед
    // замером) - а не резервируя левый вылет один раз при полном масштабе,
    // как было раньше. При жёстко зарезервированном (не пересчитываемом)
    // левом отступе на узком слоте (см. slotBudget выше) уменьшение самого
    // чертежа не уменьшало фактически занятое место - отступ, посчитанный
    // ДО сжатия, оставался прежним, и правый край подписи (напр. у «Крышки»)
    // всё равно вылезал за пределы экрана - по репорту пользователя. Здесь
    // же оба вылета пересчитываются на каждой итерации и уменьшаются вместе
    // с масштабом (позиции подписей заданы в процентах от ширины чертежа).
    // forcedScale (см. reserveScaleGroups выше) пропускает этот поиск и сразу
    // применяет заданный извне масштаб - используется вторым проходом, когда
    // парный чертёж (data-size-group) требует более сильного сжатия, чем
    // нашлось бы для этого чертежа самостоятельно.
    let scale = 1;
    if(forcedScale != null){
      scale = forcedScale;
      wrap.style.width = Math.round(baseWidth * scale) + 'px';
      wrap.style.setProperty('--dk', scale.toFixed(3));
    } else {
      for(let i = 0; i < 8; i++){
        wrap.style.marginLeft = '0px';
        const m = measure();
        const leftOverflow = Math.max(0, Math.ceil(m.box.left - m.left)) + SAFETY_PAD;
        const rightOverflow = Math.max(0, Math.ceil(m.right - m.box.right)) + SAFETY_PAD;
        const usedWidth = leftOverflow + m.box.width + rightOverflow;
        if(usedWidth <= slotBudget || scale <= 0.3) break;
        scale = Math.max(0.3, scale * (slotBudget - 4) / (m.box.width + leftOverflow + rightOverflow));
        wrap.style.width = Math.round(baseWidth * scale) + 'px';
        wrap.style.setProperty('--dk', scale.toFixed(3));
      }
    }

    wrap.style.marginLeft = '0px';
    const m = measure();
    const topGap = Math.max(0, Math.ceil(m.box.top - m.top));
    const bottomGap = Math.max(0, Math.ceil(m.bottom - m.box.bottom));
    const leftGap = Math.max(0, Math.ceil(m.box.left - m.left)) + SAFETY_PAD;
    const rightGap = Math.max(0, Math.ceil(m.right - m.box.right)) + SAFETY_PAD;

    // Центрируем САМУ КАРТИНКУ (а не весь охват вместе с вылетающими подписями)
    // в слоте. Центрирование охвата целиком (первая версия этой правки) не
    // подошло: вылет подписей у разных узлов разный и часто несимметричный
    // (слева/справа), и при выравнивании охвата по центру сама картинка всё
    // равно оказывалась на разной высоте от центра слота у разных узлов -
    // "лесенка" пропадала не полностью, а при других размерах ящика (когда
    // пропорция вылета меняется) могла проявиться снова. Целимся ровно в
    // центр слота для самой картинки, но не ближе, чем позволяют вылет слева
    // (leftGap) и вылет справа (rightGap, чтобы не наехать на таблицу) - если
    // картинка узкая, а вылет большой и несимметричный, эти границы важнее
    // идеальной центровки.
    const idealCenter = (slotBudget - m.box.width) / 2;
    const maxMargin = Math.max(leftGap, slotBudget - m.box.width - rightGap);
    const marginLeft = Math.min(Math.max(idealCenter, leftGap), maxMargin);

    wrap.style.marginTop = topGap + 'px';
    wrap.style.marginBottom = bottomGap + 'px';
    wrap.style.marginLeft = marginLeft + 'px';

    return scale;
  }

  const processed = [];
  container.querySelectorAll('.diagram-slot').forEach(slot=>{
    const wrap = slot.querySelector('.diagram-wrap');
    if(!wrap) return;
    const scale = processSlot(slot, wrap, null);
    processed.push({slot, wrap, scale});
  });

  reserveScaleGroups(processed, processSlot);
}

// Подгонка под ровно один лист А4: сначала заполняем свободную высоту
// отступами, при переполнении — пропорционально уменьшаем.
function fitPrintAreaToOnePage(printArea){
  const contentW = (PRINT_PAGE.wMM - 2*PRINT_PAGE.marginMM) * PRINT_PAGE.pxPerMM; // ~733px
  const contentH = (PRINT_PAGE.hMM - 2*PRINT_PAGE.marginMM) * PRINT_PAGE.pxPerMM; // ~1062px

  const scaleBox = document.getElementById('printScale');

  // Ширина фиксируется ДО замеров: раньше вылеты подписей измерялись, пока
  // блок ещё не был ограничен по ширине, и отступы получались от балды.
  printArea.style.width  = contentW + 'px';
  printArea.style.height = '';
  scaleBox.style.transform = 'none';
  scaleBox.style.width = contentW + 'px';

  // Подбираем единый множитель размеров --pk: он меняет шрифты, отступы,
  // чертежи и подписи ОДНОВРЕМЕННО, поэтому вёрстка остаётся пропорциональной.
  // Это надёжнее, чем transform: при уменьшении контент по-прежнему занимает
  // всю ширину листа (таблица забирает освободившееся место), а не жмётся
  // в левый верхний угол, оставляя пустыми правый и нижний край.
  // Годится ли данный множитель: и по высоте листа, и по ширине —
  // ни одна ячейка таблицы не должна обрезаться (перенос запрещён,
  // поэтому переполнение видно по scrollWidth).
  const fits = pk => {
    scaleBox.style.setProperty('--pk', pk);
    applyDiagramWidths(scaleBox, pk);
    reserveDiagramOverflow(scaleBox);
    if(scaleBox.scrollHeight > contentH * 0.97) return false; // запас на расхождения между замером и реальной печатью
    if(scaleBox.scrollWidth  > contentW + 1) return false;
    const cells = scaleBox.querySelectorAll('.spec-table th, .spec-table td');
    for(const cell of cells){
      if(cell.scrollWidth > cell.clientWidth + 1) return false;
    }
    return true;
  };

  // Нижняя граница — намеренно очень маленькая: лист А4 не должен переполняться
  // никогда, даже при экстремально большом содержимом (длинный комментарий +
  // сложный расчёт), пусть даже ценой мелкого шрифта. Раньше нижняя граница 0.5
  // иногда не давала ужаться настолько, сколько нужно, и лишнее уезжало на
  // второй, почти пустой лист.
  let lo = 0.05, hi = 1.6, best = lo;
  if(fits(hi)){
    best = hi;                       // помещается даже по максимуму
  } else if(!fits(lo)){
    best = lo;                       // не помещается даже по минимуму - берём как есть
  } else {
    for(let i = 0; i < 16; i++){     // двоичный поиск наибольшего влезающего
      const mid = (lo + hi) / 2;
      if(fits(mid)){ best = mid; lo = mid; } else { hi = mid; }
    }
  }
  fits(best);

  // Остаток высоты раздаём как отступы между секциями, чтобы лист был
  // заполнен, а не обрывался на середине. Заполняем только до того же
  // бюджета contentH*0.97, что и в fits() выше, — иначе этот шаг съедает
  // запас, оставленный на расхождения между замером и реальной печатью,
  // и лист начинает переполняться на реальной печати (уходит на 2-й лист),
  // даже когда на измерение в браузере всё ещё «влезало».
  const sections = Array.from(scaleBox.querySelectorAll('.print-section'));
  sections.forEach(s=>{ s.style.marginTop = '0px'; });
  const safeContentH = contentH * 0.97;
  const slack = safeContentH - scaleBox.scrollHeight;
  if(sections.length && slack > 0){
    const per = Math.floor((slack / sections.length) * 0.97);
    sections.forEach(s=>{ s.style.marginTop = per + 'px'; });
    if(scaleBox.scrollHeight > safeContentH){
      const fix = Math.max(0, per - Math.ceil((scaleBox.scrollHeight - safeContentH) / sections.length) - 1);
      sections.forEach(s=>{ s.style.marginTop = fix + 'px'; });
    }
  }
}

// Ширина каждого чертежа = его экранная ширина × базовый коэффициент × --pk.
function applyDiagramWidths(scaleBox, pk){
  scaleBox.querySelectorAll('.diagram-wrap').forEach(wrap=>{
    const base = parseFloat(wrap.dataset.baseWidth) || 260;
    wrap.style.width = (base * PRINT_DIAGRAM_FACTOR * pk) + 'px';
    wrap.style.flexBasis = 'auto';
  });
}

// Масштаб/отступы чертежей (reserveDiagramOverflowScreen выше) подбираются
// один раз, сразу после calculate() - при живом изменении размера уже
// открытой страницы (сузили окно браузера, не перезагружая её) они
// оставались прежними, подобранными под старую ширину слота, и снова
// вылезали за его пределы - по репорту пользователя ("при сужении экрана
// ничего не перестраивается"). Сама таблица ИТОГ и #tooNarrow сделаны на
// чистом CSS (grid/media query) и реагируют на resize без JS - здесь
// пересчёта требуют только чертежи. offsetParent === null - пропускаем
// пересчёт, если #boardTables сейчас не отображается (например, .wrap
// скрыт в print-режиме или им уже подменён #tooNarrow) - там
// getBoundingClientRect() дал бы нулевые размеры и испортил масштаб.
let _resizeReflowTimer = null;
window.addEventListener('resize', ()=>{
  clearTimeout(_resizeReflowTimer);
  _resizeReflowTimer = setTimeout(()=>{
    const boardTablesEl = document.getElementById('boardTables');
    if(boardTablesEl && boardTablesEl.children.length && boardTablesEl.offsetParent !== null){
      reserveDiagramOverflowScreen(boardTablesEl);
    }
  }, 150);
});
