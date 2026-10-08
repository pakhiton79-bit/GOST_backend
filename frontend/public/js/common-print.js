/* ===================== МЕХАНИКА ПЕЧАТИ =====================

   Печатаем в этом же окне (без всплывающих окон - они подвешивали вкладку).
   Содержимое собирается в #printArea, который всегда отрисован реальными
   размерами (просто сдвинут за экран), поэтому его высоту можно честно
   измерить ДО печати.

   Почему лист раньше заполнялся наполовину и почему просто «увеличить шрифт»
   не помогало:
     • ширина листа - жёсткий лимит (733 px), а чертёж и таблица стоят в ряд;
       если раздуть шрифт/чертёж, таблице перестаёт хватать ширины и её
       содержимое начинает переноситься и наезжать;
     • по высоте же оставалось ~половина листа пустой, и это никак не
       использовалось.
   Поэтому:
     1) размеры подобраны под бюджет ширины (см. CSS выше) - это максимум,
        который влезает без переносов;
     2) чертежи увеличиваются на PRINT_DIAGRAM_FACTOR (насколько позволяет
        та же ширина);
     3) остаток высоты листа измеряется и равномерно распределяется между
        секциями - за счёт этого лист заполняется целиком;
     4) если содержимое всё же переросло лист (крупный расчёт, длинные
        названия) - включается пропорциональное уменьшение, чтобы второй,
        пустой лист не появился никогда.
*/
// Здесь: сборка листа (#printArea), подгонка под 1 лист А4, «Печать» и
// «Скачать PDF». Подгонка самих чертежей под слот - common-diagram-fit.js,
// статусы расчёта и отказы - common-calc-state.js.
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
// fitDiagramsForPrint в common-diagram-fit.js) - за счёт этого освобождается ширина под таблицы,
// и их шрифт удаётся поднять до 20px.
const PRINT_DIAGRAM_FACTOR = 0.885;


// Печать/PDF разрешены, если на экране есть результаты расчёта - даже если
// после него меняли таблицу или параметры и не нажимали «Рассчитать» (по
// указанию пользователя): печатается то, что на экране, без пересчёта и
// без пометок. Нельзя только во время расчёта и когда результатов нет
// (ещё не считали либо расчёт заблокирован ошибкой - блок #results скрыт).
// Возвращает true, если можно печатать.
function printAllowed(){
  if(printInProgress) return false; // уже готовится - повторное нажатие просто игнорируется
  if(calcInProgress){
    // Во время расчёта - не отказ (статус остаётся «Идёт расчёт…», без
    // красного «Расчёт не проведён» - по указанию пользователя), а только
    // короткая нейтральная подсказка под кнопками.
    showCalcHint('Дождитесь окончания расчёта.');
    return false;
  }
  const results = document.getElementById('results');
  if(!results || results.style.display !== 'block'){
    refuseAction('Печать недоступна: нет результатов расчёта - сначала нажмите «Рассчитать».');
    return false;
  }
  return true;
}
// Ожидание загрузки картинок печатной области - не дольше 3 с (иначе
// зависшее ожидание копило нажатия, см. выше).
function waitImagesReady(scaleBox){
  const images = Array.from(scaleBox.querySelectorAll('img'));
  const ready = Promise.all(images.map(img => img.decode ? img.decode().catch(()=>{}) : Promise.resolve()));
  return Promise.race([ready, new Promise(r => setTimeout(r, 3000))]);
}
// Индикатор подготовки печати/PDF (по указанию пользователя - как «Идёт
// расчёт…»): статус 'printing' («Подготовка к печати…») или 'pdf'
// («Создание PDF-файла…») со спиннером; кнопка «Рассчитать» на это время
// недоступна. По окончании возвращается прежний статус (если за это время
// его не сменили - напр. правкой параметров).
function beginPrintJob(kind){
  printInProgress = true;
  const prev = currentCalcStatus();
  const btn = document.getElementById('calcBtn');
  if(btn) btn.disabled = true;
  setCalcStatus(kind);
  // Кадр отрисовки - чтобы индикатор показался до тяжёлой сборки листа.
  return new Promise(r => requestAnimationFrame(() => setTimeout(() => r(prev), 0)));
}
function endPrintJob(kind, prev){
  printInProgress = false;
  const btn = document.getElementById('calcBtn');
  if(btn) btn.disabled = calcInProgress;
  if(currentCalcStatus() === kind) setCalcStatus(prev);
}
// Номер/название ящика (поле #boxName справа от заголовка) - в печать/PDF
// справа от заголовка; пустое - ничего не выводится.
function boxNameHtml(){
  const el = document.getElementById('boxName');
  const v = el ? el.value.trim() : '';
  return v ? `<span class="print-box-name">${escapeAttr(v)}</span>` : '';
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

  // Узлы с чертежами - сеткой в две колонки, чертёж над таблицей (по
  // указанию пользователя: так чертежи крупнее). Секции без чертежа (лента,
  // болты) и комментарий остаются под сеткой на всю ширину листа.
  const nodeSections = Array.from(scaleBox.querySelectorAll(':scope > .print-section'))
    .filter(s => s.querySelector('.spec-row-diagram'));
  if(nodeSections.length){
    const grid = document.createElement('div');
    grid.className = 'print-grid';
    nodeSections[0].before(grid);
    nodeSections.forEach(s => grid.appendChild(s));
  }
}

