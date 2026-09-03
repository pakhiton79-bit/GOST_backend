// ГОСТ 10198-91, тип II-1 - UI: фильтр толщин "в наличии" + тип крепления
// груза. Перенесено из src/ii1/ui.js исходного (фронтенд-only) репозитория
// pakhiton79-bit/GOST_10198-91 - roundUpToAvailable/thicknessLimitExceeded
// здесь больше не нужны (расчёт и связанное предупреждение теперь на
// сервере, см. js/ii1/calc-ii1.js), availableThicknesses остаётся клиентским
// состоянием (собирается в тело запроса к /api/ii1/calculate).
const THICKNESS_STORAGE_KEY = 'silvan-gost10198-ii1-available-thickness';
const AVAILABLE_THICKNESS_OPTIONS = [16, 19, 22, 25, 32, 40, 50, 60, 75, 100, 125, 150, 175, 200, 225, 250];

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

// Прячет "Расчёт выполнен" при любом изменении входных данных или таблицы
// деталей. Если расчёт уже хоть раз показывался (#results видим) - вместо
// галочки показываем краткую подсказку "устарело" (см. #calcOutdated в
// frontend/public/ii1.html) - до первого расчёта её показывать нечего.
function invalidateCalc(){
  document.getElementById('calcCheck').style.display = 'none';
  const outdated = document.getElementById('calcOutdated');
  const results = document.getElementById('results');
  if(outdated) outdated.style.display = (results && results.style.display === 'block') ? 'inline-flex' : 'none';
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

// ============ Тип крепления груза (за полозья / к доскам дна) ============
// В отличие от типа I-3, здесь это не переключение между двумя собранными
// файлами (в I-3 - разные файлы из-за разной толщины доски дна), а простой
// переключатель на одной странице - доска дна пересчитывается на лету через
// параметр fasteningType в теле запроса к /api/ii1/calculate.
const FASTENING_STORAGE_KEY = 'silvan-gost10198-ii1-fastening-type';
const FASTENING_LABELS = {
  skid:         'Крепление за полозья',
  floor_boards: 'Крепление к доскам дна'
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
  document.getElementById('removeFloorBoardsRow').style.display = fasteningType === 'skid' ? '' : 'none';
  if(fasteningType !== 'skid'){
    document.getElementById('removeFloorBoards').checked = false;
  }
  invalidateCalc();
}
function updateFasteningSummary(){
  document.getElementById('fasteningDropdownLabel').textContent = FASTENING_LABELS[fasteningType];
  document.querySelectorAll('input[name="fasteningType"]').forEach(el=>{
    el.checked = (el.value === fasteningType);
  });
}
function toggleFasteningDropdown(){
  document.getElementById('fasteningDropdownPanel').classList.toggle('open');
}
updateFasteningSummary();
document.getElementById('removeFloorBoardsRow').style.display = fasteningType === 'skid' ? '' : 'none';

// «Убрать подполозные доски» и «Погрузка авто/электропогрузчиком» - взаимоисключающие
// (см. тот же комментарий в типе I-3).
function onSkidForkliftExclusive(el){
  if(el.checked){
    const otherId = el.id === 'removeSkidBoards' ? 'forkliftLoading' : 'removeSkidBoards';
    const other = document.getElementById(otherId);
    if(other && other.checked) other.checked = false;
  }
  invalidateCalc();
}
