// ГОСТ 2991-85, тип I: опции формы - толщины и ширины «в наличии»
// (js/g2991/stock.js), порода, галочки. Всё запоминается в localStorage
// (ключи - свои для типа).
const OPTIONS_STORAGE_PREFIX = 'gost2991-i-opt-';
const TIME_SETTINGS_STORAGE_KEY = 'gost2991-i-time-settings'; // шестерёнка «Нормы времени»
const WOOD_DENSITY_STORAGE_KEY = 'gost2991-i-wood-density';   // шестерёнка «Массы ящика»

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
function persistRadioGroup(name){
  const els = Array.from(document.querySelectorAll(`input[name="${name}"]`));
  const key = OPTIONS_STORAGE_PREFIX + name;
  try{
    const saved = localStorage.getItem(key);
    if(saved !== null && els.some(el => el.value === saved)) els.forEach(el => { el.checked = el.value === saved; });
  }catch(e){}
  els.forEach(el => el.addEventListener('change', () => {
    if(el.checked){ try{ localStorage.setItem(key, el.value); }catch(e){} }
  }));
}
['concentrated', 'packet', 'noRoundBoardWidths', 'noLid'].forEach(id => persistCheckbox(id));
persistRadioGroup('species');

// Толщины и ширины «в наличии»; общие - из раздела «ГОСТ 2991-85» окна
// «Настройки».
document.getElementById('thicknessCard').innerHTML = stockPickerCardHtml('thickness', 'Толщины пиломатериала в наличии');
document.getElementById('widthCard').innerHTML = stockPickerCardHtml('width', 'Ширины пиломатериала в наличии');
const thicknessPicker = makeStockPicker({ id: 'thickness', storageKey: 'gost2991-i-available-thickness',
  options: SITE_G2991_THICKNESS_OPTIONS, siteList: 'thickness2991', what: 'Толщины', onChange: invalidateCalc });
const widthPicker = makeStockPicker({ id: 'width', storageKey: 'gost2991-i-available-width',
  options: SITE_G2991_WIDTH_OPTIONS, siteList: 'width2991', what: 'Ширины', onChange: invalidateCalc });
// Основная ширина доски - из общих настроек; поменяли - расчёт устарел.
window.addEventListener('site-thickness-change', e => { if(e.detail && e.detail.list === 'mainWidth2991') invalidateCalc(); });
