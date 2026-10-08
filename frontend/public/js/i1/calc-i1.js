// ГОСТ 10198-91, тип I-1: сбор входных данных, запрос расчёта на сервер
// (POST /api/i1/calculate) и вывод результата. Кнопка «Рассчитать» вызывает
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
    L: parseFloat(document.getElementById('L').value),
    W: parseFloat(document.getElementById('W').value),
    H: parseFloat(document.getElementById('H').value),
    MASS: parseFloat(document.getElementById('M').value),
    skidEnabled: document.getElementById('skidEnabled').checked,
    skidThicknessRaw: skidThicknessValue,
    roundBoardWidths: document.getElementById('roundBoardWidths').checked,
    removeLidBottomRaskosina: document.getElementById('removeLidBottomRaskosina').checked,
    addRaskosina: document.getElementById('addRaskosina').checked,
    xRaskosina: document.getElementById('xRaskosina').checked,
    addEndTape: document.getElementById('addEndTape').checked,
    addParchment: document.getElementById('addParchment').checked,
    plankLayoutMode,
    plankLayoutValue,
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
    const resp = await fetch('/api/i1/calculate', {
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
    appendCalcErrorLink(calc.errorLink); // не вошли / закончились расчёты - common-account.js
    return;
  }

  updatePlankLayoutFromCalc(calc);
  renderSummary(calc);
  renderBoardTables(calc, input.manualOverrides);
  renderWarnings(calc.warnings);

  document.getElementById('results').style.display = 'block';
  setCalcStatus('check');
  showQuotaHint(calc.quota); // осталось мало расчётов - подсказка, common-account.js
}

['L','W','H','M'].forEach(id=>{
  document.getElementById(id).addEventListener('input', ()=>{
    invalidateCalc();
  });
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

// Поля, из-за которых расчёт заблокирован (по тексту ошибки), - подсвечиваются
// красной рамкой (highlightErrorFields в common-calc-state.js).
function errorFieldsFor(text){
  // Границы входных данных (inputLimitsError в расчёте).
  if(/Размеры груза - не больше/.test(text)) return ['L','W','H'].filter(id => parseFloat(document.getElementById(id).value) > 15000);
  if(/Масса груза - не больше/.test(text)) return ['M'];
  if(/Заполните все поля/.test(text)) return ['L','W','H','M'].filter(id => !(parseFloat(document.getElementById(id).value) > 0));
  if(/Расстояние между планками/.test(text)) return ['plankGapInput'];
  if(/пояс\S* планок не помеща/.test(text)) return ['plankCountInput'];
  if(/недостаточна для отступа планок/.test(text)) return plankLayoutMode === 'count' ? ['plankCountInput'] : ['L'];
  if(/Ширина груза/.test(text)) return ['W'];
  if(/раскосины торца/.test(text)) return ['W', 'H'];
  return [];
}

document.getElementById('boxView').src = BOX_I1_IMG_B64;
initTimeSettings(TIME_SETTINGS_STORAGE_KEY);
initDensitySettings(WOOD_DENSITY_STORAGE_KEY);
