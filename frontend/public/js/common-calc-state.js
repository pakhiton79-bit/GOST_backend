// Состояние расчёта (общее для всех типов): статусы рядом с кнопками
// («Расчёт выполнен» / «Нажмите «Рассчитать»» / «Расчёт не проведён» /
// индикаторы), отказы и подсказки в #err, кнопка «Рассчитать» (calculate()),
// устаревание результата при изменении параметров, подсветка поля с
// ошибкой, предупреждение о ручных правках и их сброс.
// Печать и PDF - common-print.js, правки таблицы деталей -
// common-table-edits.js, подгонка чертежей - common-diagram-fit.js.

// Три взаимоисключающих статуса расчёта рядом с кнопками «Рассчитать»/
// «Печать» (#calcCheck/#calcOutdated/#calcError в разметке, см. calc-status
// в style.css) - .active переключает видимость (visibility, не display,
// чтобы ширина обёртки не менялась - см. .calc-status в style.css).
// state: 'check' (успешно посчитано), 'outdated' (результаты на экране
// устарели - вход поменялся после расчёта), 'error' (расчёт заблокирован -
// сервер вернул calc.error, или не удалось связаться с сервером) или
// null/любое другое значение - все три скрыты (до первого расчёта, либо
// только что открытая пустая форма).
const CALC_STATUS_IDS = {check:'calcCheck', outdated:'calcOutdated', error:'calcError', loading:'calcLoading', printing:'calcPrinting', pdf:'calcPdf'};
function setCalcStatus(state){
  Object.keys(CALC_STATUS_IDS).forEach(key=>{
    const el = document.getElementById(CALC_STATUS_IDS[key]);
    if(el) el.classList.toggle('active', key === state);
  });
}
// Текущий статус (ключ CALC_STATUS_IDS) или null.
function currentCalcStatus(){
  for(const k of Object.keys(CALC_STATUS_IDS)){ const el = document.getElementById(CALC_STATUS_IDS[k]); if(el && el.classList.contains('active')) return k; }
  return null;
}

