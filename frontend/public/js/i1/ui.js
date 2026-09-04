// ГОСТ 10198-91, тип I-1 - UI: фильтр толщин "в наличии" + галочка/толщина
// полоза. Перенесено из src/i1/ui.js исходного (фронтенд-only) репозитория
// pakhiton79-bit/GOST_10198-91 без изменений - thicknessLimitExceeded здесь
// больше не нужен (расчёт и связанное предупреждение теперь на сервере, см.
// js/i1/calc-i1.js), availableThicknesses остаётся клиентским состоянием
// (собирается в тело запроса к /api/i1/calculate).
const THICKNESS_STORAGE_KEY = 'silvan-gost10198-i1-available-thickness';
const AVAILABLE_THICKNESS_OPTIONS = [16, 19, 22, 25, 32, 40, 50, 60, 75, 100, 125, 150, 175, 200];

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
  document.getElementById('calcCheck').style.display = 'none';
  const outdated = document.getElementById('calcOutdated');
  const results = document.getElementById('results');
  if(outdated) outdated.style.display = (results && results.style.display === 'block') ? 'inline-flex' : 'none';
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
const OPTIONS_STORAGE_PREFIX = 'silvan-gost10198-i1-opt-';
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
