// ГОСТ 10198-91, тип I-4: ручная настройка внутренних поперечных брусьев
// крышки - две взаимоисключающие галочки:
//   «Настроить число поперечных брусьев» - брусья равномерно по длине крышки
//     (отступ от края = зазору); ползунок - штатное число ±3;
//   «Настроить расстояние между краями поперечных брусьев» - вместо штатных
//     800 мм свой зазор; ползунок 500-1100 мм с шагом 100.
// У обеих - поле для любого значения. Расстановку считает сервер.
const BEAM_GAP_STANDARD = 800;
const BEAM_GAP_STORAGE_KEY = OPTIONS_STORAGE_PREFIX + 'beamGap';
const BEAM_COUNT_STORAGE_KEY = OPTIONS_STORAGE_PREFIX + 'beamCount';
const BEAM_COUNT_DEFAULT_CENTER = 3; // до первого расчёта

let beamGapValue = null;   // null - штатные 800 мм
let beamCountValue = null; // null - по зазору
let lastStandardBeamCount = null; // из последнего успешного расчёта
let beamCountSlider = null;

// ============ Расстояние между брусьями ============
function beamGapSteps(){
  const steps = [];
  for(let i=-3;i<=3;i++) steps.push(BEAM_GAP_STANDARD + i*100);
  return steps;
}
function saveBeamGap(){
  try{ localStorage.setItem(BEAM_GAP_STORAGE_KEY, beamGapValue === null ? '' : String(beamGapValue)); }catch(e){}
}
const beamGapSlider = createJumpSlider(document.getElementById('beamGapSlider'), beamGapSteps(), v=>{
  beamGapValue = v;
  document.getElementById('beamGapInput').value = v;
  saveBeamGap();
  invalidateCalc();
});
function setBeamGapUI(v){
  document.getElementById('beamGapInput').value = v;
  beamGapSlider.setValue(v);
}
function setBeamGapOff(){
  document.getElementById('customBeamGap').checked = false;
  document.getElementById('beamGapRow').style.display = 'none';
  beamGapValue = null;
  saveBeamGap();
}
function onBeamGapCheckboxChange(){
  const on = document.getElementById('customBeamGap').checked;
  if(on && document.getElementById('customBeamCount').checked) setBeamCountOff();
  document.getElementById('beamGapRow').style.display = on ? '' : 'none';
  beamGapValue = on ? BEAM_GAP_STANDARD : null;
  setBeamGapUI(BEAM_GAP_STANDARD);
  saveBeamGap();
  invalidateCalc();
}
function onBeamGapInputChange(){
  const v = parseFloat(String(document.getElementById('beamGapInput').value).replace(',', '.'));
  if(!(v > 0)) return;
  beamGapValue = v;
  beamGapSlider.setValue(v);
  saveBeamGap();
  invalidateCalc();
}
(function initBeamGapFromStorage(){
  let saved = null;
  try{ const raw = localStorage.getItem(BEAM_GAP_STORAGE_KEY); if(raw) saved = parseFloat(raw); }catch(e){}
  if(saved > 0){
    beamGapValue = saved;
    document.getElementById('customBeamGap').checked = true;
    document.getElementById('beamGapRow').style.display = '';
    setBeamGapUI(saved);
  } else {
    setBeamGapUI(BEAM_GAP_STANDARD);
  }
})();

// ============ Число брусьев ============
function beamCountSteps(center){
  center = Math.max(1, Math.round(center));
  const steps = [];
  for(let i=-3;i<=3;i++) steps.push(Math.max(1, center+i));
  return Array.from(new Set(steps)).sort((a,b)=>a-b);
}
function saveBeamCount(){
  try{ localStorage.setItem(BEAM_COUNT_STORAGE_KEY, beamCountValue === null ? '' : String(beamCountValue)); }catch(e){}
}
function rebuildBeamCountSlider(center, value){
  beamCountSlider = createJumpSlider(document.getElementById('beamCountSlider'), beamCountSteps(center), v=>{
    beamCountValue = v;
    document.getElementById('beamCountInput').value = v;
    saveBeamCount();
    invalidateCalc();
  });
  beamCountSlider.setValue(value);
}
function setBeamCountOff(){
  document.getElementById('customBeamCount').checked = false;
  document.getElementById('beamCountRow').style.display = 'none';
  beamCountValue = null;
  saveBeamCount();
}
function showBeamCount(value, center){
  beamCountValue = value;
  document.getElementById('beamCountRow').style.display = '';
  document.getElementById('beamCountInput').value = value;
  rebuildBeamCountSlider(center, value);
}
function onBeamCountCheckboxChange(){
  const on = document.getElementById('customBeamCount').checked;
  if(!on){ setBeamCountOff(); invalidateCalc(); return; }
  if(document.getElementById('customBeamGap').checked) setBeamGapOff();
  const center = lastStandardBeamCount || BEAM_COUNT_DEFAULT_CENTER;
  showBeamCount(center, center);
  saveBeamCount();
  invalidateCalc();
}
function onBeamCountInputChange(){
  const v = parseInt(document.getElementById('beamCountInput').value, 10);
  if(!(v >= 1)) return;
  beamCountValue = v;
  if(beamCountSlider) beamCountSlider.setValue(v);
  saveBeamCount();
  invalidateCalc();
}
// Восстановление при открытии страницы; если сохранены обе галочки - число
// главнее.
(function initBeamCountFromStorage(){
  let saved = null;
  try{ const raw = localStorage.getItem(BEAM_COUNT_STORAGE_KEY); if(raw) saved = parseInt(raw, 10); }catch(e){}
  if(!(saved >= 1)) return;
  if(document.getElementById('customBeamGap').checked) setBeamGapOff();
  document.getElementById('customBeamCount').checked = true;
  showBeamCount(saved, saved);
})();
