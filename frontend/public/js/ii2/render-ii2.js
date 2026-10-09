// ГОСТ 10198-91, тип II-2: вывод результата расчёта - плитки «Итог»,
// спецификация (чертёж + таблица по каждому узлу) и предупреждения (как у
// II-1, пергамина нет). calc - ответ сервера (/api/ii2/calculate). Общий вид
// ящика - BOX_II2_IMG_B64 (diagrams/dno.js); чертежи узлов - все
// генерируемые, с досками обшивки (diagrams/).

function renderSummary(calc){
  document.getElementById('outDims').innerHTML = `${Math.round(calc.outerL)} × ${Math.round(calc.outerW)} × ${Math.round(calc.outerH)} <span>мм</span>`;
  document.getElementById('outVolume').innerHTML = `${calc.totalVolume.toFixed(3)} <span>м³</span>`;
  document.getElementById('outMass').innerHTML = `${calc.crateMass.toFixed(1)} <span>кг</span>`;
  document.getElementById('outTime').innerHTML = `${calc.normaVremeni} <span>ч</span>`;
}

// Числа в таблице - целые, с округлением вверх (не занижаем размер или
// количество детали): толщины и т.п. бывают дробными.
function displayVal(v){ return typeof v === 'number' ? Math.ceil(v - 1e-9) : v; }

// Таблица деталей узла. Все ячейки редактируются; правка толщины детали с
// overrideKey уходит на сервер как ручная толщина (manualOverrides), прочие -
// как правки таблицы (см. readTableEdits в common-table-edits.js).
function renderPartTable(rows, sectionKey, manualOverrides){
  let html = `<div class="spec-table"><table data-section="${sectionKey}">
      <thead><tr><th>Деталь</th><th class="num">Толщина</th><th class="num">Ширина</th><th class="num">Длина</th><th class="num">Кол-во</th></tr></thead><tbody>`;
  const rowKeys = tableRowKeys(rows);
  rows.forEach((r, i)=>{
    const overrideAttr = r.overrideKey ? ` data-override="${r.overrideKey}"` : '';
    html += `<tr data-row-key="${escapeAttr(rowKeys[i])}">
        <td>${r.name}</td>
        <td class="num editable-cell" contenteditable="true" data-role="t"${overrideAttr}${editedAttr(r, 't', manualOverrides)}>${displayVal(r.t)}</td>
        <td class="num editable-cell" contenteditable="true" data-role="w"${editedAttr(r, 'w')}>${displayVal(r.w)}</td>
        <td class="num editable-cell" contenteditable="true" data-role="l"${editedAttr(r, 'l')}>${displayVal(r.l)}</td>
        <td class="num editable-cell" contenteditable="true" data-role="qty"${editedAttr(r, 'qty')}>${displayVal(r.qty)}</td>
      </tr>`;
  });
  html += `</tbody></table></div>`;
  return html;
}

// Узел: заголовок, чертёж слева, таблица справа.
function renderPartBlock(titleHtml, diagramHtml, tableHtml){
  return titleHtml + `<div class="spec-row-diagram"><div class="diagram-slot">` + diagramHtml + `</div>` + tableHtml + `</div>`;
}

function renderBoardTables(calc, manualOverrides){
  let html = '';
  html += renderPartBlock(`<div class="part-title">Дно</div>`, diagramDnoII2(calc), renderPartTable(calc.dno, 'dno', manualOverrides));
  html += renderPartBlock(`<div class="part-title">Крышка</div>`, diagramKryshkaII2(calc), renderPartTable(calc.kryshka, 'kryshka', manualOverrides));
  html += renderPartBlock(`<div class="part-title">Щит торцевой (2 шт.)</div>`, diagramTorecII2(calc), renderPartTable(calc.endPanel, 'endPanel', manualOverrides));
  html += renderPartBlock(`<div class="part-title" style="margin-bottom:26px">Щит боковой (2 шт.)</div>`, diagramBokII2(calc), renderPartTable(calc.bokovoy, 'bokovoy', manualOverrides));

  const boardTablesEl = document.getElementById('boardTables');
  boardTablesEl.innerHTML = html;
  // Место под вылет подписей чертежей - когда картинки загрузятся.
  const boardImages = Array.from(boardTablesEl.querySelectorAll('img'));
  Promise.all(boardImages.map(img => img.decode ? img.decode().catch(()=>{}) : Promise.resolve()))
    .then(()=> fitDiagramsOnScreen(boardTablesEl));
}

function renderWarnings(warnings){
  let html = '';
  if(warnings.length){
    html += '<div style="color:var(--warn);margin-bottom:10px;font-weight:700;">Внимание:</div>' +
      warnings.map(w=>`<div style="margin-bottom:8px;">⚠ ${w}</div>`).join('');
  }
  const warningsEl = document.getElementById('warningsTop');
  warningsEl.innerHTML = html;
  warningsEl.style.display = warnings.length ? 'block' : 'none';
}
