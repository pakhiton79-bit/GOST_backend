// ГОСТ 10198-91, тип I-3 - слой отображения (UI, вызов бэкенд-API, чертежи,
// печать). Перенесён из src/app.js исходного (фронтенд-only) репозитория
// pakhiton79-bit/GOST_10198-91: сам расчёт (computeGost10198I3) там
// выполнялся локально в браузере, здесь - на сервере (POST /api/i3/calculate,
// см. backend/server.js) - calculate() поэтому стала асинхронной, остальная
// логика (чтение полей, отрисовка таблиц/чертежей, печать) не менялась.
// Способ крепления груза (за полозья / к доскам дна, variant в теле запроса)
// - runtime-переключатель на одной странице (i3-skid.html), тем же приёмом,
// что и в типе II-1 (см. fasteningType в js/ii1/ui.js/calc-ii1.js) - раньше
// это были две отдельные страницы (i3-skid.html/i3-floor.html) с переходом
// через URL (switchFastening), см. git-историю.

// ============ Фильтр толщин пиломатериала "в наличии" ============
const THICKNESS_STORAGE_KEY = 'gost10198-t1-k3-available-thickness';
// 225 и 250 - добавлены по замечанию пользователя: Табл. 19 (подбор сечения
// полоза, см. selectSkid19) при тяжёлых грузах (ближе к 20000 кг) требует
// сечений до 225×250 мм - без этих значений отметить такую толщину "в
// наличии" было невозможно (тот же диапазон уже был у типа II-1,
// использующего ту же таблицу).
const AVAILABLE_THICKNESS_OPTIONS = [16, 19, 22, 25, 32, 40, 50, 60, 75, 100, 125, 150, 175, 200, 225, 250];
// Настройки шестерёнки у плитки "Норма времени" - свой ключ localStorage
// для этого типа ящика (см. js/common-timesettings.js).
const TIME_SETTINGS_STORAGE_KEY = 'gost10198-t1-k3-time-settings';
// Плотность древесины для «Массы ящика» (шестерёнка у плитки) - свой ключ.
const WOOD_DENSITY_STORAGE_KEY = 'gost10198-t1-k3-wood-density';

function loadAvailableThicknesses(){
  try{
    const raw = localStorage.getItem(THICKNESS_STORAGE_KEY);
    if(!raw) return [];
    const arr = JSON.parse(raw).filter(v => AVAILABLE_THICKNESS_OPTIONS.includes(v));
    return arr.sort((a,b)=>a-b);
  }catch(e){ return []; }
}
function saveAvailableThicknesses(){
  try{ localStorage.setItem(THICKNESS_STORAGE_KEY, JSON.stringify(availableThicknesses)); }catch(e){}
}

let availableThicknesses = loadAvailableThicknesses();

function buildThicknessCheckboxList(){
  const list = document.getElementById('thicknessCheckboxList');
  let html = '';
  AVAILABLE_THICKNESS_OPTIONS.forEach(t=>{
    const checked = availableThicknesses.includes(t) ? ' checked' : '';
    html += `<label><input type="checkbox" value="${t}"${checked} onchange="onThicknessCheckboxChange(this)"> ${t} мм</label>`;
  });
  list.innerHTML = html;
}

function invalidateCalc(){
  // По указанию пользователя - при ЛЮБОМ изменении параметров (цифры,
  // галочки, выпадающие списки...) сразу подсказка «Нажмите «Рассчитать»», в т.ч. и до
  // первого расчёта (см. также общий слушатель в common-print.js).
  markCalcChanged(); // вернули как было - снова «Расчёт выполнен» (см. common-print.js)
}

function onThicknessCheckboxChange(el){
  const v = parseInt(el.value, 10);
  if(el.checked){
    if(!availableThicknesses.includes(v)) availableThicknesses.push(v);
  } else {
    availableThicknesses = availableThicknesses.filter(x=>x!==v);
  }
  availableThicknesses.sort((a,b)=>a-b);
  saveAvailableThicknesses();
  updateThicknessSummary();
  invalidateCalc();
}

function setAllThickness(state){
  availableThicknesses = state ? AVAILABLE_THICKNESS_OPTIONS.slice() : [];
  buildThicknessCheckboxList();
  saveAvailableThicknesses();
  updateThicknessSummary();
  invalidateCalc();
}

