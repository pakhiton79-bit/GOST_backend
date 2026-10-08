// ГОСТ 10198-91, тип I-1: опции формы - толщины «в наличии», полоз и
// галочки. Всё запоминается в localStorage (ключи - свои для типа I-1).
const THICKNESS_STORAGE_KEY = 'gost10198-i1-available-thickness';
const AVAILABLE_THICKNESS_OPTIONS = [16, 19, 22, 25, 32, 40, 50, 60, 75, 100, 125, 150, 175, 200, 225, 250];
const TIME_SETTINGS_STORAGE_KEY = 'gost10198-i1-time-settings'; // шестерёнка «Нормы времени»
const WOOD_DENSITY_STORAGE_KEY = 'gost10198-i1-wood-density';   // шестерёнка «Массы ящика»
const OPTIONS_STORAGE_PREFIX = 'gost10198-i1-opt-';             // галочки и переключатели

// Любое изменение параметров: после первого расчёта показывается «Нажмите
// «Рассчитать»» (вернули как было - снова «Расчёт выполнен»), см.
// markCalcChanged в common-calc-state.js.
function invalidateCalc(){
  markCalcChanged();
}

// ============ Толщины «в наличии» ============
// Свои толщины у типа (THICKNESS_STORAGE_KEY), а пока их в типе не меняли
// (ключа нет) - общие из окна «Настройки» (siteAvailableThicknesses в
// common-settings.js; по указанию пользователя: свои у типа в приоритете).
// thicknessFromSite - тип сейчас берёт общие.
let thicknessFromSite = false;
function loadAvailableThicknesses(){
  try{
    const raw = localStorage.getItem(THICKNESS_STORAGE_KEY);
    thicknessFromSite = !raw;
    if(!raw) return siteAvailableThicknesses().filter(v => AVAILABLE_THICKNESS_OPTIONS.includes(v));
    const arr = JSON.parse(raw).filter(v => AVAILABLE_THICKNESS_OPTIONS.includes(v));
    return arr.sort((a,b)=>a-b);
  }catch(e){ return []; }
}
function saveAvailableThicknesses(){
  try{ localStorage.setItem(THICKNESS_STORAGE_KEY, JSON.stringify(availableThicknesses)); }catch(e){}
  thicknessFromSite = false;
}
// Общие толщины поменяли в окне «Настройки» - тип, который берёт их,
// обновляется сразу.
window.addEventListener('site-thickness-change', () => {
  if(!thicknessFromSite) return;
  availableThicknesses = loadAvailableThicknesses();
  buildThicknessCheckboxList();
  updateThicknessSummary();
  invalidateCalc();
});

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

// Надпись на кнопке списка и предупреждение, если ничего не выбрано.
function updateThicknessSummary(){
  const label = document.getElementById('thicknessDropdownLabel');
  const note  = document.getElementById('thicknessNote');
  const total = AVAILABLE_THICKNESS_OPTIONS.length;
  if(availableThicknesses.length === 0){
    label.textContent = 'Толщины не выбраны - расчёт строго по ГОСТ';
    note.innerHTML = '⚠ Толщины «в наличии» не выбраны - расчёт по ГОСТ 10198-91 без округления.';
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
  if(thicknessFromSite) label.textContent += ' (общие настройки)';
}

function toggleThicknessDropdown(){
  document.getElementById('thicknessDropdownPanel').classList.toggle('open');
}
// Клик мимо выпадающего списка закрывает его.
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

// ============ Полоз ============
let skidThicknessValue = 50; // выбранная толщина полоза - источник истины для расчёта

function showSkidThicknessRow(){
  document.getElementById('skidThicknessRow').style.display = document.getElementById('skidEnabled').checked ? '' : 'none';
}
function onSkidToggle(){
  showSkidThicknessRow();
  invalidateCalc();
}

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

// ============ Запоминание галочек ============
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
persistCheckbox('skidEnabled', showSkidThicknessRow);
persistCheckbox('noRoundBoardWidths');
persistCheckbox('removeLidBottomRaskosina');
persistCheckbox('xRaskosina');
persistCheckbox('addEndTape');
persistCheckbox('addParchment');

// Толщина полоза запоминается отдельно (радиокнопки).
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
