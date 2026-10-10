// Ручные правки таблицы деталей (общие для всех типов): ключи строк,
// пометка исправленных ячеек, сбор правок для расчёта (readTableEdits).

// ============ Ручные правки таблицы деталей ============
// По указанию пользователя: правка любой ячейки таблицы деталей (толщина,
// ширина, длина, кол-во) НЕ пересчитывает итоги сразу - только помечает
// расчёт как устаревший (подсказка «Нажмите «Рассчитать»»); пересчёт - по кнопке
// "Рассчитать" (здесь, в бэкенд-версии - на сервере, как и весь остальной расчёт:
// applyTableEdits в backend/src/helpers.js).
// Правки толщины у строк с data-override по-прежнему идут в расчёт
// каскадом (manualOverrides); остальные правки (ширина/длина/кол-во и
// толщина строк без data-override) передаются как tableEdits и
// подставляются в строки результата - итоговый объём (а с ним масса и
// норма времени) пересчитываются с учётом правок (см. applyTableEdits).
// Строка таблицы опознаётся по разделу (data-section) и ключу
// "название#порядковый номер среди строк с тем же названием" - а не по
// номеру строки: при смене параметров строки могут появляться/исчезать.
// Отредактированные ячейки остаются помеченными (data-user-edited) и после
// пересчёта - правка сохраняется, пока пользователь её не изменит (пустая
// ячейка = вернуть расчётное значение).
const TABLE_EDIT_ROLES = ['t', 'w', 'l', 'qty'];
function tableRowKeys(rows){
  const occ = {};
  return rows.map(r=>{
    const n = String(r.name);
    const i = occ[n] || 0;
    occ[n] = i + 1;
    return n + '#' + i;
  });
}
function escapeAttr(s){
  return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
}
// Атрибут data-user-edited для ячейки при рендере: у толщины строк с
// data-override - если эта толщина была задана вручную (manualOverrides),
// у остальных - если ячейка была исправлена через tableEdits (row.edited).
function editedAttr(row, role, manualOverrides){
  if(role === 't' && row.overrideKey){
    return (manualOverrides && manualOverrides[row.overrideKey] !== undefined) ? ' data-user-edited="true"' : '';
  }
  return (row.edited && row.edited[role]) ? ' data-user-edited="true"' : '';
}
// Толщина в таблице деталей: правка ЛЮБОЙ строки меняет параметр ГОСТ, из
// которого эта толщина берётся (data-override), поэтому все строки с тем же
// параметром сразу получают то же значение (последняя правка побеждает).
function syncOverrideCells(cell){
  const key = cell && cell.getAttribute && cell.getAttribute('data-override');
  if(!key) return;
  const v = cell.textContent;
  document.querySelectorAll(`#boardTables td[data-override="${key}"]`).forEach(td=>{
    if(td !== cell){ td.textContent = v; markCellEdited(td); }
  });
}
// Пометка правки ячейки (по указанию пользователя): если значение вернули
// к тому, что было показано после последнего расчёта, - пометка
// возвращается к прежней (цвет правки снимается, если ячейка не была
// исправлена и до этого). Исходные тексты запоминает rememberCellOriginals()
// после каждого успешного расчёта (см. calculate()).
function markCellEdited(cell){
  if('origText' in cell.dataset && cell.textContent.trim() === cell.dataset.origText.trim()){
    if(cell.dataset.origEdited) cell.setAttribute('data-user-edited', 'true');
    else cell.removeAttribute('data-user-edited');
    return;
  }
  cell.setAttribute('data-user-edited', 'true');
}
function rememberCellOriginals(){
  document.querySelectorAll('#boardTables .editable-cell').forEach(td=>{
    td.dataset.origText = td.textContent;
    td.dataset.origEdited = td.getAttribute('data-user-edited') === 'true' ? '1' : '';
  });
}
function readTableEdits(){
  const edits = {};
  document.querySelectorAll('#boardTables table[data-section] tr[data-row-key]').forEach(tr=>{
    const sec = tr.closest('table').dataset.section;
    const key = tr.dataset.rowKey;
    tr.querySelectorAll('td[data-user-edited="true"]:not([data-override])').forEach(td=>{
      const role = td.dataset.role;
      // role 'text' - ячейка со свободным текстом (лента обшивки торцов:
      // править можно весь текст, не только число); пустая - расчётное.
      let v;
      if(role === 'text'){
        v = td.textContent.trim();
        if(!v) return;
      } else {
        v = parseFloat(td.textContent.replace(',', '.'));
        if(!TABLE_EDIT_ROLES.includes(role) || !Number.isFinite(v) || v < 0 || (v === 0 && role !== 'qty')) return;
      }
      edits[sec] = edits[sec] || {};
      edits[sec][key] = edits[sec][key] || {};
      edits[sec][key][role] = v;
    });
  });
  return edits;
}

