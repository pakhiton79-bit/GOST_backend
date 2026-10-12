// Микроанимации страниц расчёта (по указанию пользователя; стили - раздел
// «Микроанимации» в style.css). Сам расчёт и разметку не меняют: вызываются
// из calculate() (common-calc-state.js) и beginPrintJob()/endPrintJob()
// (common-print.js), если файл подключён.
//  1. Кнопка «Рассчитать»: точки, пока идёт расчёт, затем зелёная «Готово».
//  2. Числа блока «Итог» досчитываются от прежних значений к новым.
//  3. Изменившиеся после пересчёта ячейки таблиц деталей коротко подсвечиваются.
//  4. Размерные линии чертежей прорисовываются, когда чертёж виден на экране.
//  7. Новое предупреждение выезжает сверху, значок ⚠ покачивается.
// 12. Полоса под кнопками «Печать»/«Скачать PDF» - по этапам подготовки листа.
// Галочки (6) и окна (8) - только CSS, переключатель версий (5) - в
// common-version-switch.js. При «уменьшить движение» в системе ничего не
// анимируется.
const motionOn = () => !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
let motionSnap = null, motionDotsTimer = null, motionDoneTimer = null, motionDrawObserver = null;
const motionCounters = new Map();

// Кнопка «Рассчитать»: три слоя в одной ячейке сетки (ширина кнопки - по
// самому широкому, ряд кнопок не прыгает).
(function(){
  const btn = document.getElementById('calcBtn');
  if(!btn) return;
  const text = btn.textContent.trim();
  btn.classList.add('motion-btn');
  btn.innerHTML = `<span class="cb-face cb-label">${text}</span>`
    + '<span class="cb-face cb-dots" aria-hidden="true"><i></i><i></i><i></i></span>'
    + '<span class="cb-face cb-done" aria-hidden="true"><svg viewBox="0 0 20 20" width="16" height="16"><path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>Готово</span>';
})();

function motionCellKey(td){
  const tr = td.closest('tr'), table = td.closest('table');
  return `${table ? table.dataset.section : ''}|${tr ? tr.dataset.rowKey : ''}|${td.dataset.role}`;
}

function motionCalcStart(){
  motionFinishAll();
  const btn = document.getElementById('calcBtn');
  clearTimeout(motionDoneTimer);
  if(btn) btn.classList.remove('is-done');
  // Точки - только если расчёт дольше мгновения (на сервере), иначе мелькали бы.
  clearTimeout(motionDotsTimer);
  if(btn && motionOn()) motionDotsTimer = setTimeout(() => btn.classList.add('is-loading'), 150);
  const values = {};
  document.querySelectorAll('#results .summary .value[id]').forEach(el => { values[el.id] = el.firstChild ? el.firstChild.textContent : ''; });
  const cells = new Map();
  document.querySelectorAll('#boardTables td[data-role]').forEach(td => cells.set(motionCellKey(td), td.textContent.trim()));
  const warn = document.getElementById('warningsTop');
  motionSnap = { values, cells, warn: warn && warn.style.display !== 'none' ? warn.textContent : '' };
}

function motionCalcEnd(ok){
  const btn = document.getElementById('calcBtn');
  clearTimeout(motionDotsTimer);
  if(btn) btn.classList.remove('is-loading');
  const snap = motionSnap;
  motionSnap = null;
  if(!ok || !snap || !motionOn()) return;
  if(btn){
    btn.classList.add('is-done');
    motionDoneTimer = setTimeout(() => btn.classList.remove('is-done'), 1400);
  }
  document.querySelectorAll('#results .summary .value[id]').forEach(el => motionCount(el, snap.values[el.id] || ''));
  if(snap.cells.size){
    document.querySelectorAll('#boardTables td[data-role]').forEach(td => {
      if(snap.cells.get(motionCellKey(td)) === td.textContent.trim()) return;
      td.classList.remove('motion-flash');
      void td.offsetWidth;
      td.classList.add('motion-flash');
      td.addEventListener('animationend', () => td.classList.remove('motion-flash'), { once: true });
    });
  }
  motionWatchDiagrams();
  const warn = document.getElementById('warningsTop');
  if(warn && warn.style.display !== 'none' && warn.textContent.trim() && warn.textContent !== snap.warn) motionWarn(warn);
}

