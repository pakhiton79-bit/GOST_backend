// ГОСТ 10198-91, тип I-3 - слой отображения (UI, вызов бэкенд-API, чертежи,
// печать). Перенесён из src/app.js исходного (фронтенд-only) репозитория
// pakhiton79-bit/GOST_10198-91: сам расчёт (computeGost10198I3) там
// выполнялся локально в браузере, здесь - на сервере (POST /api/i3/calculate,
// см. backend/server.js) - calculate() поэтому стала асинхронной, остальная
// логика (чтение полей, отрисовка таблиц/чертежей, печать) не менялась.
// I3_VARIANT ('skid' | 'floor_boards') задаётся инлайн-скриптом в самой HTML
// странице до подключения этого файла - см. i3-skid.html/i3-floor.html
// (замена двум раздельным файлам GOST10198_91POLOZIA.html/DOSKI_DNA.html,
// собиравшимся build.py из общего шаблона).

// ============ Фильтр толщин пиломатериала "в наличии" ============
const THICKNESS_STORAGE_KEY = 'silvan-gost10198-t1-k3-available-thickness';
const AVAILABLE_THICKNESS_OPTIONS = [16, 19, 22, 25, 32, 40, 50, 60, 75, 100, 125, 150, 175, 200];

function loadAvailableThicknesses(){
  try{
    const raw = localStorage.getItem(THICKNESS_STORAGE_KEY);
    if(!raw) return [];
    const arr = JSON.parse(raw).filter(v => AVAILABLE_THICKNESS_OPTIONS.includes(v));
    return arr.sort((a,b)=>a-b);
  }catch(e){ return []; }
}
function saveAvailableThicknesses(){
  try{ localStorage.setItem(THICKNESS_STORAGE_KEY, JSON.stringify(availableThicknesses)); }catch(e){}
}

let availableThicknesses = loadAvailableThicknesses();

function buildThicknessCheckboxList(){
  const list = document.getElementById('thicknessCheckboxList');
  let html = '';
  AVAILABLE_THICKNESS_OPTIONS.forEach(t=>{
    const checked = availableThicknesses.includes(t) ? ' checked' : '';
    html += `<label><input type="checkbox" value="${t}"${checked} onchange="onThicknessCheckboxChange(this)"> ${t} мм</label>`;
  });
  list.innerHTML = html;
}

function invalidateCalc(){
  document.getElementById('calcCheck').style.display = 'none';
  const outdated = document.getElementById('calcOutdated');
  const results = document.getElementById('results');
  if(outdated) outdated.style.display = (results && results.style.display === 'block') ? 'inline-flex' : 'none';
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
  availableThicknesses = state ? AVAILABLE_THICKNESS_OPTIONS.slice() : [];
  buildThicknessCheckboxList();
  saveAvailableThicknesses();
  updateThicknessSummary();
  invalidateCalc();
}

function updateThicknessSummary(){
  const label = document.getElementById('thicknessDropdownLabel');
  const note  = document.getElementById('thicknessNote');
  const total = AVAILABLE_THICKNESS_OPTIONS.length;
  if(availableThicknesses.length === 0){
    label.textContent = 'Толщины не выбраны - расчёт строго по ГОСТ';
    note.innerHTML = '⚠ Толщины «в наличии» не выбраны — расчёт по ГОСТ 10198-91 без округления.';
    note.style.display = 'block';
  } else if(availableThicknesses.length === total){
    label.textContent = `Выбраны все толщины (${AVAILABLE_THICKNESS_OPTIONS[0]}-${AVAILABLE_THICKNESS_OPTIONS[total-1]} мм)`;
    note.style.display = 'none';
  } else {
    const shown = availableThicknesses.slice(0,8).join(', ');
    const more = availableThicknesses.length > 8 ? `, ещё ${availableThicknesses.length-8} знач.` : '';
    label.textContent = `Выбрано (${availableThicknesses.length}): ${shown} мм${more}`;
    note.style.display = 'none';
  }
}

function toggleThicknessDropdown(){
  document.getElementById('thicknessDropdownPanel').classList.toggle('open');
}
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

// ============ Тип крепления груза (сечение полоза) ============
const FASTENING_STORAGE_KEY = 'silvan-gost10198-t1-k3-fastening-type';
const FASTENING_LABELS = {
  skid:           'Крепление за полозья',
  floor_boards:   'Крепление к доскам дна',
  mounting_beams: 'Крепление к крепёжным брусьям',
  frame:          'Крепление на металлической или деревянной раме'
};

let fasteningType = window.I3_VARIANT;