function printBox(){
  if(!printAllowed()) return;
  // Важно: сразу после innerHTML браузер мог ещё не декодировать вставленные
  // <img> (чертежи, общий вид ящика, водяной знак) - их scrollHeight в этот
  // момент может быть занижен. Раньше это скрывалось запасом по высоте;
  // как только запас исчез (например, из-за добавленного комментария),
  // страница начала не помещаться на печати, хотя при замере «влезала».
  // Поэтому ждём decode() всех картинок и только потом меряем и подгоняем.
  let prev = null;
  beginPrintJob('printing').then(p=>{
    prev = p;
    buildAndSizePrintArea();
    return waitImagesReady(document.getElementById('printScale'));
  }).then(()=>{
    fitPrintAreaToOnePage(document.getElementById('printArea'));
    window.print();
  }).finally(()=>{ endPrintJob('printing', prev); });
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
// на чертежах нарочно вынесены ЗА пределы viewBox (см. common-diagram-fit.js), на экране/при обычной печати это держится на
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
  if(!printAllowed()) return;
  if(!window.html2canvas || !(window.jspdf && window.jspdf.jsPDF)){
    refuseAction('Не удалось подготовить PDF. Обновите страницу или воспользуйтесь кнопкой «Печать» (в диалоге печати можно сохранить как PDF).');
    return;
  }
  let prev = null;
  beginPrintJob('pdf').then(p=>{
    prev = p;
    buildAndSizePrintArea();
    return waitImagesReady(document.getElementById('printScale'));
  }).then(()=>{
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
    refuseAction('Не удалось создать PDF-файл. Попробуйте ещё раз или воспользуйтесь кнопкой «Печать» (в диалоге печати можно сохранить как PDF).');
  }).finally(() => { endPrintJob('pdf', prev); });
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

// Подгонка под ровно один лист А4: сначала заполняем свободную высоту
// отступами, при переполнении - пропорционально уменьшаем.
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
  // Годится ли данный множитель: и по высоте листа, и по ширине -
  // ни одна ячейка таблицы не должна обрезаться (перенос запрещён,
  // поэтому переполнение видно по scrollWidth).
  const fits = pk => {
    scaleBox.style.setProperty('--pk', pk);
    applyDiagramWidths(scaleBox, pk);
    fitDiagramsForPrint(scaleBox);
    if(scaleBox.scrollHeight > contentH * 0.97) return false; // запас на расхождения между замером и реальной печатью
    if(scaleBox.scrollWidth  > contentW + 1) return false;
    const cells = scaleBox.querySelectorAll('.spec-table th, .spec-table td');
    for(const cell of cells){
      if(cell.scrollWidth > cell.clientWidth + 1) return false;
    }
    return true;
  };

  // Нижняя граница - намеренно очень маленькая: лист А4 не должен переполняться
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
  // бюджета contentH*0.97, что и в fits() выше, - иначе этот шаг съедает
  // запас, оставленный на расхождения между замером и реальной печатью,
  // и лист начинает переполняться на реальной печати (уходит на 2-й лист),
  // даже когда на измерение в браузере всё ещё «влезало».
  // Секции одной строки сетки получают одинаковый отступ, поэтому остаток
  // делится на число строк, а не секций.
  const sections = Array.from(scaleBox.querySelectorAll('.print-section'));
  sections.forEach(s=>{ s.style.marginTop = '0px'; });
  const rows = new Set(sections.map(s => Math.round(s.getBoundingClientRect().top))).size;
  const safeContentH = contentH * 0.97;
  const slack = safeContentH - scaleBox.scrollHeight;
  if(rows && slack > 0){
    const per = Math.floor((slack / rows) * 0.97);
    sections.forEach(s=>{ s.style.marginTop = per + 'px'; });
    if(scaleBox.scrollHeight > safeContentH){
      const fix = Math.max(0, per - Math.ceil((scaleBox.scrollHeight - safeContentH) / rows) - 1);
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
