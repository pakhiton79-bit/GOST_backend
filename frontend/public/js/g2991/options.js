// ГОСТ 2991-85: опции формы страницы типа (G2991_TYPE - js/g2991/<тип>/type.js)
// - толщины, ширины «в наличии» и основная ширина доски (js/g2991/stock.js),
// порода, галочки. Всё запоминается в localStorage, ключи - свои для типа.
const G2991_STORAGE_KEY = 'gost2991-' + G2991_TYPE.key + '-';
const OPTIONS_STORAGE_PREFIX = G2991_STORAGE_KEY + 'opt-';
const TIME_SETTINGS_STORAGE_KEY = G2991_STORAGE_KEY + 'time-settings'; // шестерёнка «Нормы времени»
const WOOD_DENSITY_STORAGE_KEY = G2991_STORAGE_KEY + 'wood-density';   // шестерёнка «Массы ящика»

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
G2991_TYPE.checkboxes.forEach(id => persistCheckbox(id));
persistRadioGroup('species');

// Толщины и ширины «в наличии»; общие - из раздела «ГОСТ 2991-85» окна
// «Настройки».
document.getElementById('thicknessCard').innerHTML = stockPickerCardHtml('thickness', 'Толщины пиломатериала в наличии');
document.getElementById('widthCard').innerHTML = stockPickerCardHtml('width', 'Ширины пиломатериала в наличии') + mainWidthPickerHtml('mainWidth');
const thicknessPicker = makeStockPicker({ id: 'thickness', storageKey: G2991_STORAGE_KEY + 'available-thickness',
  options: SITE_G2991_THICKNESS_OPTIONS, siteList: 'thickness2991', what: 'Толщины', onChange: invalidateCalc });
const widthPicker = makeStockPicker({ id: 'width', storageKey: G2991_STORAGE_KEY + 'available-width',
  options: SITE_G2991_WIDTH_OPTIONS, siteList: 'width2991', what: 'Ширины', onChange: () => { mainWidthPicker.refresh(); invalidateCalc(); } });
// Основная ширина доски - своя у типа (js/g2991/stock.js).
const mainWidthPicker = makeMainWidthPicker({ id: 'mainWidth', storageKey: G2991_STORAGE_KEY + 'main-width',
  options: SITE_G2991_WIDTH_OPTIONS, stock: () => widthPicker.get(), onChange: invalidateCalc });