function updateThicknessSummary(){
  const label = document.getElementById('thicknessDropdownLabel');
  const note  = document.getElementById('thicknessNote');
  const total = AVAILABLE_THICKNESS_OPTIONS.length;
  if(availableThicknesses.length === 0){
    label.textContent = 'Толщины не выбраны - расчёт строго по ГОСТ';
    note.innerHTML = '⚠ Толщины «в наличии» не выбраны — расчёт по ГОСТ 10198-91 без округления.';
    note.style.display = 'block';
  } else if(availableThicknesses.length === total){
    label.textContent = `Выбраны все толщины (${AVAILABLE_THICKNESS_OPTIONS[0]}-${AVAILABLE_THICKNESS_OPTIONS[total-1]} мм)`;
    note.style.display = 'none';
  } else {
    const shown = availableThicknesses.slice(0,8).join(', ');
    const more = availableThicknesses.length > 8 ? `, ещё ${availableThicknesses.length-8} знач.` : '';
    label.textContent = `Выбрано (${availableThicknesses.length}): ${shown} мм${more}`;
    note.style.display = 'none';
  }
}

function toggleThicknessDropdown(){
  document.getElementById('thicknessDropdownPanel').classList.toggle('open');
}
document.addEventListener('click', e=>{
  document.querySelectorAll('.dropdown-wrap').forEach(wrap=>{
    if(!wrap.contains(e.target)){
      const p = wrap.querySelector('.thickness-dropdown-panel');
      if(p) p.classList.remove('open');
    }
  });
});

buildThicknessCheckboxList();
updateThicknessSummary();

// ============ Тип крепления груза (сечение полоза) ============
const FASTENING_STORAGE_KEY = 'gost10198-t1-k3-fastening-type';
const FASTENING_LABELS = {
  skid:           'Крепление за полозья',
  floor_boards:   'Крепление к доскам дна',
  mounting_beams: 'Крепление к крепёжным брусьям',
  frame:          'Крепление на металлической или деревянной раме'
};

let fasteningType = 'skid';
try{
  const saved = localStorage.getItem(FASTENING_STORAGE_KEY);
  if(saved === 'skid' || saved === 'floor_boards') fasteningType = saved;
}catch(e){}

function onFasteningTypeChange(el){
  fasteningType = el.value;
  try{ localStorage.setItem(FASTENING_STORAGE_KEY, fasteningType); }catch(e){}
  updateFasteningSummary();
  // «Убрать доски дна» есть только у варианта «за полозья» - при креплении
  // к доскам дна убирать их нельзя (они и есть точка крепления).
  document.getElementById('removeFloorBoardsRow').style.display = fasteningType === 'skid' ? '' : 'none';
  if(fasteningType !== 'skid'){
    document.getElementById('removeFloorBoards').checked = false;
  }
  invalidateCalc();
}

function updateFasteningSummary(){
  document.getElementById('fasteningDropdownLabel').textContent = FASTENING_LABELS[fasteningType];
  document.querySelectorAll('input[name="fasteningType"]').forEach(r=>{ r.checked = (r.value === fasteningType); });
}

function toggleFasteningDropdown(){
  document.getElementById('fasteningDropdownPanel').classList.toggle('open');
}

updateFasteningSummary();
document.getElementById('removeFloorBoardsRow').style.display = fasteningType === 'skid' ? '' : 'none';

function onSkidForkliftExclusive(el){
  if(el.checked){
    const otherId = el.id === 'removeSkidBoards' ? 'forkliftLoading' : 'removeSkidBoards';
    const other = document.getElementById(otherId);
    if(other && other.checked) other.checked = false;
  }
  invalidateCalc();
}

// ============ Запоминание галочек «Дополнительные опции» ============
// Тот же принцип, что и у THICKNESS_STORAGE_KEY/FASTENING_STORAGE_KEY выше -
// свой набор ключей localStorage для этой комплектации ящика (t1-k3), чтобы
// выбор не «утекал» между калькуляторами разных типов. По просьбе
// пользователя: все чекбоксы опций должны запоминаться между заходами, как
// уже давно работает для толщин "в наличии" и способа крепления -
// переключение "за полозья"/"к доскам дна" не должно сбрасывать остальные
// опции.
const OPTIONS_STORAGE_PREFIX = 'gost10198-t1-k3-opt-';
function persistCheckbox(id){
  const el = document.getElementById(id);
  if(!el) return;
  const key = OPTIONS_STORAGE_PREFIX + id;
  try{
    const saved = localStorage.getItem(key);
    if(saved !== null) el.checked = (saved === '1');
  }catch(e){}
  el.addEventListener('change', ()=>{
    try{ localStorage.setItem(key, el.checked ? '1' : '0'); }catch(e){}
  });
}
['optimizeSizes','roundBoardWidths','solidRigidBase','forkliftLoading','removeSkidBoards','removeFloorBoards','xRaskosina'].forEach(persistCheckbox);

