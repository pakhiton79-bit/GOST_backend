// ГОСТ 10198-91, тип I-1 - UI: фильтр толщин "в наличии" + галочка/толщина
// полоза. Перенесено из src/i1/ui.js исходного (фронтенд-only) репозитория
// pakhiton79-bit/GOST_10198-91 без изменений - thicknessLimitExceeded здесь
// больше не нужен (расчёт и связанное предупреждение теперь на сервере, см.
// js/i1/calc-i1.js), availableThicknesses остаётся клиентским состоянием
// (собирается в тело запроса к /api/i1/calculate).
const THICKNESS_STORAGE_KEY = 'gost10198-i1-available-thickness';
const AVAILABLE_THICKNESS_OPTIONS = [16, 19, 22, 25, 32, 40, 50, 60, 75, 100, 125, 150, 175, 200];
// Настройки шестерёнки у плитки "Норма времени" - свой ключ localStorage
// для этого типа ящика (см. js/common-timesettings.js).
const TIME_SETTINGS_STORAGE_KEY = 'gost10198-i1-time-settings';

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

// Прячет "Расчёт выполнен" при любом изменении входных данных или таблицы
// деталей. Если расчёт уже хоть раз показывался (#results видим) - вместо
// галочки показываем краткую подсказку "устарело" (см. #calcOutdated в
// frontend/public/i1.html) - до первого расчёта её показывать нечего.
function invalidateCalc(){
  const results = document.getElementById('results');
  setCalcStatus(results && results.style.display === 'block' ? 'outdated' : null);
}

function buildThicknessCheckboxList(){
  const list = document.getElementById('thicknessCheckboxList');
  let html = '';
  AVAILABLE_THICKNESS_OPTIONS.forEach(t=>{
    const checked = availableThicknesses.includes(t) ? ' checked' : '';
    html += `<label><input type="checkbox" value="${t}"${checked} onchange="onThicknessCheckboxChange(this)"> ${t} мм</label>`;
  });
  list.innerHTML = html;
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

// ============ Полоз (галочка "нужен ли" + толщина) ============
function onSkidToggle(){
  const enabled = document.getElementById('skidEnabled').checked;
  document.getElementById('skidThicknessRow').style.display = enabled ? '' : 'none';
  invalidateCalc();
}

let skidThicknessValue = 50;

function onSkidThicknessChange(el){
  skidThicknessValue = parseInt(el.value, 10);
  updateSkidThicknessSummary();
  invalidateCalc();
}

function updateSkidThicknessSummary(){
  document.getElementById('skidThicknessDropdownLabel').textContent = skidThicknessValue + ' мм';
}

function toggleSkidThicknessDropdown(){
  document.getElementById('skidThicknessDropdownPanel').classList.toggle('open');
}

// ============ Запоминание галочек и переключателей ============
// Тот же принцип, что и у THICKNESS_STORAGE_KEY выше - свой набор ключей
// localStorage для этого типа ящика, чтобы выбор не «утекал» между
// калькуляторами разных типов. По просьбе пользователя: все чекбоксы/
// переключатели опций должны запоминаться между заходами, как уже давно
// работает для толщин "в наличии".
const OPTIONS_STORAGE_PREFIX = 'gost10198-i1-opt-';
function persistCheckbox(id, onRestore){
  const el = document.getElementById(id);
  if(!el) return;
  const key = OPTIONS_STORAGE_PREFIX + id;
  try{
    const saved = localStorage.getItem(key);
    if(saved !== null) el.checked = (saved === '1');
  }catch(e){}
  if(onRestore) onRestore();
  el.addEventListener('change', ()=>{
    try{ localStorage.setItem(key, el.checked ? '1' : '0'); }catch(e){}
  });
}
persistCheckbox('skidEnabled', ()=>{
  document.getElementById('skidThicknessRow').style.display = document.getElementById('skidEnabled').checked ? '' : 'none';
});
persistCheckbox('roundBoardWidths');
persistCheckbox('removeLidBottomRaskosina');

// skidThicknessValue (а не DOM) - источник истины при расчёте (см. calc-i1.js),
// поэтому восстанавливаем именно его, а не только checked-состояние радио.
const SKID_THICKNESS_KEY = OPTIONS_STORAGE_PREFIX + 'skidThickness';
try{
  const saved = localStorage.getItem(SKID_THICKNESS_KEY);
  if(saved && ['50','100','150','200'].includes(saved)) skidThicknessValue = parseInt(saved, 10);
}catch(e){}
document.querySelectorAll('input[name="skidThickness"]').forEach(el=>{
  el.checked = (parseInt(el.value,10) === skidThicknessValue);
  el.addEventListener('change', ()=>{
    try{ localStorage.setItem(SKID_THICKNESS_KEY, el.value); }catch(e){}
  });
});

updateSkidThicknessSummary();

// ============ Настройка раскладки поясов планок ============
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
