// ГОСТ 10198-91, тип I-4: сбор входных данных, запрос расчёта на сервер
// (POST /api/i4/calculate) и вывод результата. Кнопка «Рассчитать» вызывает
// общую обёртку calculate() из common-calc-state.js, та - calculateNow().

// Ручные толщины из таблицы: только ячейки толщины, которые пользователь
// действительно правил (data-user-edited) - иначе нетронутая ячейка
// «замораживала» бы прошлое расчётное значение.
function readManualOverrides(){
  const overrides = {};
  document.querySelectorAll('#boardTables td[data-override][data-user-edited="true"]').forEach(cell=>{
    const key = cell.getAttribute('data-override');
    const val = parseFloat(cell.textContent.replace(',','.'));
    if(!Number.isNaN(val) && val>0) overrides[key] = val;
  });
  return overrides;
}

// Тело запроса на расчёт. По нему же common-calc-state.js сравнивает текущую форму
// с последним расчётом (calcStateSignature).
function buildCalcInput(){
  const manualOverrides = readManualOverrides();
  const tableEdits = readTableEdits();
  return {
    variant: fasteningType,
    L: parseFloat(document.getElementById('L').value),
    W: parseFloat(document.getElementById('W').value),
    H: parseFloat(document.getElementById('H').value),
    MASS: parseFloat(document.getElementById('M').value),
    optimizeSizes: document.getElementById('optimizeSizes').checked,
    removeFloorBoards: document.getElementById('removeFloorBoards').checked, // при креплении к доскам дна всегда снята
    removeSkidBoards: document.getElementById('removeSkidBoards').checked,
    roundBoardWidths: document.getElementById('roundBoardWidths').checked,
    solidRigidBase: document.getElementById('solidRigidBase').checked,
    forkliftLoading: document.getElementById('forkliftLoading').checked,
    xRaskosina: document.getElementById('xRaskosina').checked,
    addEndTape: document.getElementById('addEndTape').checked,
    boardGapMax: readBoardGapMax(), // наибольший промежуток между досками обшивки, мм (board-gaps.js)
    plankLayoutMode,
    plankLayoutValue,
    beamGapValue,
    beamCountValue,
    availableThicknesses,
    manualOverrides,
    tableEdits,
    ...loadTimeSettings(TIME_SETTINGS_STORAGE_KEY),
    woodDensity: loadWoodDensity(WOOD_DENSITY_STORAGE_KEY),
  };
}

// Расчёт не проведён: текст ошибки, красный статус, результаты прошлого
// расчёта скрываются.
function showCalcError(text){
  document.getElementById('err').textContent = text;
  setCalcStatus('error');
  document.getElementById('results').style.display = 'none';
}

async function calculateNow(){
  document.getElementById('err').textContent = '';
  const input = buildCalcInput();

  let calc;
  try{
    const resp = await fetch('/api/i4/calculate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    calc = await resp.json();
  }catch(e){
    showCalcError('Не удалось связаться с сервером расчёта. Проверьте соединение и повторите.');
    return;
  }
  if(calc.error){
    showCalcError(calc.error);
    return;
  }

  updatePlankLayoutFromCalc(calc);
  lastStandardBeamCount = calc.standardBeamCount;
  renderSummary(calc);
  renderBoardTables(calc, input.manualOverrides);
  renderWarnings(calc.warnings);

  document.getElementById('results').style.display = 'block';
  setCalcStatus('check');
}

['L','W','H','M'].forEach(id=>{
  document.getElementById(id).addEventListener('input', invalidateCalc);
});
['optimizeSizes','solidRigidBase','roundBoardWidths','removeFloorBoards'].forEach(id=>{
  const el = document.getElementById(id);
  if(el) el.addEventListener('change', invalidateCalc);
});

// Правка ячейки таблицы не пересчитывает сразу: ячейка помечается
// исправленной, расчёт - устаревшим; учтётся по «Рассчитать».
document.getElementById('boardTables').addEventListener('input', e=>{
  if(e.target.classList.contains('editable-cell')){
    markCellEdited(e.target); syncOverrideCells(e.target);
    updateResetButton();
    invalidateCalc();
  }
});

document.getElementById('boxView').src = BOX_IMG_B64;

initTimeSettings(TIME_SETTINGS_STORAGE_KEY);
initDensitySettings(WOOD_DENSITY_STORAGE_KEY);

// Спецификация и комментарий (#resultsMore) показываются и скрываются вместе
// с #results.
(function syncResultsMore(){
  const r = document.getElementById('results'), m = document.getElementById('resultsMore');
  if(!r || !m) return;
  const sync = () => { m.style.display = r.style.display === 'block' ? 'block' : 'none'; };
  new MutationObserver(sync).observe(r, {attributes:true, attributeFilter:['style']});
  sync();
})();

// Поля, из-за которых расчёт заблокирован (по тексту ошибки), - подсвечиваются
// красной рамкой (highlightErrorFields в common-calc-state.js).
function errorFieldsFor(text){
  if(/Заполните все поля/.test(text)) return ['L','W','H','M'].filter(id => !(parseFloat(document.getElementById(id).value) > 0));
  if(/поперечными брусьями/.test(text)) return ['beamGapInput'];
  if(/поперечных брусьев с отступом/.test(text)) return ['beamCountInput'];
  if(/Расстояние между планками/.test(text)) return ['plankGapInput'];
  if(/пояс\S* планок не помеща/.test(text)) return ['plankCountInput'];
  if(/недостаточна для отступа планок/.test(text)) return plankLayoutMode === 'count' ? ['plankCountInput'] : [];
  if(/наибольший промежуток между досками/.test(text)) return ['boardGapInput'];
  return [];
}
