// ГОСТ 10198-91, тип II-1 - вызов бэкенд-API (POST /api/ii1/calculate) и
// отрисовка результата (таблицы, чертежи, печать). Перенесено из
// src/ii1/calc.js исходного (фронтенд-only) репозитория pakhiton79-bit/
// GOST_10198-91 - там computeGost10198II1 считался локально в браузере,
// здесь - на сервере, поэтому calculate() стала асинхронной; остальная
// логика (чтение полей, рендер таблиц/чертежей, печать) не менялась.
// BOX_II1_IMG_B64 - см. js/ii1/diagrams/dno.js (общий вид ящика, используется
// и на самом сайте, и в печати).

// Ручной ввод толщины в таблице (data-override="..." в renderSection ниже) -
// читается ДО того, как calculate() эту таблицу перерисует, и отправляется
// на сервер вместе с остальными входными данными (см. computeGost10198II1/
// ov() в backend/src/ii1/compute.js). Учитываются ТОЛЬКО ячейки, реально
// отредактированные пользователем (data-user-edited, взводится обработчиком
// input ниже) - иначе каноническое поле "замораживалось" бы на прежнем
// расчётном значении при каждом нажатии "Рассчитать", даже если пользователь
// его не трогал (см. тот же приём в src/ii1/calc.js исходного репозитория).
function readManualOverrides(){
  const overrides = {};
  document.querySelectorAll('#boardTables td[data-override][data-user-edited="true"]').forEach(cell=>{
    const key = cell.getAttribute('data-override');
    const val = parseFloat(cell.textContent.replace(',','.'));
    if(!Number.isNaN(val) && val>0) overrides[key] = val;
  });
  return overrides;
}

async function calculate(){
  const errEl = document.getElementById('err');
  errEl.textContent = '';
  const manualOverrides = readManualOverrides();
  document.getElementById('calcCheck').style.display = 'none';
  document.getElementById('calcOutdated').style.display = 'none';

  const removeFloorBoardsEl = document.getElementById('removeFloorBoards');
  const input = {
    L: parseFloat(document.getElementById('L').value),
    W: parseFloat(document.getElementById('W').value),
    H: parseFloat(document.getElementById('H').value),
    MASS: parseFloat(document.getElementById('M').value),
    fasteningType: fasteningType,
    solidRigidBase: document.getElementById('solidRigidBase').checked,
    removeFloorBoards: removeFloorBoardsEl ? removeFloorBoardsEl.checked : false,
    removeSkidBoards: document.getElementById('removeSkidBoards').checked,
    forkliftLoading: document.getElementById('forkliftLoading').checked,
    roundBoardWidths: document.getElementById('roundBoardWidths').checked,
    lidLayout: document.querySelector('input[name="lidLayout"]:checked').value,
    optimizeSizes: document.getElementById('optimizeSizes').checked,
    availableThicknesses,
    manualOverrides,
  };

  let calc;
  try{
    const resp = await fetch('/api/ii1/calculate', {
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

  document.getElementById('outDims').innerHTML = `${Math.round(calc.outerL)} × ${Math.round(calc.outerW)} × ${Math.round(calc.outerH)} <span>мм</span>`;
  document.getElementById('outVolume').innerHTML = `${calc.totalVolume.toFixed(3)} <span>м³</span>`;
  document.getElementById('outTime').innerHTML = `${calc.normaVremeni} <span>ч</span>`;

  // Все числовые значения в таблице - целые, округление вверх (не занижаем
  // размер/количество детали): толщина раскосины (t_stojka*2/3) и т.п. дают
  // дробные мм без этого округления.
  function displayVal(v){ return typeof v === 'number' ? Math.ceil(v - 1e-9) : v; }
  function renderSection(title, rows){
    let html = title ? `<div class="part-title">${title}</div>` : '';
    html += `<div class="spec-table"><table>
      <thead><tr><th>Деталь</th><th class="num">Толщина</th><th class="num">Ширина</th><th class="num">Длина</th><th class="num">Кол-во</th></tr></thead><tbody>`;
    rows.forEach(r=>{
      const overrideAttr = r.overrideKey ? ` data-override="${r.overrideKey}"` : '';
      html += `<tr>
        <td>${r.name}</td>
        <td class="num editable-cell" contenteditable="true" data-role="t"${overrideAttr}>${displayVal(r.t)}</td>
        <td class="num editable-cell" contenteditable="true" data-role="w">${displayVal(r.w)}</td>
        <td class="num editable-cell" contenteditable="true" data-role="l">${displayVal(r.l)}</td>
        <td class="num editable-cell" contenteditable="true" data-role="qty">${displayVal(r.qty)}</td>
      </tr>`;
    });
    html += `</tbody></table></div>`;
    return html;
  }

  let tablesHtml = '';
  tablesHtml += `<div class="part-title">Дно</div><div class="spec-row-diagram"><div class="diagram-slot">` + diagramDno(calc.t_stojka, calc.skin.value, calc.W + calc.t_stojka*2, calc.k9Base) + `</div>` + renderSection('', calc.dno) + `</div>`;
  tablesHtml += `<div class="part-title">Крышка</div><div class="spec-row-diagram"><div class="diagram-slot">` + diagramKryshka(calc.longbeamCount, calc.crossBeamCount, calc.t32Display, calc.sideFrameDisplay, calc.outerW, calc.k9Base, undefined, calc.edgeDistCross) + `</div>` + renderSection('', calc.kryshka) + `</div>`;
  tablesHtml += `<div class="part-title">Щит торцевой (2 шт.)</div><div class="spec-row-diagram"><div class="diagram-slot">` + diagramTorec(calc.torecFrame.count, calc.torecFrame.floors, calc.t_longbeam, calc.W + calc.t_stojka*2, calc.skin.value, calc.panelHeightFull, 100 + calc.torecFrame.len) + `</div>` + renderSection('', calc.endPanel) + `</div>`;
  tablesHtml += `<div class="part-title" style="margin-bottom:26px">Щит боковой (2 шт.)</div><div class="spec-row-diagram"><div class="diagram-slot">` + diagramBok(calc.bokFrame.count, calc.bokFrame.floors, calc.t_longbeam, calc.L, calc.skin.value, calc.panelHeightFull, 100 + calc.bokFrame.len) + `</div>` + renderSection('', calc.bokovoy) + `</div>`;
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
['solidRigidBase','roundBoardWidths','removeFloorBoards','optimizeSizes'].forEach(id=>{
  const el = document.getElementById(id);
  if(el) el.addEventListener('change', invalidateCalc);
});
document.querySelectorAll('input[name="lidLayout"]').forEach(el=>{
  el.addEventListener('change', invalidateCalc);
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

    <h1>ГОСТ 10198-91 · тип II-1</h1>
    <div class="print-subtitle">Каркасно-щитовой неразборный плотный ящик</div>

    <div class="part-title">Общий вид ящика</div>
    <div class="spec-row-diagram">
      <div class="diagram-slot"><div class="diagram-wrap"><img src="${BOX_II1_IMG_B64}" alt=""></div></div>
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

// Общий вид ящика показываем и на самом сайте, не только в печати.
document.getElementById('boxView').src = BOX_II1_IMG_B64;