function onFasteningTypeChange(el){
  fasteningType = el.value;
  saveFasteningType();
  updateFasteningSummary();
  invalidateCalc();
}
function saveFasteningType(){
  try{ localStorage.setItem(FASTENING_STORAGE_KEY, fasteningType); }catch(e){}
}

function updateFasteningSummary(){
  document.getElementById('fasteningDropdownLabel').textContent = FASTENING_LABELS[fasteningType];
  document.querySelectorAll('input[name="fasteningType"]').forEach(r=>{ r.checked = (r.value === fasteningType); });
}

function toggleFasteningDropdown(){
  document.getElementById('fasteningDropdownPanel').classList.toggle('open');
}

// «За полозья» и «к доскам дна» - две отдельные страницы (i3-skid.html /
// i3-floor.html), как и в исходном репозитории (там - два отдельных собранных
// файла) - переключение передаёт текущие введённые значения через URL.
function switchFastening(targetFile, targetType){
  try{ localStorage.setItem(FASTENING_STORAGE_KEY, targetType); }catch(e){}

  const params = new URLSearchParams();
  ['L','W','H','M'].forEach(id=>{
    const v = document.getElementById(id).value;
    if(v) params.set(id, v);
  });
  ['optimizeSizes','roundBoardWidths','solidRigidBase','forkliftLoading','removeSkidBoards','removeFloorBoards'].forEach(id=>{
    const el = document.getElementById(id);
    if(el && el.checked) params.set(id, '1');
  });
  const qs = params.toString();
  window.location.href = targetFile + (qs ? '?' + qs : '');
}

function applyStateFromUrl(){
  const params = new URLSearchParams(window.location.search);
  if(![...params.keys()].length) return;
  ['L','W','H','M'].forEach(id=>{
    const v = params.get(id);
    if(v !== null) document.getElementById(id).value = v;
  });
  ['optimizeSizes','roundBoardWidths','solidRigidBase','forkliftLoading','removeSkidBoards','removeFloorBoards'].forEach(id=>{
    const el = document.getElementById(id);
    if(el && params.get(id) === '1') el.checked = true;
  });
  history.replaceState(null, '', window.location.pathname);
  calculate();
}

updateFasteningSummary();

function onSkidForkliftExclusive(el){
  if(el.checked){
    const otherId = el.id === 'removeSkidBoards' ? 'forkliftLoading' : 'removeSkidBoards';
    const other = document.getElementById(otherId);
    if(other && other.checked) other.checked = false;
  }
  invalidateCalc();
}

// Ручной ввод толщины в таблице (data-override="..." в renderSection ниже) -
// читается ДО того, как calculate() эту таблицу перерисует, и отправляется
// на сервер вместе с остальными входными данными (см. computeGost10198I3/
// ov() в backend/src/i3/compute.js). Учитываются ТОЛЬКО ячейки, реально
// отредактированные пользователем (data-user-edited, взводится обработчиком
// input ниже) - тот же приём, что и в типе I-1 (см. js/i1/calc-i1.js).
function readManualOverrides(){
  const overrides = {};
  document.querySelectorAll('#boardTables td[data-override][data-user-edited="true"]').forEach(cell=>{
    const key = cell.getAttribute('data-override');
    const val = parseFloat(cell.textContent.replace(',','.'));
    if(!Number.isNaN(val) && val>0) overrides[key] = val;
  });
  return overrides;
}