// ============ Настройка раскладки поясов планок ============
// Тот же блок, что и у типа I-1 (js/i1/ui.js) - по указанию
// пользователя, «аналогично как у I-1». Стандартные значения и длина
// крышки (предел зазора) обновляются в calculateNow() ниже.
// Две взаимоисключающие галочки - "Настроить число поясов планок" и
// "Настроить расстояние между краями поясов планок" (по запросу
// пользователя). При включении одной из них под ней появляется ползунок -
// тот же виджет createJumpSlider(), что и у нормы времени (см.
// common-timesettings.js), плюс поле для ручного ввода любого значения
// (в т.ч. вне диапазона ползунка - например, расстояние можно поставить и
// больше 700мм, осознанно отклонившись от рекомендации ГОСТа). По центру
// ползунка при открытии - "стандартное" (штатное автоматическое) значение
// для текущих входных данных, с шагом 50мм (расстояние) или 1 (число
// поясов) в каждую сторону; "стандартное" значение обновляется при каждом
// успешном расчёте (см. calculate() в calc-i1.js), но сам ползунок
// перестраивается только в момент включения галочки - чтобы уже выбранное
// пользователем значение не сбрасывалось само по себе при пересчёте.
const PLANK_LAYOUT_STORAGE_KEY = OPTIONS_STORAGE_PREFIX + 'plankLayout';
let plankLayoutMode = null; // null | 'count' | 'gap'
let plankLayoutValue = null;
// "Стандартные" (штатные автоматические) значения для центра ползунков -
// заполняются из calc.standardPlankCount/standardPlankGap при каждом
// успешном расчёте (см. calculate() в calc-i1.js). До первого расчёта -
// null, используется запасной центр по умолчанию (см. ниже).
let lastStandardPlankCount = null;
let lastStandardPlankGap = null;
let lastKLen = null; // длина доски последнего успешного расчёта - см. plankGapMax() ниже
let plankCountSlider = null, plankGapSlider = null;

// Верхний предел поля "расстояние между краями поясов планок" - больше
// длины самой доски отступ быть не может (по указанию пользователя: раньше
// поле позволяло ввести сколь угодно большое/бесконечное значение). Пока
// расчёт ни разу не проводился (lastKLen ещё не известен) - берётся
// заведомо большой запасной предел, только чтобы отсечь явно бессмысленный
// ввод (не Infinity и т.п.), а не для точного физического ограничения.
const PLANK_GAP_FALLBACK_MAX = 20000;
function plankGapMax(){
  return lastKLen || PLANK_GAP_FALLBACK_MAX;
}

function plankCountSteps(center){
  center = Math.max(2, Math.round(center));
  const steps = [];
  for(let i=-3;i<=3;i++) steps.push(Math.max(2, center+i));
  return Array.from(new Set(steps)).sort((a,b)=>a-b);
}
function plankGapSteps(center){
  const max = plankGapMax();
  center = Math.min(max, Math.max(1, Math.round(center)));
  const steps = [];
  for(let i=-3;i<=3;i++) steps.push(Math.min(max, Math.max(1, center+i*50)));
  return Array.from(new Set(steps)).sort((a,b)=>a-b);
}

function savePlankLayout(){
  try{ localStorage.setItem(PLANK_LAYOUT_STORAGE_KEY, JSON.stringify({mode: plankLayoutMode, value: plankLayoutValue})); }catch(e){}
}
function loadPlankLayout(){
  try{
    const raw = localStorage.getItem(PLANK_LAYOUT_STORAGE_KEY);
    if(raw){
      const parsed = JSON.parse(raw);
      if((parsed.mode === 'count' || parsed.mode === 'gap') && parsed.value > 0) return parsed;
    }
  }catch(e){}
  return {mode:null, value:null};
}

