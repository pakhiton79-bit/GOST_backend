// ГОСТ 10198-91, тип III-1: вывод результата расчёта - плитки «Итог»,
// спецификация (таблица по каждому узлу; из чертежей пока только щиты -
// diagrams/), болты, пергамин и предупреждения.
// calc - ответ сервера (/api/iii1/calculate).

// Общий вид ящика (плитка «Итог» и печать). Своего чертежа у III-1 пока нет -
// копия общего вида II-1.
const BOX_III1_IMG_B64 = "/images/box_iii1.png";

function renderSummary(calc){
  document.getElementById('outDims').innerHTML = `${Math.round(calc.outerL)} × ${Math.round(calc.outerW)} × ${Math.round(calc.outerH)} <span>мм</span>`;
  document.getElementById('outVolume').innerHTML = `${calc.totalVolume.toFixed(3)} <span>м³</span>`;
  document.getElementById('outMass').innerHTML = `${calc.crateMass.toFixed(1)} <span>кг</span>`;
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

// Узел: заголовок и таблица на всю ширину (чертежа пока нет).
function renderPartBlock(title, tableHtml){
  return `<div class="part-title">${title}</div><div class="spec-row-table">${tableHtml}</div>`;
}
// Узел с чертежом: заголовок, чертёж слева, таблица справа (как у II-1).
// Слот чертежа шире обычного и чертёж может быть выше (data-grow-max-h, см.
// fitDiagramOnScreen) - чтобы занимал больше места (по указанию
// пользователя). Отступ под заголовком - под размер над чертежом.
function renderPartBlockDiagram(title, diagramHtml, tableHtml){
  return `<div class="part-title" style="margin-bottom:26px">${title}</div><div class="spec-row-diagram spec-row-wide"><div class="diagram-slot diagram-slot-wide" data-grow-max-h="300">${diagramHtml}</div>${tableHtml}</div>`;
}
// Ширина чертежей щитов на экране - как у II-1.
const III1_PANEL_WIDTH = 260;

// Строки свободного текста (болты, пергамин) - табличка в 1 колонку на всю
// ширину. Текст правится целиком; пустая ячейка - расчётный текст.
function renderTextRows(sectionKey, rows, defaultText){
  const keys = tableRowKeys(rows);
  const trs = rows.map((row, i)=>{
    const text = (typeof row.text === 'string') ? row.text : defaultText(row);
    return `<tr data-row-key="${escapeAttr(keys[i])}"><td class="editable-cell" contenteditable="true" data-role="text"${editedAttr(row, 'text')}>${escapeAttr(text)}</td></tr>`;
  }).join('');
  return `<div class="spec-table tape-table"><table data-section="${sectionKey}"><tbody>${trs}</tbody></table></div>`;
}

// Болты можно убрать из спецификации (кнопка «Убрать» у заголовка) и вернуть
// («Вернуть» в строке-заметке на их месте). Убранные - не в печати и PDF
// (см. printableBoardTables). Выбор запоминается и сохраняется при пересчёте.
const BOLTS_REMOVED_STORAGE_KEY = OPTIONS_STORAGE_PREFIX + 'boltsRemoved';
let boltsRemoved = false;
try{ boltsRemoved = localStorage.getItem(BOLTS_REMOVED_STORAGE_KEY) === '1'; }catch(e){}

function setBoltsRemoved(removed){
  boltsRemoved = removed;
  try{ localStorage.setItem(BOLTS_REMOVED_STORAGE_KEY, removed ? '1' : '0'); }catch(e){}
  applyBoltsRemoved();
}
function applyBoltsRemoved(){
  document.querySelectorAll('#boardTables .bolts-part').forEach(el=>el.classList.toggle('is-removed', boltsRemoved));
  const note = document.getElementById('boltsRemovedNote');
  if(note) note.classList.toggle('is-removed', !boltsRemoved);
}

function renderBoardTables(calc, manualOverrides){
  let html = '';
  html += renderPartBlockDiagram('Дно', diagramDnoIII1(calc, III1_PANEL_WIDTH), renderPartTable(calc.dno, 'dno', manualOverrides));
  html += renderPartBlock('Крышка', renderPartTable(calc.kryshka, 'kryshka', manualOverrides));
  html += renderPartBlockDiagram('Щит торцевой (2 шт.)', diagramTorecIII1(calc, III1_PANEL_WIDTH), renderPartTable(calc.endPanel, 'endPanel', manualOverrides));
  html += renderPartBlockDiagram('Щит боковой (2 шт.)', diagramBokIII1(calc, III1_PANEL_WIDTH), renderPartTable(calc.bokovoy, 'bokovoy', manualOverrides));
  // Болты и пергамин - под всеми узлами, попадают и в печать.
  html += `<div class="part-title bolts-part">Болты<button type="button" class="btn-secondary btn-small part-title-action screen-only" onclick="setBoltsRemoved(true)">Убрать</button></div>`
    + renderTextRows('bolts', calc.bolts, r => `${r.name} Ø${r.d} мм - ${r.qty} шт.`).replace('class="spec-table tape-table"', 'class="spec-table tape-table bolts-part"')
    + `<div class="note bolts-removed-note screen-only" id="boltsRemovedNote">Болты убраны из спецификации, печати и PDF.<button type="button" class="btn-secondary btn-small" onclick="setBoltsRemoved(false)">Вернуть</button></div>`;
  if(calc.parchment && calc.parchment.length){
    html += renderTextRows('parchment', calc.parchment, r => `Пергамин ${r.area.toFixed(2)} м²`);
  }
  const boardTablesEl = document.getElementById('boardTables');
  boardTablesEl.innerHTML = html;
  applyBoltsRemoved();
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