// ============ Расчёт / печать: состояние и отказы ============
// По указанию пользователя: если действие блокируется (печать/PDF без
// актуального расчёта, во время расчёта, после ошибки) - ВСЕГДА красный
// статус «Расчёт не проведён» и красный текст причины (#err), а не окно
// браузера alert(). calcInProgress/printInProgress - защита от повторных
// нажатий: раньше каждое нажатие «Печать»/«Скачать PDF» ставило в очередь
// своё ожидание загрузки картинок, и потом открывалось сразу несколько
// окон печати, а печать во время расчёта ломала вёрстку (по репорту
// пользователя).
let calcInProgress = false;
let printInProgress = false;
let lastRefusalText = '';
function refuseAction(reason){
  clearCalcHint();
  setCalcStatus('error');
  const errEl = document.getElementById('err');
  if(errEl) errEl.textContent = reason;
  lastRefusalText = reason;
  // Отказ во время расчёта (напр. «Печать» до ответа сервера) - красный
  // статус виден 1.5 с, затем снова «Идёт расчёт…», если расчёт ещё идёт.
  if(calcInProgress){
    setTimeout(()=>{
      const errSt = document.getElementById('calcError');
      if(calcInProgress && errSt && errSt.classList.contains('active')) setCalcStatus('loading');
    }, 1500);
  }
}
// Нейтральная (не красная) подсказка в #err - на 2.5 с, статус не меняет.
let calcHintTimer = null;
function showCalcHint(text){
  const errEl = document.getElementById('err');
  if(!errEl) return;
  errEl.textContent = text;
  errEl.dataset.hintText = text;
  errEl.classList.add('hint');
  clearTimeout(calcHintTimer);
  calcHintTimer = setTimeout(clearCalcHint, 2500);
}
function clearCalcHint(){
  const errEl = document.getElementById('err');
  clearTimeout(calcHintTimer);
  if(!errEl || !errEl.classList.contains('hint')) return;
  errEl.classList.remove('hint');
  // текст стираем, только если это всё ещё сама подсказка (а не ошибка
  // расчёта, успевшая её заменить)
  if(errEl.textContent === errEl.dataset.hintText) errEl.textContent = '';
}
// Снимок входных данных последнего успешного расчёта (по указанию
// пользователя): если параметр изменили, а потом вернули как было, -
// подсказка «Нажмите «Рассчитать»» снимается и снова показывается
// «Расчёт выполнен». Сравниваются сами входные данные расчёта
// (buildCalcInput() каждого типа) плюс правки таблиц, толщины «в наличии» и
// настройки нормы времени - без пересчёта и без запросов к серверу.
let calcStateSnapshot = null;
// То же для расчёта, заблокированного ошибкой: параметры и текст причины (по
// замечанию пользователя: после блокировки событие изменения поля - напр. при
// уходе фокуса из поля, куда уже ввели значение, - меняло «Расчёт не проведён»
// на жёлтое «Нажмите «Рассчитать»», а красная причина оставалась).
let calcErrorSnapshot = null;
// Нажимали ли «Рассчитать» хоть раз с открытия страницы (см. markCalcChanged).
let calcEverRun = false;
function calcStateSignature(){
  if(typeof buildCalcInput !== 'function') return null;
  try{
    const input = buildCalcInput();
    // I-1: без галочек «Настроить число поясов / расстояние» значение
    // ползунка в расчёт не идёт - не сравниваем его.
    if(input && !input.plankLayoutMode && 'plankLayoutValue' in input) input.plankLayoutValue = null;
    // Правки таблицы в теле запроса - тоже только требующие пересчёта
    // (длина, количество и т.п. итоги меняют сразу - common-table-edits.js).
    if(input && input.tableEdits) input.tableEdits = readRecalcTableEdits();
    return JSON.stringify({
      input,
      // только правки, требующие пересчёта (common-table-edits.js)
      tableEdits: readRecalcTableEdits(),
      thicknesses: typeof availableThicknesses !== 'undefined' ? availableThicknesses : null,
      time: typeof TIME_SETTINGS_STORAGE_KEY !== 'undefined' ? loadTimeSettings(TIME_SETTINGS_STORAGE_KEY) : null,
    });
  }catch(e){
    return null;
  }
}
// Вызывается из invalidateCalc() каждого типа при любом изменении параметров.
// После заблокированного расчёта: параметры те же - остаётся «Расчёт не
// проведён» с причиной; изменились - «Нажмите «Рассчитать»», а красная причина
// (она про прежние параметры) убирается; вернули как было - снова ошибка.
function markCalcChanged(){
  // До первого нажатия «Рассчитать» (форму только заполняют) - никакой
  // подсказки (по указанию пользователя).
  if(!calcEverRun) return;
  const st = currentCalcStatus();
  if(calcErrorSnapshot !== null && !calcInProgress && (st === 'error' || st === 'outdated')){
    const errEl = document.getElementById('err');
    if(calcStateSignature() === calcErrorSnapshot.sig){
      setCalcStatus('error');
      if(errEl) errEl.textContent = calcErrorSnapshot.text;
      highlightErrorFields(false);
      return;
    }
    if(errEl && errEl.textContent === calcErrorSnapshot.text) errEl.textContent = '';
    setCalcStatus('outdated');
    return;
  }
  if(calcStateSnapshot !== null && !calcInProgress && (st === 'outdated' || st === 'check')
     && calcStateSignature() === calcStateSnapshot){
    setCalcStatus('check');
    return;
  }
  setCalcStatus('outdated');
}
// Подсветка поля, из-за которого расчёт заблокирован (по указанию пользователя):
// тип объявляет errorFieldsFor(текст ошибки) -> id полей (I-1, I-3, II-1);
// если функции нет - ничего не подсвечивается. Рамка снимается
// при вводе в поле и при следующем расчёте.
function highlightErrorFields(scroll){
  document.querySelectorAll('.field-error').forEach(el => el.classList.remove('field-error'));
  if(typeof errorFieldsFor !== 'function' || currentCalcStatus() !== 'error') return;
  const errEl = document.getElementById('err');
  const els = errorFieldsFor(errEl ? errEl.textContent : '')
    .map(id => document.getElementById(id)).filter(el => el && el.offsetParent !== null);
  els.forEach(el => el.classList.add('field-error'));
  if(scroll && els.length) els[0].scrollIntoView({block:'center', behavior:'smooth'});
}
document.addEventListener('input', e=>{
  if(e.target.classList && e.target.classList.contains('field-error')) e.target.classList.remove('field-error');
});
// Enter в числовом поле параметров (не в таблице деталей и не в окнах
// настроек) - «Рассчитать» (по указанию пользователя; страницы новой
// раскладки - body.layout-v2).
document.addEventListener('keydown', e=>{
  if(e.key !== 'Enter' || !document.body.classList.contains('layout-v2')) return;
  const t = e.target;
  if(!t.matches || !t.matches('input[type="number"]') || t.closest('#boardTables, .modal-overlay, #printArea')) return;
  e.preventDefault();
  t.blur();
  calculate();
});
function setCalcInProgress(v){
  calcInProgress = v;
  const btn = document.getElementById('calcBtn');
  if(btn) btn.disabled = v;
}
// Общая обёртка кнопки «Рассчитать» (у каждого типа своя calculateNow() -
// сам расчёт и рендер): индикатор «Идёт расчёт…», пока он идёт (по
// указанию пользователя), и защита от повторного запуска. Кадр отрисовки
// перед расчётом - чтобы индикатор успел показаться и в статичной версии,
// где расчёт синхронный.
async function calculate(){
  if(calcInProgress || printInProgress) return;
  calcEverRun = true;
  setCalcInProgress(true);
  setCalcStatus('loading');
  await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));
  try{
    await calculateNow();
  }catch(e){
    console.error(e);
    refuseAction('Не удалось выполнить расчёт. Проверьте введённые данные и повторите.');
  }finally{
    setCalcInProgress(false);
    clearCalcHint();
    const loading = document.getElementById('calcLoading');
    if(loading && loading.classList.contains('active')) setCalcStatus(null);
    // Текст отказа, выданного во время расчёта (напр. «Идёт расчёт -
    // дождитесь…»), после успешного расчёта уже неактуален.
    const check = document.getElementById('calcCheck'), errEl = document.getElementById('err');
    if(check && check.classList.contains('active') && errEl && lastRefusalText && errEl.textContent === lastRefusalText) errEl.textContent = '';
    lastRefusalText = '';
    showManualEditsWarning();
    updateResetButton();
    // Снимок - только после успешного расчёта (см. markCalcChanged()).
    calcErrorSnapshot = null;
    if(currentCalcStatus() === 'check'){
      rememberCellOriginals();
      calcStateSnapshot = calcStateSignature();
    } else {
      calcStateSnapshot = null;
      const errEl = document.getElementById('err');
      if(currentCalcStatus() === 'error' && errEl && errEl.textContent) calcErrorSnapshot = {sig: calcStateSignature(), text: errEl.textContent};
    }
    highlightErrorFields(true);
  }
}
// Предупреждение о ручных правках (по указанию пользователя): правки таблиц
// сохраняются между расчётами и заменяют расчётные значения - после
// успешного расчёта, если они есть, в общий блок предупреждений (#warningsTop,
// только на экране) добавляется строка об этом; иначе после смены исходных
// данных (напр. числа поясов планок) казалось бы, что «Рассчитать» ничего не
// сделал - ручное значение в таблице оставалось прежним.
const MANUAL_EDITS_WARNING = 'В таблицах есть ручные правки (выделены цветом) - они заменяют расчётные значения. Чтобы вернуть расчётные, нажмите «Сбросить до стандартных значений».';
function showManualEditsWarning(){
  const el = document.getElementById('warningsTop');
  if(!el) return;
  const old = el.querySelector('.manual-edits-warning');
  if(old) old.remove();
  const check = document.getElementById('calcCheck');
  const hasEdits = !!document.querySelector('#boardTables [data-user-edited="true"]');
  if(!hasEdits || !check || !check.classList.contains('active')) return;
  if(!el.innerHTML.trim()){
    el.innerHTML = '<div style="color:var(--warn);margin-bottom:10px;font-weight:700;">Внимание:</div>';
  }
  el.insertAdjacentHTML('beforeend', `<div class="manual-edits-warning" style="margin-bottom:8px;">⚠ ${MANUAL_EDITS_WARNING}</div>`);
  el.style.display = 'block';
}
// Кнопка «Сбросить до стандартных значений» - видна, пока в таблицах есть
// ручные правки; сбрасывает их все (толщины, размеры, количество, лента) и
// сразу пересчитывает (по указанию пользователя). Размеры груза и галочки
// не трогает.
function updateResetButton(){
  const btn = document.getElementById('resetEditsBtn');
  if(btn) btn.hidden = !document.querySelector('#boardTables [data-user-edited="true"]');
}
function resetTableEdits(){
  if(calcInProgress || printInProgress) return;
  document.querySelectorAll('#boardTables [data-user-edited]').forEach(el => el.removeAttribute('data-user-edited'));
  updateResetButton();
  calculate();
}