// Пересобирает нужный ползунок (createJumpSlider каждый раз строит разметку
// заново - готового способа сменить набор шагов у уже созданного ползунка
// нет) с шагами вокруг center и выставляет value как текущее положение.
function rebuildPlankSlider(mode, center, value){
  if(mode === 'count'){
    plankCountSlider = createJumpSlider(document.getElementById('plankCountSlider'), plankCountSteps(center), v=>{
      plankLayoutValue = v;
      document.getElementById('plankCountInput').value = v;
      savePlankLayout();
      invalidateCalc();
    });
    plankCountSlider.setValue(value);
  } else {
    plankGapSlider = createJumpSlider(document.getElementById('plankGapSlider'), plankGapSteps(center), v=>{
      plankLayoutValue = v;
      document.getElementById('plankGapInput').value = v;
      savePlankLayout();
      invalidateCalc();
    });
    plankGapSlider.setValue(value);
  }
}

function onPlankLayoutCheckboxChange(mode){
  const countEl = document.getElementById('customPlankCount');
  const gapEl = document.getElementById('customPlankGap');
  if(mode === 'count' && countEl.checked) gapEl.checked = false;
  if(mode === 'gap' && gapEl.checked) countEl.checked = false;

  plankLayoutMode = countEl.checked ? 'count' : gapEl.checked ? 'gap' : null;
  document.getElementById('plankCountRow').style.display = plankLayoutMode==='count' ? '' : 'none';
  document.getElementById('plankGapRow').style.display = plankLayoutMode==='gap' ? '' : 'none';

  if(plankLayoutMode === 'count'){
    const center = lastStandardPlankCount || 4;
    plankLayoutValue = center;
    document.getElementById('plankCountInput').value = center;
    rebuildPlankSlider('count', center, center);
  } else if(plankLayoutMode === 'gap'){
    const gapInput = document.getElementById('plankGapInput');
    gapInput.max = plankGapMax();
    const center = Math.min(plankGapMax(), Math.round(lastStandardPlankGap || 400));
    plankLayoutValue = center;
    gapInput.value = center;
    rebuildPlankSlider('gap', center, center);
  }
  savePlankLayout();
  invalidateCalc();
}

function onPlankCountInputChange(){
  const v = parseInt(document.getElementById('plankCountInput').value, 10);
  if(!(v>=2)) return;
  plankLayoutValue = v;
  if(plankCountSlider) plankCountSlider.setValue(v);
  savePlankLayout();
  invalidateCalc();
}
function onPlankGapInputChange(){
  const gapInput = document.getElementById('plankGapInput');
  const raw = parseFloat(String(gapInput.value).replace(',','.'));
  if(!(raw>0)) return;
  const v = Math.min(plankGapMax(), raw);
  if(v !== raw) gapInput.value = v; // подрезали до предела - отражаем в поле
  plankLayoutValue = v;
  if(plankGapSlider) plankGapSlider.setValue(v);
  savePlankLayout();
  invalidateCalc();
}

// Восстановление сохранённого состояния при открытии страницы - "стандартное"
// значение центра ещё неизвестно (расчёт не проводился), поэтому ползунок
// строится вокруг самого сохранённого значения (см. комментарий у
// PLANK_LAYOUT_STORAGE_KEY выше).
(function initPlankLayoutFromStorage(){
  const saved = loadPlankLayout();
  if(!saved.mode) return;
  if(saved.mode === 'gap') saved.value = Math.min(plankGapMax(), saved.value);
  document.getElementById(saved.mode === 'count' ? 'customPlankCount' : 'customPlankGap').checked = true;
  plankLayoutMode = saved.mode;
  plankLayoutValue = saved.value;
  document.getElementById(saved.mode === 'count' ? 'plankCountRow' : 'plankGapRow').style.display = '';
  if(saved.mode === 'gap') document.getElementById('plankGapInput').max = plankGapMax();
  document.getElementById(saved.mode === 'count' ? 'plankCountInput' : 'plankGapInput').value = saved.value;
  rebuildPlankSlider(saved.mode, saved.value, saved.value);
})();

