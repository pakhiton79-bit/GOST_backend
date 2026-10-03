// ГОСТ 10198-91, тип II-1: ручная настройка числа деталей - стоек каркаса
// (отдельно для торцевого и бокового щита) и поперечных брусьев крышки
// (галочки «Настроить число …»). У включённой - ползунок и поле для любого
// значения от 2. Ползунок стоек - штатное число ±3, брусьев крышки - все
// числа от 2 до наибольшего, при котором расчёт не блокируется (из
// последнего расчёта; до первого расчёта - штатное ±3). Расстановку считает
// сервер: крайние стойки - по краям щита, остальные равномерно между ними;
// брусья крышки - равномерно, отступы от стенок равны промежуткам. Центр ползунка при включении -
// штатное число из последнего расчёта (до первого расчёта - 3).
const MANUAL_COUNT_DEFAULT_CENTER = 3;
// kind -> id элементов, ключ localStorage, поля штатного и наибольшего
// (только у брусьев крышки) числа в ответе сервера.
const MANUAL_COUNTS = {
  torec: { checkbox: 'customTorecPosts', row: 'torecPostsRow', slider: 'torecPostsSlider', input: 'torecPostsInput',
           storageKey: OPTIONS_STORAGE_PREFIX + 'torecPostCount', standardField: 'standardTorecPostCount' },
  bok:   { checkbox: 'customBokPosts', row: 'bokPostsRow', slider: 'bokPostsSlider', input: 'bokPostsInput',
           storageKey: OPTIONS_STORAGE_PREFIX + 'bokPostCount', standardField: 'standardBokPostCount' },
  cross: { checkbox: 'customCrossBeams', row: 'crossBeamsRow', slider: 'crossBeamsSlider', input: 'crossBeamsInput',
           storageKey: OPTIONS_STORAGE_PREFIX + 'crossBeamCount', standardField: 'standardCrossBeamCount', maxField: 'maxCrossBeamCount' },
};
const manualCount = { torec: null, bok: null, cross: null };   // null - штатно
const lastStandardCount = { torec: null, bok: null, cross: null };
const lastMaxCount = { torec: null, bok: null, cross: null };
const manualCountSliders = { torec: null, bok: null, cross: null };

function manualCountSteps(kind, center){
  const steps = [];
  if(lastMaxCount[kind] >= 2){
    for(let v=2; v<=lastMaxCount[kind]; v++) steps.push(v);
  } else {
    center = Math.max(2, Math.round(center));
    for(let i=-3;i<=3;i++) steps.push(Math.max(2, center+i));
  }
  return Array.from(new Set(steps)).sort((a,b)=>a-b);
}
function saveManualCount(kind){
  try{ localStorage.setItem(MANUAL_COUNTS[kind].storageKey, manualCount[kind] === null ? '' : String(manualCount[kind])); }catch(e){}
}
function rebuildManualCountSlider(kind, center, value){
  const els = MANUAL_COUNTS[kind];
  manualCountSliders[kind] = createJumpSlider(document.getElementById(els.slider), manualCountSteps(kind, center), v=>{
    manualCount[kind] = v;
    document.getElementById(els.input).value = v;
    saveManualCount(kind);
    invalidateCalc();
  });
  manualCountSliders[kind].setValue(value);
}
function showManualCount(kind, value, center){
  const els = MANUAL_COUNTS[kind];
  manualCount[kind] = value;
  document.getElementById(els.row).style.display = '';
  document.getElementById(els.input).value = value;
  rebuildManualCountSlider(kind, center, value);
}

function onManualCountCheckboxChange(kind){
  const els = MANUAL_COUNTS[kind];
  if(document.getElementById(els.checkbox).checked){
    const center = lastStandardCount[kind] || MANUAL_COUNT_DEFAULT_CENTER;
    showManualCount(kind, center, center);
  } else {
    document.getElementById(els.row).style.display = 'none';
    manualCount[kind] = null;
  }
  saveManualCount(kind);
  invalidateCalc();
}
function onManualCountInputChange(kind){
  const v = parseInt(document.getElementById(MANUAL_COUNTS[kind].input).value, 10);
  if(!(v >= 2)) return;
  manualCount[kind] = v;
  if(manualCountSliders[kind]) manualCountSliders[kind].setValue(v);
  saveManualCount(kind);
  invalidateCalc();
}

// После расчёта - запомнить штатные числа (центр ползунков) и наибольшие;
// включённый ползунок с наибольшим числом - перестроить под новый диапазон.
function updateManualCountsFromCalc(calc){
  Object.keys(MANUAL_COUNTS).forEach(kind=>{
    const els = MANUAL_COUNTS[kind];
    lastStandardCount[kind] = calc[els.standardField];
    if(!els.maxField) return;
    lastMaxCount[kind] = calc[els.maxField];
    if(manualCount[kind] !== null) rebuildManualCountSlider(kind, manualCount[kind], manualCount[kind]);
  });
}

// Восстановление при открытии страницы.
Object.keys(MANUAL_COUNTS).forEach(kind=>{
  let saved = null;
  try{ const raw = localStorage.getItem(MANUAL_COUNTS[kind].storageKey); if(raw) saved = parseInt(raw, 10); }catch(e){}
  if(!(saved >= 2)) return;
  document.getElementById(MANUAL_COUNTS[kind].checkbox).checked = true;
  showManualCount(kind, saved, saved);
});
