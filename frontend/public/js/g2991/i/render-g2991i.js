// ГОСТ 2991-85, тип I: вывод результата - плитки «Итог», спецификация
// (чертёж и таблица по каждому узлу, все ячейки правятся - как в ГОСТ
// 10198-91) и
// предупреждения. calc - ответ расчёта.

function renderSummary(calc){
  document.getElementById('outDims').innerHTML = `${Math.round(calc.outerL)} × ${Math.round(calc.outerW)} × ${Math.round(calc.outerH)} <span>мм</span>`;
  document.getElementById('outVolume').innerHTML = `${calc.totalVolume.toFixed(3)} <span>м³</span>`;
  document.getElementById('outMass').innerHTML = `${calc.crateMass.toFixed(1)} <span>кг</span>`;
  document.getElementById('outTime').innerHTML = `${calc.normaVremeni} <span>ч</span>`;
}

// Числа в таблице - целые, с округлением вверх (не занижаем размер детали).
function displayVal(v){ return typeof v === 'number' ? Math.ceil(v - 1e-9) : v; }

// Таблица деталей узла; правки уходят в расчёт как правки таблицы
// (readTableEdits в common-table-edits.js).
function renderPartTable(rows, sectionKey){
  let html = `<div class="spec-table"><table data-section="${sectionKey}">
      <thead><tr><th>Деталь</th><th class="num">Толщина</th><th class="num">Ширина</th><th class="num">Длина</th><th class="num">Кол-во</th></tr></thead><tbody>`;
  const rowKeys = tableRowKeys(rows);
  rows.forEach((r, i)=>{
    html += `<tr data-row-key="${escapeAttr(rowKeys[i])}">
        <td>${r.name}</td>
        <td class="num editable-cell" contenteditable="true" data-role="t"${editedAttr(r, 't')}>${displayVal(r.t)}</td>
        <td class="num editable-cell" contenteditable="true" data-role="w"${editedAttr(r, 'w')}>${displayVal(r.w)}</td>
        <td class="num editable-cell" contenteditable="true" data-role="l"${editedAttr(r, 'l')}>${displayVal(r.l)}</td>
        <td class="num editable-cell" contenteditable="true" data-role="qty"${editedAttr(r, 'qty')}>${displayVal(r.qty)}</td>
      </tr>`;
  });
  html += `</tbody></table></div>`;
  return html;
}
// Узел: заголовок, чертёж слева (diagrams.js), таблица справа.
function renderPartBlock(title, diagramHtml, tableHtml){
  return `<div class="part-title" style="margin-bottom:26px">${title}</div><div class="spec-row-diagram"><div class="diagram-slot">${diagramHtml}</div>${tableHtml}</div>`;
}

function renderBoardTables(calc){
  const dg = diagramsG2991I(calc);
  let html = '';
  html += renderPartBlock('Дно', dg.dno, renderPartTable(calc.dno, 'dno'));
  html += renderPartBlock(calc.noLid ? 'Вместо крышки' : 'Крышка', dg.kryshka, renderPartTable(calc.kryshka, 'kryshka'));
  html += renderPartBlock('Щит торцевой (2 шт.)', dg.torec, renderPartTable(calc.torec, 'torec'));
  html += renderPartBlock('Щит боковой (2 шт.)', dg.bokovoy, renderPartTable(calc.bokovoy, 'bokovoy'));
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