// ============ Расстояние между поперечными брусьями крышки ============
// Галочка «Настроить расстояние между краями поперечных брусьев крышки» (по
// указанию пользователя): вместо штатных 800 мм - своё значение: ползунок
// 500-1100 мм с шагом 100 мм вокруг штатных 800 (тот же виджет, что у поясов
// планок) + поле для любого значения. Расстановка - по тому же правилу
// (зазор ровно заданный, число брусьев - максимальное при минимальном
// отступе, остаток пополам), см. l21 в расчёте.
const BEAM_GAP_STANDARD = 800;
const BEAM_GAP_STORAGE_KEY = OPTIONS_STORAGE_PREFIX + 'beamGap';
let beamGapValue = null; // null - штатные 800 мм
function beamGapSteps(){
  const steps = [];
  for(let i=-3;i<=3;i++) steps.push(BEAM_GAP_STANDARD + i*100);
  return steps;
}
function saveBeamGap(){
  try{ localStorage.setItem(BEAM_GAP_STORAGE_KEY, beamGapValue === null ? '' : String(beamGapValue)); }catch(e){}
}
const beamGapSlider = createJumpSlider(document.getElementById('beamGapSlider'), beamGapSteps(), v=>{
  beamGapValue = v;
  document.getElementById('beamGapInput').value = v;
  saveBeamGap();
  invalidateCalc();
});
function setBeamGapUI(v){
  document.getElementById('beamGapInput').value = v;
  beamGapSlider.setValue(v);
}
function onBeamGapCheckboxChange(){
  const on = document.getElementById('customBeamGap').checked;
  document.getElementById('beamGapRow').style.display = on ? '' : 'none';
  beamGapValue = on ? BEAM_GAP_STANDARD : null;
  setBeamGapUI(BEAM_GAP_STANDARD);
  saveBeamGap();
  invalidateCalc();
}
function onBeamGapInputChange(){
  const v = parseFloat(String(document.getElementById('beamGapInput').value).replace(',', '.'));
  if(!(v > 0)) return;
  beamGapValue = v;
  beamGapSlider.setValue(v);
  saveBeamGap();
  invalidateCalc();
}
(function initBeamGapFromStorage(){
  let saved = null;
  try{ const raw = localStorage.getItem(BEAM_GAP_STORAGE_KEY); if(raw) saved = parseFloat(raw); }catch(e){}
  if(saved > 0){
    beamGapValue = saved;
    document.getElementById('customBeamGap').checked = true;
    document.getElementById('beamGapRow').style.display = '';
    setBeamGapUI(saved);
  } else {
    setBeamGapUI(BEAM_GAP_STANDARD);
  }
})();

// Ручной ввод толщины в таблице (data-override="..." в renderSection ниже) -
// читается ДО того, как calculate() эту таблицу перерисует, и отправляется
// на сервер вместе с остальными входными данными (см. computeGost10198I3/
// ov() в backend/src/i3/compute.js). Учитываются ТОЛЬКО ячейки, реально
// отредактированные пользователем (data-user-edited, взводится обработчиком
// input ниже) - тот же приём, что и в типе I-1 (см. js/i1/calc-i1.js).
function readManualOverrides(){
  const overrides = {};
  document.querySelectorAll('#boardTables td[data-override][data-user-edited="true"]').forEach(cell=>{
    const key = cell.getAttribute('data-override');
    const val = parseFloat(cell.textContent.replace(',','.'));
    if(!Number.isNaN(val) && val>0) overrides[key] = val;
  });
  return overrides;
}

// ============ Вызов бэкенд-API и отрисовка результата ============
// Входные данные расчёта - в том виде, в каком они уходят в расчёт (на сервер).
// Вынесены из calculateNow(), чтобы по ним же сравнивать текущее
// состояние формы с последним успешным расчётом (см. calcStateSignature
// в common-print.js).
function buildCalcInput(){
  const manualOverrides = readManualOverrides();
  const tableEdits = readTableEdits(); // см. common-print.js, учитываются на сервере
  return {
    variant: fasteningType,
    L: parseFloat(document.getElementById('L').value),
    W: parseFloat(document.getElementById('W').value),
    H: parseFloat(document.getElementById('H').value),
    MASS: parseFloat(document.getElementById('M').value),
    optimizeSizes: document.getElementById('optimizeSizes').checked,
    // «Убрать доски дна» скрыта (см. onFasteningTypeChange), когда крепление
    // не «за полозья» - checked там уже сброшен в false, читаем как обычно.
    removeFloorBoards: document.getElementById('removeFloorBoards').checked,
    removeSkidBoards: document.getElementById('removeSkidBoards').checked,
    roundBoardWidths: document.getElementById('roundBoardWidths').checked,
    solidRigidBase: document.getElementById('solidRigidBase').checked,
    forkliftLoading: document.getElementById('forkliftLoading').checked,
    xRaskosina: document.getElementById('xRaskosina').checked,
    plankLayoutMode,
    plankLayoutValue,
    beamGapValue,
    availableThicknesses,
    manualOverrides,
    tableEdits,
    ...loadTimeSettings(TIME_SETTINGS_STORAGE_KEY),
    woodDensity: loadWoodDensity(WOOD_DENSITY_STORAGE_KEY),
  };
}