// Число (с дробной частью через точку или запятую) - как в новом тексте.
const MOTION_NUM = /\d+(?:[.,]\d+)?/g;
function motionCount(el, oldText){
  const node = el.firstChild;
  if(!node || node.nodeType !== 3) return;
  const target = node.textContent;
  if(target === oldText) return;
  const to = target.match(MOTION_NUM);
  if(!to) return;
  const fromM = oldText.match(MOTION_NUM);
  const from = fromM && fromM.length === to.length ? fromM.map(s => parseFloat(s.replace(',', '.'))) : to.map(() => 0);
  const fmt = to.map(s => { const m = s.match(/[.,](\d+)$/); return { sep: m ? s[s.length - m[1].length - 1] : '', dec: m ? m[1].length : 0 }; });
  const end = to.map(s => parseFloat(s.replace(',', '.')));
  const t0 = performance.now(), dur = 600;
  const job = { node, target, last: null };
  motionCounters.set(el, job);
  const step = now => {
    if(motionCounters.get(el) !== job) return;
    // Текст сменили не мы (правка таблицы и т.п.) - больше не трогаем.
    if(job.last !== null && node.textContent !== job.last){ motionCounters.delete(el); return; }
    const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
    if(p >= 1){ node.textContent = target; motionCounters.delete(el); return; }
    let i = 0;
    job.last = target.replace(MOTION_NUM, () => {
      const v = from[i] + (end[i] - from[i]) * e, f = fmt[i++];
      return f.dec ? v.toFixed(f.dec).replace('.', f.sep) : String(Math.round(v));
    });
    node.textContent = job.last;
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Размерные линии: прорисовка запускается, когда чертёж появляется на экране.
function motionWatchDiagrams(){
  if(motionDrawObserver) motionDrawObserver.disconnect();
  const wraps = document.querySelectorAll('#boardTables .diagram-wrap:not(.diagram-placeholder)');
  if(!wraps.length || !window.IntersectionObserver) return;
  motionDrawObserver = new IntersectionObserver(entries => entries.forEach(en => {
    if(!en.isIntersecting) return;
    motionDrawObserver.unobserve(en.target);
    const wrap = en.target;
    wrap.querySelectorAll('.diagram-arrows line').forEach(l => l.setAttribute('pathLength', '1'));
    wrap.classList.add('motion-draw');
    setTimeout(() => motionUndraw(wrap), 1300);
  }));
  wraps.forEach(w => motionDrawObserver.observe(w));
}
function motionUndraw(wrap){
  wrap.classList.remove('motion-draw');
  wrap.querySelectorAll('.diagram-arrows line[pathLength]').forEach(l => l.removeAttribute('pathLength'));
}

function motionWarn(warn){
  warn.querySelectorAll(':scope > div').forEach(d => {
    const t = d.firstChild;
    if(!t || t.nodeType !== 3 || !t.textContent.startsWith('⚠')) return;
    t.textContent = t.textContent.slice(1);
    const ico = document.createElement('span');
    ico.className = 'motion-warn-ico';
    ico.textContent = '⚠';
    d.insertBefore(ico, t);
  });
  warn.classList.remove('motion-warn');
  void warn.offsetWidth;
  warn.classList.add('motion-warn');
  warn.addEventListener('animationend', e => { if(e.target === warn) warn.classList.remove('motion-warn'); });
}

// Перед печатью всё досчитывается сразу: печатный лист берёт числа итога
// с экрана.
function motionFinishAll(){
  motionCounters.forEach(job => { job.node.textContent = job.target; });
  motionCounters.clear();
  if(motionDrawObserver) motionDrawObserver.disconnect();
  document.querySelectorAll('#boardTables .motion-draw').forEach(motionUndraw);
}
window.addEventListener('beforeprint', motionFinishAll);

// Полоса подготовки листа под кнопками «Печать» / «Скачать PDF».
let motionPrintTimer = null;
function motionPrintBar(){
  const box = document.querySelector('.print-actions');
  if(!box) return null;
  let bar = box.querySelector('.print-progress');
  if(!bar){
    bar = document.createElement('span');
    bar.className = 'print-progress';
    bar.setAttribute('aria-hidden', 'true');
    bar.innerHTML = '<span></span>';
    box.appendChild(bar);
  }
  return bar;
}
function motionPrintStart(){
  motionFinishAll();
  const bar = motionOn() && motionPrintBar();
  if(!bar) return;
  clearTimeout(motionPrintTimer);
  bar.className = 'print-progress';
  const fill = bar.firstChild;
  fill.style.transition = 'none';
  fill.style.transform = 'scaleX(0)';
  void bar.offsetWidth;
  bar.classList.add('run');
}
// Этап подготовки пройден: полоса - на долю p (0..1) по факту. crawlMs - у
// долгого этапа без своего прогресса (съёмка листа для PDF): полоса за это
// время медленно ползёт к p, не доходя до следующей отметки раньше времени.
// Промис - после отрисовки кадра, чтобы полоса успела сдвинуться до
// следующего тяжёлого шага.
function motionPrintStep(p, crawlMs){
  const bar = document.querySelector('.print-actions .print-progress.run');
  if(!bar) return Promise.resolve();
  const fill = bar.firstChild;
  fill.style.transition = crawlMs ? `transform ${crawlMs}ms cubic-bezier(.1,.6,.3,1)` : 'transform .25s ease';
  fill.style.transform = `scaleX(${p})`;
  return new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
}
function motionPrintEnd(){
  const bar = document.querySelector('.print-actions .print-progress.run');
  if(!bar) return;
  motionPrintStep(1);
  bar.classList.add('done');
  motionPrintTimer = setTimeout(() => { bar.className = 'print-progress'; }, 700);
}

// Галочки: при нажатии квадрат «пружинит», галочка прорисовывается (класс
// только на время анимации - при загрузке страницы ничего не дёргается).
document.addEventListener('change', e => {
  const t = e.target;
  if(!t.matches || !t.matches('input[type="checkbox"]') || !t.checked || !motionOn()) return;
  t.classList.remove('motion-chk');
  void t.offsetWidth;
  t.classList.add('motion-chk');
  t.addEventListener('animationend', () => t.classList.remove('motion-chk'), { once: true });
});
