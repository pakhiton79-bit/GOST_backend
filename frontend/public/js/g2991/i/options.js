// ГОСТ 2991-85, тип I: опции формы. Галочки и толщины «в наличии»
// запоминаются в localStorage (ключи - свои для типа).
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

// Толщины «в наличии» (js/g2991/stock.js): 9-25 мм через 1 мм и толщины
// выше; общие - из раздела «ГОСТ 2991-85» окна «Настройки».
document.getElementById('thicknessCard').innerHTML = stockPickerCardHtml('thickness', 'Толщины пиломатериала в наличии');
const thicknessPicker = makeStockPicker({ id: 'thickness', storageKey: 'gost2991-i-available-thickness',
  options: SITE_G2991_THICKNESS_OPTIONS, siteList: 'thickness2991', what: 'Толщины', onChange: invalidateCalc });