// Сам расчёт и рендер; кнопка «Рассчитать» вызывает общую обёртку
// calculate() из common-print.js (индикатор «Идёт расчёт…», защита от
// повторного запуска, блокировка печати на время расчёта).
async function calculateNow(){
  const errEl = document.getElementById('err');
  errEl.textContent = '';
  const input = buildCalcInput();
  const manualOverrides = input.manualOverrides;

  let calc;
  try{
    const resp = await fetch('/api/i3/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    calc = await resp.json();
  }catch(e){
    errEl.textContent = 'Не удалось связаться с сервером расчёта. Проверьте соединение и повторите.';
    setCalcStatus('error');
    document.getElementById('results').style.display = 'none';
    return;
  }
  if(calc.error){
    errEl.textContent = calc.error;
    setCalcStatus('error');
    // Прячем «Итог» и спецификацию целиком - иначе на экране остаются
    // цифры прошлого успешного расчёта рядом с текстом ошибки (по указанию
    // пользователя).
    document.getElementById('results').style.display = 'none';
    return;
  }

  // «Стандартные» (штатные) число/зазор поясов планок - центр ползунков у
  // галочек «Настроить число поясов»/«Настроить расстояние между краями
  // поясов» - обновляются при каждом успешном расчёте (как в I-1). Длина
  // крышки - верхний предел зазора: если введённое значение теперь больше
  // (ящик стал короче) - подрезаем поле и ползунок.
  lastStandardPlankCount = calc.standardPlankCount;
  lastStandardPlankGap = calc.standardPlankGap;
  lastKLen = calc.k9Base;
  if(plankLayoutMode === 'gap' && plankLayoutValue > lastKLen){
    plankLayoutValue = lastKLen;
    const gapInput = document.getElementById('plankGapInput');
    gapInput.max = lastKLen;
    gapInput.value = lastKLen;
    rebuildPlankSlider('gap', lastKLen, lastKLen);
    savePlankLayout();
  }

  document.getElementById('outDims').innerHTML = `${calc.outerL} × ${calc.outerW} × ${calc.outerH} <span>мм</span>`;
  document.getElementById('outVolume').innerHTML = `${calc.totalVolume.toFixed(3)} <span>м³</span>`;
  document.getElementById('outMass').innerHTML = `${calc.crateMass.toFixed(1)} <span>кг</span>`;
  document.getElementById('outTime').innerHTML = `${calc.normaVremeni} <span>ч</span>`;

  function renderSection(title, rows, sectionKey){
    let html = title ? `<div class="part-title">${title}</div>` : '';
    html += `<div class="spec-table"><table data-section="${sectionKey}">
      <thead><tr><th>Деталь</th><th class="num">Толщина</th><th class="num">Ширина</th><th class="num">Длина</th><th class="num">Кол-во</th></tr></thead><tbody>`;
    const rowKeys = tableRowKeys(rows);
    rows.forEach((r, i)=>{
      const overrideAttr = r.overrideKey ? ` data-override="${r.overrideKey}"` : '';
      html += `<tr data-row-key="${escapeAttr(rowKeys[i])}">
        <td>${r.name}</td>
        <td class="num editable-cell" contenteditable="true" data-role="t"${overrideAttr}${editedAttr(r, 't', manualOverrides)}>${r.t}</td>
        <td class="num editable-cell" contenteditable="true" data-role="w"${editedAttr(r, 'w')}>${r.w}</td>
        <td class="num editable-cell" contenteditable="true" data-role="l"${editedAttr(r, 'l')}>${typeof r.l === 'number' ? Math.round(r.l) : r.l}</td>
        <td class="num editable-cell" contenteditable="true" data-role="qty"${editedAttr(r, 'qty')}>${r.qty}</td>
      </tr>`;
    });
    html += `</tbody></table></div>`;
    return html;
  }

  let tablesHtml = '';
  tablesHtml += `<div class="part-title">Дно</div><div class="spec-row-diagram"><div class="diagram-slot">` + diagramDno(calc.k9Base, calc.t41, calc.outerW, calc.t40, calc.torecFrameThickness) + `</div>` + renderSection('', calc.dno, 'dno') + `</div>`;
  tablesHtml += `<div class="part-title">Крышка</div><div class="spec-row-diagram"><div class="diagram-slot">` + (!((calc.l19 === 2 && calc.l21 === 2) || (calc.l19 === 3 && calc.l21 === 3)) ? diagramKryshkaGen(calc.W, calc.L, calc.t30, calc.t32, calc.t41, calc.t40Display, calc.edgeDistKryshka, calc.l21, calc.w21, calc.l19, calc.bokSectionW, calc.plankGap, calc.beamEdgeDist, calc.beamGap) : diagramKryshka(calc.W, calc.L, calc.t30, calc.t32, calc.t41, calc.t40Display, calc.edgeDistKryshka, calc.l21, calc.w21, calc.l19, calc.bokSectionW, calc.plankGap, calc.beamEdgeDist, calc.beamGap)) + `</div>` + renderSection('', calc.kryshka, 'kryshka') + `</div>`;
  tablesHtml += `<div class="part-title">Щит торцевой (2 шт.)</div><div class="spec-row-diagram"><div class="diagram-slot">` + ((calc.xRaskosina && calc.torecHasRaskosina && calc.torecFloors !== 2 && calc.torecSections <= 1) ? diagramEndPanel1Raskosina(calc.HplusT12, calc.W, undefined, I3_TOREC_1_X_IMG_B64) : (calc.torecHasRaskosina && (calc.xRaskosina || calc.torecSections > 3)) ? diagramEndPanelGen(calc.W, calc.HplusT12, calc.torecSections, calc.torecFloors, calc.xRaskosina, calc.k30plusW31) : diagramEndPanel(calc.k32, calc.torecSections, calc.torecHasRaskosina, calc.W, calc.HplusT12, calc.torecNoRaskosinaDiagram, calc.torecFloors, calc.k30plusW31)) + `</div>` + renderSection('', calc.endPanel, 'endPanel') + `</div>`;
  tablesHtml += `<div class="part-title" style="margin-bottom:26px">Щит боковой (2 шт.)</div><div class="spec-row-diagram"><div class="diagram-slot">` + (((calc.xRaskosina && calc.l42 > 0) || calc.l19 > 4) ? diagramBokovoyGen(calc.k41, calc.bokOverhang, calc.edgeDistKryshka, calc.HplusT12, calc.l19, calc.bokFloors, calc.xRaskosina, calc.k40, calc.w43, calc.bokSectionW, calc.t20, calc.l42 > 0, calc.plankGap) : diagramBokovoy(calc.H, calc.t12, calc.t41, calc.k41, calc.bokOverhang, calc.edgeDistKryshka, calc.l42, calc.bokFloors, calc.bokVertSpan, calc.l19, calc.k40, calc.w43, calc.plankGap)) + `</div>` + renderSection('', calc.bokovoy, 'bokovoy') + `</div>`;
  const boardTablesEl = document.getElementById('boardTables');
  boardTablesEl.innerHTML = tablesHtml;
  const boardImages = Array.from(boardTablesEl.querySelectorAll('img'));
  Promise.all(boardImages.map(img => img.decode ? img.decode().catch(()=>{}) : Promise.resolve()))
    .then(()=> reserveDiagramOverflowScreen(boardTablesEl));

  let warningsHtml = '';
  if(calc.warnings.length){
    warningsHtml += '<div style="color:var(--warn);margin-bottom:10px;font-weight:700;">Внимание:</div>' +
      calc.warnings.map(w=>`<div style="margin-bottom:8px;">⚠ ${w}</div>`).join('');
  }
  const warningsEl = document.getElementById('warningsTop');
  warningsEl.innerHTML = warningsHtml;
  warningsEl.style.display = calc.warnings.length ? 'block' : 'none';

  document.getElementById('results').style.display = 'block';
  setCalcStatus('check');
}

['L','W','H','M'].forEach(id=>{
  document.getElementById(id).addEventListener('input', invalidateCalc);
});
['optimizeSizes','solidRigidBase','roundBoardWidths','removeFloorBoards'].forEach(id=>{
  const el = document.getElementById(id);
  if(el) el.addEventListener('change', invalidateCalc);
});


document.getElementById('boardTables').addEventListener('input', e=>{
  if(e.target.classList.contains('editable-cell')){
    // Правка ячейки НЕ пересчитывает итоги сразу (по указанию пользователя) -
    // только помечает ячейку как исправленную и расчёт как устаревший
    // (подсказка «Нажмите «Рассчитать»»); учтётся при нажатии "Рассчитать" - на сервере
    // (толщина с data-override - через readManualOverrides(), остальное -
    // через readTableEdits(), см. common-print.js / withTableEdits в
    // backend/server.js).
    markCellEdited(e.target); syncOverrideCells(e.target);
    updateResetButton();
    invalidateCalc();
  }
});

const BOX_IMG_B64 = "/images/box.png";

function buildPrintHtml(){
  const L = document.getElementById('L').value;
  const W = document.getElementById('W').value;
  const H = document.getElementById('H').value;
  const M = document.getElementById('M').value;

  const outDimsText = document.getElementById('outDims').textContent.trim();
  const volumeText  = document.getElementById('outVolume').textContent.trim();
  const massText    = document.getElementById('outMass').textContent.trim();
  const timeText    = document.getElementById('outTime').textContent.trim();

  const clone = document.getElementById('boardTables').cloneNode(true);
  clone.querySelectorAll('.editable-cell').forEach(cell=>{
    cell.removeAttribute('contenteditable');
    cell.classList.remove('editable-cell');
  });

  clone.querySelectorAll('.part-title, .spec-row-diagram').forEach(el=>{
    el.style.marginTop = '';
    el.style.marginBottom = '';
  });

  clone.querySelectorAll('.diagram-wrap').forEach(wrap=>{
    wrap.style.marginTop = '';
    wrap.style.marginBottom = '';
    wrap.style.marginLeft = '';
    wrap.style.width = '';
    wrap.style.removeProperty('--dk');
  });
  clone.querySelectorAll('.diagram-slot').forEach(slot=>{
    slot.style.width = '';
    slot.style.flexBasis = '';
  });

  let sections = '';
  const children = Array.from(clone.children);
  for(let i=0; i<children.length; i+=2){
    const title = children[i];
    const row   = children[i+1];
    sections += `<div class="print-section">${title.outerHTML}${row ? row.outerHTML : ''}</div>`;
  }

  const commentRaw = (document.getElementById('userComment').value || '').trim();
  let commentHtml = '';
  if(commentRaw){
    const esc = commentRaw
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    commentHtml = `<div class="print-section">
      <div class="part-title">Комментарий</div>
      <div class="print-comment">${esc}</div>
    </div>`;
  }

  return `
    <img class="print-watermark" src="${LOGO_B64}" alt="">

    <h1>ГОСТ 10198-91 тип I-3${boxNameHtml()}</h1>
    <div class="print-subtitle">Плотный дощатый ящик с полозьями</div>

    <div class="part-title">Общий вид ящика</div>
    <div class="spec-row-diagram">
      <div class="diagram-slot"><div class="diagram-wrap"><img src="${BOX_IMG_B64}" alt=""></div></div>
      <div class="print-summary-col">
        <div class="print-summary-block">
          <h2>Внутренние размеры груза, мм</h2>
          <table class="print-plain-table">
            <tr><td class="k">Длина</td><td>${L}</td></tr>
            <tr><td class="k">Ширина</td><td>${W}</td></tr>
            <tr><td class="k">Высота</td><td>${H}</td></tr>
            <tr><td class="k">Масса груза, кг</td><td>${M}</td></tr>
          </table>
        </div>
        <div class="print-summary-block">
          <h2>Итог</h2>
          <table class="print-plain-table">
            <tr><td class="k">Наружные размеры, мм</td><td>${outDimsText}</td></tr>
            <tr><td class="k">Расход пило&shy;материала</td><td>${volumeText}</td></tr>
            <tr><td class="k">Масса ящика</td><td>${massText}</td></tr>
            <tr><td class="k">Норма времени</td><td>${timeText}</td></tr>
          </table>
        </div>
      </div>
    </div>

    ${sections}
    ${commentHtml}
  `;
}

document.getElementById('boxView').src = BOX_IMG_B64;

initTimeSettings(TIME_SETTINGS_STORAGE_KEY);
initDensitySettings(WOOD_DENSITY_STORAGE_KEY);