// ============ Вызов бэкенд-API и отрисовка результата ============
async function calculate(){
  const errEl = document.getElementById('err');
  errEl.textContent = '';
  const manualOverrides = readManualOverrides();
  document.getElementById('calcCheck').style.display = 'none';
  document.getElementById('calcOutdated').style.display = 'none';

  const removeFloorBoardsEl = document.getElementById('removeFloorBoards');
  const input = {
    variant: window.I3_VARIANT,
    L: parseFloat(document.getElementById('L').value),
    W: parseFloat(document.getElementById('W').value),
    H: parseFloat(document.getElementById('H').value),
    MASS: parseFloat(document.getElementById('M').value),
    optimizeSizes: document.getElementById('optimizeSizes').checked,
    removeFloorBoards: removeFloorBoardsEl ? removeFloorBoardsEl.checked : false,
    removeSkidBoards: document.getElementById('removeSkidBoards').checked,
    roundBoardWidths: document.getElementById('roundBoardWidths').checked,
    solidRigidBase: document.getElementById('solidRigidBase').checked,
    forkliftLoading: document.getElementById('forkliftLoading').checked,
    availableThicknesses,
    manualOverrides,
  };

  let calc;
  try{
    const resp = await fetch('/api/i3/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    calc = await resp.json();
  }catch(e){
    errEl.textContent = 'Не удалось связаться с сервером расчёта. Проверьте соединение и повторите.';
    return;
  }
  if(calc.error){ errEl.textContent = calc.error; return; }

  document.getElementById('outDims').innerHTML = `${calc.outerL} × ${calc.outerW} × ${calc.outerH} <span>мм</span>`;
  document.getElementById('outVolume').innerHTML = `${calc.totalVolume.toFixed(3)} <span>м³</span>`;
  document.getElementById('outTime').innerHTML = `${calc.normaVremeni} <span>ч</span>`;

  function renderSection(title, rows){
    let html = title ? `<div class="part-title">${title}</div>` : '';
    html += `<div class="spec-table"><table>
      <thead><tr><th>Деталь</th><th class="num">Толщина</th><th class="num">Ширина</th><th class="num">Длина</th><th class="num">Кол-во</th></tr></thead><tbody>`;
    rows.forEach(r=>{
      const overrideAttr = r.overrideKey ? ` data-override="${r.overrideKey}"` : '';
      html += `<tr>
        <td>${r.name}</td>
        <td class="num editable-cell" contenteditable="true" data-role="t"${overrideAttr}>${r.t}</td>
        <td class="num editable-cell" contenteditable="true" data-role="w">${r.w}</td>
        <td class="num editable-cell" contenteditable="true" data-role="l">${typeof r.l === 'number' ? Math.round(r.l) : r.l}</td>
        <td class="num editable-cell" contenteditable="true" data-role="qty">${r.qty}</td>
      </tr>`;
    });
    html += `</tbody></table></div>`;
    return html;
  }

  let tablesHtml = '';
  tablesHtml += `<div class="part-title">Дно</div><div class="spec-row-diagram"><div class="diagram-slot">` + diagramDno(calc.k9Base, calc.t41, calc.outerW, calc.t40, calc.torecFrameThickness) + `</div>` + renderSection('', calc.dno) + `</div>`;
  tablesHtml += `<div class="part-title">Крышка</div><div class="spec-row-diagram"><div class="diagram-slot">` + diagramKryshka(calc.W, calc.L, calc.t30, calc.t32, calc.t41, calc.t40Display, calc.edgeDistKryshka, calc.l21, calc.w21, calc.l19, calc.bokSectionW) + `</div>` + renderSection('', calc.kryshka) + `</div>`;
  tablesHtml += `<div class="part-title">Щит торцевой (2 шт.)</div><div class="spec-row-diagram"><div class="diagram-slot">` + diagramEndPanel(calc.k32, calc.torecSections, calc.torecHasRaskosina, calc.W, calc.HplusT12, calc.torecNoRaskosinaDiagram, calc.torecFloors, calc.k30plusW31) + `</div>` + renderSection('', calc.endPanel) + `</div>`;
  tablesHtml += `<div class="part-title" style="margin-bottom:26px">Щит боковой (2 шт.)</div><div class="spec-row-diagram"><div class="diagram-slot">` + diagramBokovoy(calc.H, calc.t12, calc.t41, calc.k41, calc.bokOverhang, calc.edgeDistKryshka, calc.l42, calc.bokFloors, calc.bokVertSpan, calc.l19, calc.k40, calc.w43) + `</div>` + renderSection('', calc.bokovoy) + `</div>`;
  const boardTablesEl = document.getElementById('boardTables');
  boardTablesEl.innerHTML = tablesHtml;
  const boardImages = Array.from(boardTablesEl.querySelectorAll('img'));
  Promise.all(boardImages.map(img => img.decode ? img.decode().catch(()=>{}) : Promise.resolve()))
    .then(()=> reserveDiagramOverflowScreen(boardTablesEl));

  let warningsHtml = '';
  if(calc.warnings.length){
    warningsHtml += '<div style="color:var(--warn);margin-bottom:10px;font-weight:700;">Внимание:</div>' +
      calc.warnings.map(w=>`<div style="margin-bottom:8px;">⚠ ${w}</div>`).join('');
  }
  const warningsEl = document.getElementById('warningsTop');
  warningsEl.innerHTML = warningsHtml;
  warningsEl.style.display = calc.warnings.length ? 'block' : 'none';

  document.getElementById('results').style.display = 'block';
  document.getElementById('calcCheck').style.display = 'inline-flex';
}

['L','W','H','M'].forEach(id=>{
  document.getElementById(id).addEventListener('input', invalidateCalc);
});
['optimizeSizes','solidRigidBase','roundBoardWidths','removeFloorBoards'].forEach(id=>{
  const el = document.getElementById(id);
  if(el) el.addEventListener('change', invalidateCalc);
});

function recalcFromTable(){
  const rows = document.querySelectorAll('#boardTables table tbody tr');
  let totalVolume = 0;
  rows.forEach(tr=>{
    const t = parseFloat(tr.querySelector('[data-role="t"]').textContent.replace(',','.')) || 0;
    const w = parseFloat(tr.querySelector('[data-role="w"]').textContent.replace(',','.')) || 0;
    const l = parseFloat(tr.querySelector('[data-role="l"]').textContent.replace(',','.')) || 0;
    const qty = parseFloat(tr.querySelector('[data-role="qty"]').textContent.replace(',','.')) || 0;
    totalVolume += (t/1000)*(w/1000)*(l/1000)*qty;
  });
  const normaVremeni = Math.ceil(totalVolume*800/60*1.2*10 - 1e-9)/10;
  document.getElementById('outVolume').innerHTML = `${totalVolume.toFixed(3)} <span>м³</span>`;
  document.getElementById('outTime').innerHTML = `${normaVremeni} <span>ч</span>`;
}

document.getElementById('boardTables').addEventListener('input', e=>{
  if(e.target.classList.contains('editable-cell')){
    if(e.target.hasAttribute('data-override')){
      e.target.setAttribute('data-user-edited', 'true');
    }
    recalcFromTable();
    invalidateCalc();
  }
});

const BOX_IMG_B64 = "/images/box.png";

function buildPrintHtml(){
  const L = document.getElementById('L').value;
  const W = document.getElementById('W').value;
  const H = document.getElementById('H').value;
  const M = document.getElementById('M').value;

  const outDimsText = document.getElementById('outDims').textContent.trim();
  const volumeText  = document.getElementById('outVolume').textContent.trim();
  const timeText    = document.getElementById('outTime').textContent.trim();

  const clone = document.getElementById('boardTables').cloneNode(true);
  clone.querySelectorAll('.editable-cell').forEach(cell=>{
    cell.removeAttribute('contenteditable');
    cell.classList.remove('editable-cell');
  });

  clone.querySelectorAll('.part-title, .spec-row-diagram').forEach(el=>{
    el.style.marginTop = '';
    el.style.marginBottom = '';
  });

  clone.querySelectorAll('.diagram-wrap').forEach(wrap=>{
    wrap.style.marginTop = '';
    wrap.style.marginBottom = '';
    wrap.style.marginLeft = '';
    wrap.style.width = '';
    wrap.style.removeProperty('--dk');
  });
  clone.querySelectorAll('.diagram-slot').forEach(slot=>{
    slot.style.width = '';
    slot.style.flexBasis = '';
  });

  let sections = '';
  const children = Array.from(clone.children);
  for(let i=0; i<children.length; i+=2){
    const title = children[i];
    const row   = children[i+1];
    sections += `<div class="print-section">${title.outerHTML}${row ? row.outerHTML : ''}</div>`;
  }

  const commentRaw = (document.getElementById('userComment').value || '').trim();
  let commentHtml = '';
  if(commentRaw){
    const esc = commentRaw
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    commentHtml = `<div class="print-section">
      <div class="part-title">Комментарий</div>
      <div class="print-comment">${esc}</div>
    </div>`;
  }

  return `
    <img class="print-watermark" src="${LOGO_B64}" alt="">

    <h1>ГОСТ 10198-91 · тип 1, комплектация 3</h1>
    <div class="print-subtitle">Плотный дощатый ящик с полозьями</div>

    <div class="part-title">Общий вид ящика</div>
    <div class="spec-row-diagram">
      <div class="diagram-slot"><div class="diagram-wrap"><img src="${BOX_IMG_B64}" alt=""></div></div>
      <div class="print-summary-col">
        <div class="print-summary-block">
          <h2>Внутренние размеры груза, мм</h2>
          <table class="print-plain-table">
            <tr><td class="k">Длина</td><td>${L}</td></tr>
            <tr><td class="k">Ширина</td><td>${W}</td></tr>
            <tr><td class="k">Высота</td><td>${H}</td></tr>
            <tr><td class="k">Масса груза, кг</td><td>${M}</td></tr>
          </table>
        </div>
        <div class="print-summary-block">
          <h2>Итог</h2>
          <table class="print-plain-table">
            <tr><td class="k">Наружные размеры, мм</td><td>${outDimsText}</td></tr>
            <tr><td class="k">Расход пиломатериала</td><td>${volumeText}</td></tr>
            <tr><td class="k">Норма времени</td><td>${timeText}</td></tr>
          </table>
        </div>
      </div>
    </div>

    ${sections}
    ${commentHtml}
  `;
}

document.getElementById('boxView').src = BOX_IMG_B64;

applyStateFromUrl();
