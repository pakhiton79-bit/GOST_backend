// ГОСТ 10198-91, тип I-2: вывод результата расчёта - плитки «Итог»,
// спецификация (чертёж + таблица по каждому узлу), лента обшивки, пергамин и
// предупреждения. calc - ответ сервера (/api/i2/calculate).

function renderSummary(calc){
  document.getElementById('outDims').innerHTML = `${Math.round(calc.outerL)} × ${Math.round(calc.outerW)} × ${Math.round(calc.outerH)} <span>мм</span>`;
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
function renderPartBlock(title, diagramHtml, tableHtml){
  return `<div class="part-title">${title}</div><div class="spec-row-diagram"><div class="diagram-slot" data-max-size>` + diagramHtml + `</div>` + tableHtml + `</div>`;
}

// Строка свободного текста (лента обшивки, пергамин) - табличка 1×1 на всю
// ширину. Текст правится целиком; пустая ячейка - расчётный текст.
function renderTextRow(sectionKey, rows, defaultText){
  const row = rows[0], keys = tableRowKeys(rows);
  const text = (typeof row.text === 'string') ? row.text : defaultText(row);
  return `<div class="spec-table tape-table"><table data-section="${sectionKey}"><tbody><tr data-row-key="${escapeAttr(keys[0])}"><td class="editable-cell" contenteditable="true" data-role="text"${editedAttr(row, 'text')}>${escapeAttr(text)}</td></tr></tbody></table></div>`;
}

function renderBoardTables(calc, manualOverrides){
  // Каждый чертёж - максимального размера в своём слоте. Обшивка щитов -
  // доски с промежутками: gaps.<щит> (null - щит сплошной).
  const gaps = calc.boardGaps;
  const panelFramePx = i2PanelFramePx();
  const torecFramePx = i2TorecFramePx(calc.raskosinaNeeded);
  const edge = calc.plank.edgeDist;

  let html = '';
  html += renderPartBlock('Дно',
    diagramDno(calc.dnoWidth, calc.drawPlankT.dno, edge, calc.plankGap, calc.kLen, calc.plankQty, calc.kryshkaDnoHasRaskosina, calc.xRaskosina, panelFramePx, gaps.dno),
    renderPartTable(calc.dno, 'dno', manualOverrides));
  html += renderPartBlock('Крышка',
    diagramKryshka(calc.kPlankaKryshka, calc.drawPlankT.kryshka, edge, calc.plankGap, calc.kLen, calc.plankQty, calc.kryshkaDnoHasRaskosina, calc.xRaskosina, panelFramePx, gaps.kryshka),
    renderPartTable(calc.kryshka, 'kryshka', manualOverrides));
  html += renderPartBlock('Щит торцевой (2 шт.)',
    diagramTorec(calc.H, calc.W, calc.raskosinaNeeded, calc.xRaskosina, torecFramePx, gaps.torec),
    renderPartTable(calc.torec, 'torec', manualOverrides));
  html += renderPartBlock('Щит боковой (2 шт.)',
    diagramBokovoy(calc.H, calc.drawPlankT.bokovoy, edge, calc.plankGap, calc.kLen, calc.plankQty, calc.raskosinaNeeded, calc.xRaskosina, panelFramePx, calc.drawPlankT.bokovoyBottom, gaps.bokovoy),
    renderPartTable(calc.bokovoy, 'bokovoy', manualOverrides));
  // Лента обшивки и пергамин - под всеми узлами, попадают и в печать.
  if(calc.endTape && calc.endTape.length){
    html += renderTextRow('endTape', calc.endTape, r => `Обшивочная лента ${Math.ceil(r.l - 1e-9)} мм × 2`);
  }
  if(calc.parchment && calc.parchment.length){
    html += renderTextRow('parchment', calc.parchment, r => `Пергамин ${r.area.toFixed(2)} м²`);
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
