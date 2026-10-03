// ГОСТ 10198-91, тип I-4: ручная настройка поясов планок (как у I-1) - две
// взаимоисключающие галочки «Настроить число поясов планок» и «Настроить
// расстояние между краями поясов планок». У включённой - ползунок (шаг 1
// пояс или 50 мм, по 3 шага в каждую сторону от центра) и поле для любого
// значения, в т.ч. вне ползунка.
//
// Центр ползунка при включении галочки - штатное значение из последнего
// расчёта; до первого расчёта - 4 пояса / 400 мм. После пересчёта ползунок
// сам не перестраивается, чтобы не сбить выбранное значение.
const PLANK_LAYOUT_STORAGE_KEY = OPTIONS_STORAGE_PREFIX + 'plankLayout';
const PLANK_COUNT_DEFAULT_CENTER = 4;
const PLANK_GAP_DEFAULT_CENTER = 400;
const PLANK_GAP_STEP = 50;
// Предел расстояния до первого расчёта (пока длина доски неизвестна) - только
// чтобы отсечь бессмысленный ввод.
const PLANK_GAP_FALLBACK_MAX = 20000;

let plankLayoutMode = null; // null | 'count' | 'gap'
let plankLayoutValue = null;
// Из последнего успешного расчёта (см. calculateNow в calc-i4.js).
let lastStandardPlankCount = null;
let lastStandardPlankGap = null;
let lastKLen = null; // длина крышки
let plankCountSlider = null, plankGapSlider = null;

// Расстояние между поясами не может быть больше длины крышки.
function plankGapMax(){
  return lastKLen || PLANK_GAP_FALLBACK_MAX;
}

function plankCountSteps(center){
  center = Math.max(2, Math.round(center));
  const steps = [];
  for(let i=-3;i<=3;i++) steps.push(Math.max(2, center+i));
  return Array.from(new Set(steps)).sort((a,b)=>a-b);
}
function plankGapSteps(center){
  const max = plankGapMax();
  center = Math.min(max, Math.max(1, Math.round(center)));
  const steps = [];
  for(let i=-3;i<=3;i++) steps.push(Math.min(max, Math.max(1, center+i*PLANK_GAP_STEP)));
  return Array.from(new Set(steps)).sort((a,b)=>a-b);
}

function savePlankLayout(){
  try{ localStorage.setItem(PLANK_LAYOUT_STORAGE_KEY, JSON.stringify({mode: plankLayoutMode, value: plankLayoutValue})); }catch(e){}
}
function loadPlankLayout(){
  try{
    const raw = localStorage.getItem(PLANK_LAYOUT_STORAGE_KEY);
    if(raw){
      const parsed = JSON.parse(raw);
      if((parsed.mode === 'count' || parsed.mode === 'gap') && parsed.value > 0) return parsed;
    }
  }catch(e){}
  return {mode:null, value:null};
}

// Элементы формы для режима: галочка, строка с ползунком, ползунок, поле.
function plankLayoutEls(mode){
  return mode === 'count'
    ? {checkbox:'customPlankCount', row:'plankCountRow', slider:'plankCountSlider', input:'plankCountInput'}
    : {checkbox:'customPlankGap', row:'plankGapRow', slider:'plankGapSlider', input:'plankGapInput'};
}

// Пересоздаёт ползунок режима с шагами вокруг center и ставит его на value.
function rebuildPlankSlider(mode, center, value){
  const els = plankLayoutEls(mode);
  const steps = mode === 'count' ? plankCountSteps(center) : plankGapSteps(center);
  const slider = createJumpSlider(document.getElementById(els.slider), steps, v=>{
    plankLayoutValue = v;
    document.getElementById(els.input).value = v;
    savePlankLayout();
    invalidateCalc();
  });
  if(mode === 'count') plankCountSlider = slider; else plankGapSlider = slider;
  slider.setValue(value);
}

function onPlankLayoutCheckboxChange(mode){
  const countEl = document.getElementById('customPlankCount');
  const gapEl = document.getElementById('customPlankGap');
  if(mode === 'count' && countEl.checked) gapEl.checked = false;
  if(mode === 'gap' && gapEl.checked) countEl.checked = false;

  plankLayoutMode = countEl.checked ? 'count' : gapEl.checked ? 'gap' : null;
  document.getElementById('plankCountRow').style.display = plankLayoutMode==='count' ? '' : 'none';
  document.getElementById('plankGapRow').style.display = plankLayoutMode==='gap' ? '' : 'none';

  if(plankLayoutMode === 'count'){
    const center = lastStandardPlankCount || PLANK_COUNT_DEFAULT_CENTER;
    plankLayoutValue = center;
    document.getElementById('plankCountInput').value = center;
    rebuildPlankSlider('count', center, center);
  } else if(plankLayoutMode === 'gap'){
    const gapInput = document.getElementById('plankGapInput');
    gapInput.max = plankGapMax();
    const center = Math.min(plankGapMax(), Math.round(lastStandardPlankGap || PLANK_GAP_DEFAULT_CENTER));
    plankLayoutValue = center;
    gapInput.value = center;
    rebuildPlankSlider('gap', center, center);
  }
  savePlankLayout();
  invalidateCalc();
}

function onPlankCountInputChange(){
  const v = parseInt(document.getElementById('plankCountInput').value, 10);
  if(!(v>=2)) return;
  plankLayoutValue = v;
  if(plankCountSlider) plankCountSlider.setValue(v);
  savePlankLayout();
  invalidateCalc();
}
function onPlankGapInputChange(){
  const gapInput = document.getElementById('plankGapInput');
  const raw = parseFloat(String(gapInput.value).replace(',','.'));
  if(!(raw>0)) return;
  const v = Math.min(plankGapMax(), raw);
  if(v !== raw) gapInput.value = v; // подрезали до предела - видно в поле
  plankLayoutValue = v;
  if(plankGapSlider) plankGapSlider.setValue(v);
  savePlankLayout();
  invalidateCalc();
}

// После расчёта: запомнить штатные значения и длину крышки; если заданное
// расстояние теперь больше длины крышки - подрезать его.
function updatePlankLayoutFromCalc(calc){
  lastStandardPlankCount = calc.standardPlankCount;
  lastStandardPlankGap = calc.standardPlankGap;
  lastKLen = calc.k9Base;
  if(plankLayoutMode === 'gap' && plankLayoutValue > lastKLen){
    plankLayoutValue = lastKLen;
    const gapInput = document.getElementById('plankGapInput');
    gapInput.max = lastKLen;
    gapInput.value = lastKLen;
    rebuildPlankSlider('gap', lastKLen, lastKLen);
    savePlankLayout();
  }
}

// Восстановление при открытии страницы: центр ползунка - само сохранённое
// значение (штатное ещё неизвестно).
(function initPlankLayoutFromStorage(){
  const saved = loadPlankLayout();
  if(!saved.mode) return;
  const els = plankLayoutEls(saved.mode);
  if(saved.mode === 'gap') saved.value = Math.min(plankGapMax(), saved.value);
  document.getElementById(els.checkbox).checked = true;
  plankLayoutMode = saved.mode;
  plankLayoutValue = saved.value;
  document.getElementById(els.row).style.display = '';
  if(saved.mode === 'gap') document.getElementById('plankGapInput').max = plankGapMax();
  document.getElementById(els.input).value = saved.value;
  rebuildPlankSlider(saved.mode, saved.value, saved.value);
})();
