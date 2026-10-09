// ГОСТ 2991-85, тип I: опции формы. Галочки запоминаются в localStorage
// (ключи - свои для типа).
const THICKNESS_STORAGE_KEY = 'gost2991-i-available-thickness';
// Толщины «в наличии» для ГОСТ 2991-85 (по указанию пользователя, только
// для этого ГОСТа): каждый 1 мм от минимальной до максимальной толщины его
// таблиц (9-25 мм: таблицы 2 и 3) плюс все толщины сайта (16-250 мм).
const G2991_THICKNESS_OPTIONS = [...new Set([
  ...Array.from({ length: 25 - 9 + 1 }, (_, i) => 9 + i),
  16, 19, 22, 25, 32, 40, 50, 60, 75, 100, 125, 150, 175, 200, 225, 250,
])].sort((a, b) => a - b);
const OPTIONS_STORAGE_PREFIX = 'gost2991-i-opt-';

// Любое изменение параметров: после первого расчёта показывается «Нажмите
// «Рассчитать»» (см. markCalcChanged в common-calc-state.js).
function invalidateCalc(){
  markCalcChanged();
}

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
persistCheckbox('noLid');

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
    if(!raw) return siteAvailableThicknesses().filter(v => G2991_THICKNESS_OPTIONS.includes(v));
    const arr = JSON.parse(raw).filter(v => G2991_THICKNESS_OPTIONS.includes(v));
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
  G2991_THICKNESS_OPTIONS.forEach(t=>{
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
  availableThicknesses = state ? G2991_THICKNESS_OPTIONS.slice() : [];
  buildThicknessCheckboxList();
  saveAvailableThicknesses();
  updateThicknessSummary();
  invalidateCalc();
}

// Надпись на кнопке списка и предупреждение, если ничего не выбрано.
function updateThicknessSummary(){
  const label = document.getElementById('thicknessDropdownLabel');
  const note  = document.getElementById('thicknessNote');
  const total = G2991_THICKNESS_OPTIONS.length;
  if(availableThicknesses.length === 0){
    label.textContent = 'Толщины не выбраны - расчёт строго по ГОСТ';
    note.innerHTML = '⚠ Толщины «в наличии» не выбраны - расчёт по ГОСТ 2991-85 без округления.';
    note.style.display = 'block';
  } else if(availableThicknesses.length === total){
    label.textContent = `Выбраны все толщины (${G2991_THICKNESS_OPTIONS[0]}-${G2991_THICKNESS_OPTIONS[total-1]} мм)`;
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
