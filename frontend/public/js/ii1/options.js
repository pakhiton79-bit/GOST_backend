// ГОСТ 10198-91, тип II-1: опции формы - толщины «в наличии», способ
// крепления груза, взаимоисключающие галочки, запоминание галочек и
// расположения досок крышки в localStorage (ключи - свои для типа II-1).
const THICKNESS_STORAGE_KEY = 'gost10198-ii1-available-thickness';
const AVAILABLE_THICKNESS_OPTIONS = [16, 19, 22, 25, 32, 40, 50, 60, 75, 100, 125, 150, 175, 200, 225, 250];
const TIME_SETTINGS_STORAGE_KEY = 'gost10198-ii1-time-settings'; // шестерёнка «Нормы времени»
const WOOD_DENSITY_STORAGE_KEY = 'gost10198-ii1-wood-density';   // шестерёнка «Массы ящика»
const FASTENING_STORAGE_KEY = 'gost10198-ii1-fastening-type';
const OPTIONS_STORAGE_PREFIX = 'gost10198-ii1-opt-';             // галочки и переключатели

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
// «Как в общих настройках»: свои толщины типа забываются, берутся общие.
function useSiteThickness(){
  try{ localStorage.removeItem(THICKNESS_STORAGE_KEY); }catch(e){}
  availableThicknesses = loadAvailableThicknesses();
  buildThicknessCheckboxList();
  updateThicknessSummary();
  invalidateCalc();
}
// Общие толщины поменяли в окне «Настройки» - тип, который берёт их,
// обновляется сразу.
window.addEventListener('site-thickness-change', () => { if(thicknessFromSite) useSiteThickness(); });

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
  if(thicknessFromSite) label.textContent += ' (общие настройки)';
  const useSite = document.getElementById('thicknessUseSite');
  if(useSite) useSite.disabled = thicknessFromSite;
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
const FASTENING_LABELS = {
  skid:         'Крепление за полозья',
  floor_boards: 'Крепление к доскам дна'
};
let fasteningType = 'floor_boards'; // по умолчанию - к доскам дна (по указанию пользователя)
try{
  const saved = localStorage.getItem(FASTENING_STORAGE_KEY);
  // Крепление за полозья временно убрано (по указанию пользователя) -
  // сохранённый выбор 'skid' не восстанавливается.
  if(/* saved === 'skid' || */ saved === 'floor_boards') fasteningType = saved;
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
  document.querySelectorAll('input[name="fasteningType"]').forEach(el=>{
    el.checked = (el.value === fasteningType);
  });
}
function toggleFasteningDropdown(){
  document.getElementById('fasteningDropdownPanel').classList.toggle('open');
}
// Переключатель способа крепления временно убран со страницы (по указанию
// пользователя) - надпись на нём не обновляется, крепление всегда к доскам дна.
// updateFasteningSummary();
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

// ============ Запоминание галочек и расположения досок крышки ============
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
function persistRadioGroup(name){
  const els = Array.from(document.querySelectorAll(`input[name="${name}"]`));
  if(els.length === 0) return;
  const key = OPTIONS_STORAGE_PREFIX + name;
  try{
    const saved = localStorage.getItem(key);
    if(saved !== null && els.some(el=>el.value===saved)){
      els.forEach(el=>{ el.checked = (el.value === saved); });
    }
  }catch(e){}
  els.forEach(el=>el.addEventListener('change', ()=>{
    if(el.checked){ try{ localStorage.setItem(key, el.value); }catch(e){} }
  }));
}
['removeFloorBoards','removeSkidBoards','forkliftLoading','solidRigidBase','roundBoardWidths','optimizeSizes','addRaskosina','xRaskosina','addParchment'].forEach(persistCheckbox);
// «Убрать доски дна» скрыта при креплении к доскам дна - сохранённая
// галочка не должна действовать незаметно.
if(fasteningType !== 'skid') document.getElementById('removeFloorBoards').checked = false;
persistRadioGroup('lidLayout');
