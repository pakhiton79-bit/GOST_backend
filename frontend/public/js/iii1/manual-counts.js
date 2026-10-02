// ГОСТ 10198-91, тип III-1: ручная настройка числа деталей - стоек каркаса
// (отдельно для торцевого и бокового щита) и поперечных брусьев крышки
// (галочки «Настроить число …»), а также расстояния между осями поперечных
// брусьев крышки. У включённой - ползунок и поле для любого значения от 2
// (расстояние - от 500 до 800 мм). Ползунок стоек - штатное число ±3,
// брусьев крышки - все числа от 2 до наибольшего, при котором расчёт не
// блокируется (из последнего расчёта; до первого расчёта - штатное ±3),
// расстояния - 500-800 мм с шагом 50. Расстановку считает сервер: крайние
// стойки - по краям щита, остальные равномерно между ними; брусья крышки -
// крайние по концам крышки, остальные равномерно между ними. Центр
// ползунка при включении - штатное число из последнего расчёта (до первого
// расчёта - 3), расстояния - 700 мм.
// Галочки числа и расстояния брусьев крышки взаимоисключающие.
const MANUAL_COUNT_DEFAULT_CENTER = 3;
const CROSS_AXIS_STEPS = [500, 550, 600, 650, 700, 750, 800];
// kind -> id элементов, ключ localStorage, поля штатного и наибольшего
// (только у брусьев крышки) числа в ответе сервера; у расстояния - свои
// шаги ползунка (steps), пределы (min, max), значение при включении (center)
// и взаимоисключающая галочка (exclusive).
const MANUAL_COUNTS = {
  torec: { checkbox: 'customTorecPosts', row: 'torecPostsRow', slider: 'torecPostsSlider', input: 'torecPostsInput',
           storageKey: OPTIONS_STORAGE_PREFIX + 'torecPostCount', standardField: 'standardTorecPostCount' },
  bok:   { checkbox: 'customBokPosts', row: 'bokPostsRow', slider: 'bokPostsSlider', input: 'bokPostsInput',
           storageKey: OPTIONS_STORAGE_PREFIX + 'bokPostCount', standardField: 'standardBokPostCount' },
  cross: { checkbox: 'customCrossBeams', row: 'crossBeamsRow', slider: 'crossBeamsSlider', input: 'crossBeamsInput',
           storageKey: OPTIONS_STORAGE_PREFIX + 'crossBeamCount', standardField: 'standardCrossBeamCount', maxField: 'maxCrossBeamCount', exclusive: 'crossAxis' },
  crossAxis: { checkbox: 'customCrossAxis', row: 'crossAxisRow', slider: 'crossAxisSlider', input: 'crossAxisInput',
           storageKey: OPTIONS_STORAGE_PREFIX + 'crossBeamAxis', steps: CROSS_AXIS_STEPS, min: 500, max: 800, center: 700, exclusive: 'cross' },
};
const manualCount = { torec: null, bok: null, cross: null, crossAxis: null };   // null - штатно
const lastStandardCount = { torec: null, bok: null, cross: null, crossAxis: null };
const lastMaxCount = { torec: null, bok: null, cross: null, crossAxis: null };
const manualCountSliders = { torec: null, bok: null, cross: null, crossAxis: null };

// Значение поля допустимо: число от 2 (у расстояния - от min до max).
function manualCountValid(kind, v){
  const els = MANUAL_COUNTS[kind];
  return v >= (els.min || 2) && (!els.max || v <= els.max);
}

function manualCountSteps(kind, center){
  if(MANUAL_COUNTS[kind].steps) return MANUAL_COUNTS[kind].steps;
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

function hideManualCount(kind){
  document.getElementById(MANUAL_COUNTS[kind].row).style.display = 'none';
  manualCount[kind] = null;
  saveManualCount(kind);
}

function onManualCountCheckboxChange(kind){
  const els = MANUAL_COUNTS[kind];
  if(document.getElementById(els.checkbox).checked){
    if(els.exclusive){
      document.getElementById(MANUAL_COUNTS[els.exclusive].checkbox).checked = false;
      hideManualCount(els.exclusive);
    }
    const center = els.center || lastStandardCount[kind] || MANUAL_COUNT_DEFAULT_CENTER;
    showManualCount(kind, center, center);
    saveManualCount(kind);
  } else {
    hideManualCount(kind);
  }
  invalidateCalc();
}
function onManualCountInputChange(kind){
  const v = parseInt(document.getElementById(MANUAL_COUNTS[kind].input).value, 10);
  if(!manualCountValid(kind, v)) return;
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
    if(!els.standardField) return;
    lastStandardCount[kind] = calc[els.standardField];
    if(!els.maxField) return;
    lastMaxCount[kind] = calc[els.maxField];
    if(manualCount[kind] !== null) rebuildManualCountSlider(kind, manualCount[kind], manualCount[kind]);
  });
}

// Восстановление при открытии страницы (из взаимоисключающих - первая
// сохранённая).
Object.keys(MANUAL_COUNTS).forEach(kind=>{
  let saved = null;
  try{ const raw = localStorage.getItem(MANUAL_COUNTS[kind].storageKey); if(raw) saved = parseInt(raw, 10); }catch(e){}
  if(!manualCountValid(kind, saved)) return;
  const exclusive = MANUAL_COUNTS[kind].exclusive;
  if(exclusive && manualCount[exclusive] !== null) return;
  document.getElementById(MANUAL_COUNTS[kind].checkbox).checked = true;
  showManualCount(kind, saved, saved);
});
