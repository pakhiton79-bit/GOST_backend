// ГОСТ 10198-91, тип I-3: опции формы - толщины «в наличии», способ крепления
// груза, взаимоисключающие галочки и запоминание галочек в localStorage
// (ключи - свои для типа I-3, «t1-k3»).
const THICKNESS_STORAGE_KEY = 'gost10198-t1-k3-available-thickness';
// До 250 мм: Табл. 19 при тяжёлых грузах требует сечений полоза до 225×250.
const AVAILABLE_THICKNESS_OPTIONS = [16, 19, 22, 25, 32, 40, 50, 60, 75, 100, 125, 150, 175, 200, 225, 250];
const TIME_SETTINGS_STORAGE_KEY = 'gost10198-t1-k3-time-settings'; // шестерёнка «Нормы времени»
const WOOD_DENSITY_STORAGE_KEY = 'gost10198-t1-k3-wood-density';   // шестерёнка «Массы ящика»
const FASTENING_STORAGE_KEY = 'gost10198-t1-k3-fastening-type';
const OPTIONS_STORAGE_PREFIX = 'gost10198-t1-k3-opt-';             // галочки и настройки

// ============ Толщины «в наличии» ============
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

// Любое изменение параметров: после первого расчёта показывается «Нажмите
// «Рассчитать»» (вернули как было - снова «Расчёт выполнен»), см.
// markCalcChanged в common-calc-state.js.
function invalidateCalc(){
  markCalcChanged();
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

// ============ Способ крепления груза ============
// За полозья / к доскам дна (variant в запросе); остальные два - пока
// недоступны в разметке.
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

// «Убрать доски дна» - только при креплении за полозья: при креплении к
// доскам дна они и есть точка крепления.
function showRemoveFloorBoardsRow(){
  document.getElementById('removeFloorBoardsRow').style.display = fasteningType === 'skid' ? '' : 'none';
}

function onFasteningTypeChange(el){
  fasteningType = el.value;
  try{ localStorage.setItem(FASTENING_STORAGE_KEY, fasteningType); }catch(e){}
  updateFasteningSummary();
  showRemoveFloorBoardsRow();
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
showRemoveFloorBoardsRow();

// «Убрать подполозные доски» и «Погрузка погрузчиком» - взаимоисключающие.
function onSkidForkliftExclusive(el){
  if(el.checked){
    const otherId = el.id === 'removeSkidBoards' ? 'forkliftLoading' : 'removeSkidBoards';
    const other = document.getElementById(otherId);
    if(other && other.checked) other.checked = false;
  }
  invalidateCalc();
}

// ============ Запоминание галочек ============
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
['optimizeSizes','roundBoardWidths','solidRigidBase','forkliftLoading','removeSkidBoards','removeFloorBoards','xRaskosina','addEndTape','addParchment'].forEach(persistCheckbox);
