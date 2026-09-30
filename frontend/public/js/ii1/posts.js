// ГОСТ 10198-91, тип II-1: ручная настройка числа стоек каркаса - отдельно
// для торцевого и бокового щита (галочки «Настроить число стоек …»). У
// включённой - ползунок (штатное число ±3) и поле для любого значения от 2.
// Крайние стойки всегда по краям щита, остальные - равномерно между ними;
// расстановку считает сервер. Центр ползунка при включении - штатное число
// из последнего расчёта (до первого расчёта - 3).
const POST_COUNT_DEFAULT_CENTER = 3;
const POST_KINDS = ['torec', 'bok'];
const postCount = { torec: null, bok: null };             // null - штатно
const lastStandardPostCount = { torec: null, bok: null };
const postSliders = { torec: null, bok: null };

function postEls(kind){
  const K = kind === 'torec' ? 'Torec' : 'Bok';
  return { checkbox: 'custom' + K + 'Posts', row: kind + 'PostsRow', slider: kind + 'PostsSlider', input: kind + 'PostsInput' };
}
function postStorageKey(kind){
  return OPTIONS_STORAGE_PREFIX + kind + 'PostCount';
}
function postCountSteps(center){
  center = Math.max(2, Math.round(center));
  const steps = [];
  for(let i=-3;i<=3;i++) steps.push(Math.max(2, center+i));
  return Array.from(new Set(steps)).sort((a,b)=>a-b);
}
function savePostCount(kind){
  try{ localStorage.setItem(postStorageKey(kind), postCount[kind] === null ? '' : String(postCount[kind])); }catch(e){}
}
function rebuildPostSlider(kind, center, value){
  const els = postEls(kind);
  postSliders[kind] = createJumpSlider(document.getElementById(els.slider), postCountSteps(center), v=>{
    postCount[kind] = v;
    document.getElementById(els.input).value = v;
    savePostCount(kind);
    invalidateCalc();
  });
  postSliders[kind].setValue(value);
}
function showPostCount(kind, value, center){
  const els = postEls(kind);
  postCount[kind] = value;
  document.getElementById(els.row).style.display = '';
  document.getElementById(els.input).value = value;
  rebuildPostSlider(kind, center, value);
}

function onPostCountCheckboxChange(kind){
  const els = postEls(kind);
  if(document.getElementById(els.checkbox).checked){
    const center = lastStandardPostCount[kind] || POST_COUNT_DEFAULT_CENTER;
    showPostCount(kind, center, center);
  } else {
    document.getElementById(els.row).style.display = 'none';
    postCount[kind] = null;
  }
  savePostCount(kind);
  invalidateCalc();
}
function onPostCountInputChange(kind){
  const v = parseInt(document.getElementById(postEls(kind).input).value, 10);
  if(!(v >= 2)) return;
  postCount[kind] = v;
  if(postSliders[kind]) postSliders[kind].setValue(v);
  savePostCount(kind);
  invalidateCalc();
}

// После расчёта - запомнить штатное число стоек (центр ползунков).
function updatePostCountsFromCalc(calc){
  lastStandardPostCount.torec = calc.standardTorecPostCount;
  lastStandardPostCount.bok = calc.standardBokPostCount;
}

// Восстановление при открытии страницы.
POST_KINDS.forEach(kind=>{
  let saved = null;
  try{ const raw = localStorage.getItem(postStorageKey(kind)); if(raw) saved = parseInt(raw, 10); }catch(e){}
  if(!(saved >= 2)) return;
  document.getElementById(postEls(kind).checkbox).checked = true;
  showPostCount(kind, saved, saved);
});