// Общий слушатель "параметры изменились" (по указанию пользователя: при
// изменении ЛЮБОГО параметра - цифры, галочки, радио, выпадающего списка
// толщин и т.д. - должна появляться подсказка «Нажмите «Рассчитать»»; надпись
// «Расчёт не проведён» - только когда расчёт заблокирован ошибкой). Раньше
// invalidateCalc() вызывался точечно из обработчиков отдельных полей, и
// часть галочек (напр. "Добавить раскосины", "X-образные раскосины",
// "Убрать раскосины крышки и дна") её не вызывала вовсе - после их
// переключения старый результат выглядел актуальным. Исключения: поле
// комментария (в расчёт не входит, только в печать), таблица деталей
// (#boardTables - у неё свой обработчик: помечает ячейку как исправленную
// и так же вызывает invalidateCalc(), см. calculate() каждого типа) и окно
// настроек нормы времени (invalidateCalc() вызывает его applySettings в
// common-timesettings.js - только при реальном сохранении корректного
// значения).
function onAnyParamChange(e){
  const t = e.target;
  if(!t || !t.matches || !t.matches('input, select, textarea')) return;
  if(t.id === 'userComment' || t.id === 'boxName') return; // в расчёт не входят
  if(t.closest('#boardTables, #timeSettingsOverlay, #densitySettingsOverlay, #printArea')) return;
  if(typeof invalidateCalc === 'function') invalidateCalc();
}
document.addEventListener('input', onAnyParamChange);
document.addEventListener('change', onAnyParamChange);
