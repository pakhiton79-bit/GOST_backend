// ГОСТ 2991-85, тип I: опции формы. Галочки запоминаются в localStorage
// (ключи - свои для типа).
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
