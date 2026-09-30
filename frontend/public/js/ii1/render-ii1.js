// ГОСТ 10198-91, тип II-1: вывод результата расчёта - плитки «Итог»,
// спецификация (чертёж + таблица по каждому узлу) и предупреждения.
// calc - ответ сервера (/api/ii1/calculate). Общий вид ящика - BOX_II1_IMG_B64
// (diagrams/dno.js).

function renderSummary(calc){
  document.getElementById('outDims').innerHTML = `${Math.round(calc.outerL)} × ${Math.round(calc.outerW)} × ${Math.round(calc.outerH)} <span>мм</span>`;
  document.getElementById('outVolume').innerHTML = `${calc.totalVolume.toFixed(3)} <span>м³</span>`;
  document.getElementById('outTime').innerHTML = `${calc.normaVremeni} <span>ч</span>`;
}

// Числа в таблице - целые, с округлением вверх (не занижаем размер или
// количество детали): толщина раскосины (2/3 стойки) и т.п. бывают дробными.
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

// Щиты торцевой и боковой - базовая ширина 260 (как у дна и крышки) и
// множитель подписей 0.8 (см. renderDiagram в common-diagrams.js): у этих
// чертежей подписи почти не вылетают за рамку, и автосжатие их не уменьшает.
const II1_PANEL_WIDTH = 260, II1_PANEL_LABEL_SCALE = 0.8;

function renderBoardTables(calc, manualOverrides){
  const torecW = calc.W + calc.t_stojka*2;
  let html = '';
  html += renderPartBlock(`<div class="part-title">Дно</div>`,
    diagramDno(calc.t_stojka, calc.skin.value, torecW, calc.k9Base, dnoSkidCount(calc.dno)),
    renderPartTable(calc.dno, 'dno', manualOverrides));
  html += renderPartBlock(`<div class="part-title">Крышка</div>`,
    diagramKryshka(calc.longbeamCount, calc.crossBeamCount, calc.t32Display, calc.sideFrameDisplay, calc.outerW, calc.k9Base, undefined, calc.edgeDistCross),
    renderPartTable(calc.kryshka, 'kryshka', manualOverrides));
  html += renderPartBlock(`<div class="part-title">Щит торцевой (2 шт.)</div>`,
    diagramTorec(calc.torecFrame.count, calc.torecFrame.floors, calc.t_longbeam, torecW, calc.skin.value, calc.panelHeightFull, 100 + calc.torecFrame.len, II1_PANEL_WIDTH, II1_PANEL_LABEL_SCALE, calc.xRaskosina, calc.torecFrame.sectionW),
    renderPartTable(calc.endPanel, 'endPanel', manualOverrides));
  html += renderPartBlock(`<div class="part-title" style="margin-bottom:26px">Щит боковой (2 шт.)</div>`,
    diagramBok(calc.bokFrame.count, calc.bokFrame.floors, calc.t_longbeam, calc.L, calc.t_stojka, calc.panelHeightFull, 100 + calc.bokFrame.len, II1_PANEL_WIDTH, II1_PANEL_LABEL_SCALE, calc.xRaskosina, calc.bokFrame.sectionW),
    renderPartTable(calc.bokovoy, 'bokovoy', manualOverrides));

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