// ============ Правки без пересчёта ============
// По указанию пользователя: правка ширины, длины и количества (в ГОСТ
// 2991-85 - длины и количества) на другие детали не влияет, поэтому
// «Нажмите «Рассчитать»» не появляется, а объём, масса ящика и норма времени
// обновляются сразу - так же, как их пересчитал бы расчёт (applyTableEdits:
// к объёму последнего расчёта прибавляется разница объёмов изменённых строк
// с множителем раздела). Правка толщины (в ГОСТ 2991-85 - и ширины) меняет
// другие детали - после неё нужен пересчёт. Роли, требующие пересчёта, тип
// может задать константой TABLE_RECALC_ROLES (ГОСТ 2991-85 - js/g2991/options.js).
// Множители объёма разделов (как на сервере): щиты торцевой и боковой - по
// 2 шт.; лента, пергамин и болты в объём не входят.
const TABLE_VOLUME_MULT = { dno: 1, kryshka: 1, torec: 2, endPanel: 2, bokovoy: 2 };
function tableRecalcRoles(){
  return typeof TABLE_RECALC_ROLES !== 'undefined' ? TABLE_RECALC_ROLES : ['t'];
}
// Правки только тех ролей, после которых нужен пересчёт: по ним
// common-calc-state.js решает, устарел ли расчёт.
function readRecalcTableEdits(){
  const roles = tableRecalcRoles(), out = {};
  const all = readTableEdits();
  Object.keys(all).forEach(sec => Object.keys(all[sec]).forEach(key => {
    roles.forEach(role => {
      if(!(role in all[sec][key])) return;
      out[sec] = out[sec] || {};
      out[sec][key] = out[sec][key] || {};
      out[sec][key][role] = all[sec][key][role];
    });
  }));
  return out;
}
// Последний результат расчёта - основа для итогов при правках без пересчёта
// (запоминает renderSummary каждого типа; повторный вывод итогов отсюда же
// основу не меняет).
let liveCalcBase = null, liveRendering = false;
function rememberLiveCalc(calc){
  if(!liveRendering) liveCalcBase = calc;
}
function updateLiveTotals(){
  if(!liveCalcBase || typeof renderSummary !== 'function') return;
  const num = s => { const x = parseFloat(String(s).replace(',', '.')); return Number.isFinite(x) ? x : 0; };
  const recalc = tableRecalcRoles();
  let delta = 0;
  document.querySelectorAll('#boardTables table[data-section] tr[data-row-key]').forEach(tr => {
    const mult = TABLE_VOLUME_MULT[tr.closest('table').dataset.section] || 0;
    if(!mult) return;
    // Объём строки по ячейкам: текущие значения или значения последнего
    // расчёта; роли, требующие пересчёта, - всегда по последнему расчёту.
    const vol = current => TABLE_EDIT_ROLES.reduce((p, role) => {
      const c = tr.querySelector(`td[data-role="${role}"]`);
      if(!c) return 0;
      const orig = 'origText' in c.dataset ? c.dataset.origText : c.textContent;
      return p * num(current && !recalc.includes(role) ? c.textContent : orig);
    }, 1) / 1e9;
    delta += (vol(true) - vol(false)) * mult;
  });
  const base = liveCalcBase, totalVolume = base.totalVolume + delta;
  const ts = loadTimeSettings(TIME_SETTINGS_STORAGE_KEY);
  const live = Object.assign({}, base, {
    totalVolume,
    crateMass: base.totalVolume > 0 ? base.crateMass * totalVolume / base.totalVolume : base.crateMass,
    normaVremeni: Math.ceil(totalVolume / ts.baseProductivity * ts.timeCoeff * 10 - 1e-9) / 10, // как computeNormaVremeni
  });
  liveRendering = true;
  try{ renderSummary(live); }finally{ liveRendering = false; }
  if(typeof showManualEditsWarning === 'function') showManualEditsWarning();
}
// Правка ячейки таблицы деталей (общий обработчик всех типов): ячейка
// помечается исправленной; толщина (и ширина в ГОСТ 2991-85) - расчёт
// устарел, остальное - итоги сразу, без «Нажмите «Рассчитать»».
function onTableCellInput(cell){
  markCellEdited(cell);
  syncOverrideCells(cell);
  updateResetButton();
  if(tableRecalcRoles().includes(cell.dataset.role)) invalidateCalc();
  else{
    updateLiveTotals();
    invalidateCalc(); // статус - по правкам, требующим пересчёта (calcStateSignature)
  }
}
