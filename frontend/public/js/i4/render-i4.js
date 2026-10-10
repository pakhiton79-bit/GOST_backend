// ГОСТ 10198-91, тип I-4: вывод результата расчёта - плитки «Итог»,
// спецификация (чертёж + таблица по каждому узлу), лента обшивки и
// предупреждения.
// calc - ответ сервера (/api/i4/calculate).

// Общий вид ящика (плитка «Итог» и печать).
const BOX_IMG_B64 = "/images/box_i4.png"; // общий вид ящика I-4 (присланный пользователем)

function renderSummary(calc){
  rememberLiveCalc(calc); // основа итогов при правках без пересчёта (common-table-edits.js)
  document.getElementById('outDims').innerHTML = `${calc.outerL} × ${calc.outerW} × ${calc.outerH} <span>мм</span>`;
  document.getElementById('outVolume').innerHTML = `${calc.totalVolume.toFixed(3)} <span>м³</span>`;
  document.getElementById('outMass').innerHTML = `${calc.crateMass.toFixed(1)} <span>кг</span>`;
  document.getElementById('outTime').innerHTML = `${calc.normaVremeni} <span>ч</span>`;
}

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
        <td class="num editable-cell" contenteditable="true" data-role="t"${overrideAttr}${editedAttr(r, 't', manualOverrides)}>${r.t}</td>
        <td class="num editable-cell" contenteditable="true" data-role="w"${editedAttr(r, 'w')}>${r.w}</td>
        <td class="num editable-cell" contenteditable="true" data-role="l"${editedAttr(r, 'l')}>${typeof r.l === 'number' ? Math.round(r.l) : r.l}</td>
        <td class="num editable-cell" contenteditable="true" data-role="qty"${editedAttr(r, 'qty')}>${r.qty}</td>
      </tr>`;
  });
  html += `</tbody></table></div>`;
  return html;
}

// Узел: заголовок, чертёж слева, таблица справа.
function renderPartBlock(titleHtml, diagramHtml, tableHtml){
  return titleHtml + `<div class="spec-row-diagram"><div class="diagram-slot">` + diagramHtml + `</div>` + tableHtml + `</div>`;
}

// Строка свободного текста (лента обшивки, пергамин) - табличка 1×1 на всю
// ширину. Текст правится целиком; пустая ячейка - расчётный текст.
function renderTextRow(sectionKey, rows, defaultText){
  const row = rows[0], keys = tableRowKeys(rows);
  const text = (typeof row.text === 'string') ? row.text : defaultText(row);
  return `<div class="spec-table tape-table"><table data-section="${sectionKey}"><tbody><tr data-row-key="${escapeAttr(keys[0])}"><td class="editable-cell" contenteditable="true" data-role="text"${editedAttr(row, 'text')}>${escapeAttr(text)}</td></tr></tbody></table></div>`;
}

function renderBoardTables(calc, manualOverrides){
  let html = '';
  html += renderPartBlock(`<div class="part-title">Дно</div>`,
    diagramDnoFor(calc),
    renderPartTable(calc.dno, 'dno', manualOverrides));
  html += renderPartBlock(`<div class="part-title">Крышка</div>`,
    diagramKryshkaFor(calc),
    renderPartTable(calc.kryshka, 'kryshka', manualOverrides));
  html += renderPartBlock(`<div class="part-title">Щит торцевой (2 шт.)</div>`,
    diagramEndPanelFor(calc),
    renderPartTable(calc.endPanel, 'endPanel', manualOverrides));
  html += renderPartBlock(`<div class="part-title" style="margin-bottom:26px">Щит боковой (2 шт.)</div>`,
    diagramBokovoyFor(calc),
    renderPartTable(calc.bokovoy, 'bokovoy', manualOverrides));
  // Лента обшивки - под всеми узлами, попадает и в печать.
  if(calc.endTape && calc.endTape.length){
    html += renderTextRow('endTape', calc.endTape, r => `Обшивочная лента ${Math.ceil(r.l - 1e-9)} мм × 2`);
  }

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
