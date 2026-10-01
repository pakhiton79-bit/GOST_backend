// ГОСТ 10198-91, тип II-1: сбор входных данных, запрос расчёта на сервер
// (POST /api/ii1/calculate) и вывод результата. Кнопка «Рассчитать» вызывает
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

  const removeFloorBoardsEl = document.getElementById('removeFloorBoards');
  return {
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
    xRaskosina: document.getElementById('xRaskosina').checked,
    addParchment: document.getElementById('addParchment').checked,
    torecPostCount: manualCount.torec,
    bokPostCount: manualCount.bok,
    lidCrossBeamCount: manualCount.cross,
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
    const resp = await fetch('/api/ii1/calculate', {
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

  updateManualCountsFromCalc(calc);
  renderSummary(calc);
  renderBoardTables(calc, input.manualOverrides);
  renderWarnings(calc.warnings);

  document.getElementById('results').style.display = 'block';
  setCalcStatus('check');
}

['L','W','H','M'].forEach(id=>{
  document.getElementById(id).addEventListener('input', invalidateCalc);
});
['solidRigidBase','roundBoardWidths','removeFloorBoards','optimizeSizes','addParchment'].forEach(id=>{
  const el = document.getElementById(id);
  if(el) el.addEventListener('change', invalidateCalc);
});
document.querySelectorAll('input[name="lidLayout"]').forEach(el=>{
  el.addEventListener('change', invalidateCalc);
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

document.getElementById('boxView').src = BOX_II1_IMG_B64;
initTimeSettings(TIME_SETTINGS_STORAGE_KEY);
initDensitySettings(WOOD_DENSITY_STORAGE_KEY);

// Поля, из-за которых расчёт заблокирован (по тексту ошибки), - подсвечиваются
// красной рамкой (highlightErrorFields в common-calc-state.js).
function errorFieldsFor(text){
  if(/Заполните все поля/.test(text)) return ['L','W','H','M'].filter(id => !(parseFloat(document.getElementById(id).value) > 0));
  if(/не помеща\S* на торцевом щите/.test(text)) return ['torecPostsInput'];
  if(/не помеща\S* на боковом щите/.test(text)) return ['bokPostsInput'];
  if(/не помеща\S* в крышке/.test(text)) return ['crossBeamsInput'];
  if(/Ширина груза/.test(text)) return ['W'];
  if(/Длина груза/.test(text)) return ['L'];
  if(/высота груза/.test(text)) return ['H'];
  return [];
}
