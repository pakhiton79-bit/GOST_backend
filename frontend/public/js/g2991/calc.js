// ГОСТ 2991-85: сбор входных данных страницы типа, запрос расчёта на сервер
// (POST G2991_TYPE.api) и вывод результата. Кнопка «Рассчитать»
// вызывает общую обёртку calculate() из common-calc-state.js, та -
// calculateNow().

// Галочка опций; нет такой у типа - false.
function checked(id){
  const el = document.getElementById(id);
  return !!(el && el.checked);
}

// Тело запроса на расчёт. По нему же common-calc-state.js сравнивает текущую
// форму с последним расчётом (calcStateSignature).
function buildCalcInput(){
  return {
    L: parseFloat(document.getElementById('L').value),
    W: parseFloat(document.getElementById('W').value),
    H: parseFloat(document.getElementById('H').value),
    MASS: parseFloat(document.getElementById('M').value),
    species: (document.querySelector('input[name="species"]:checked') || {}).value || 'conifer',
    concentrated: checked('concentrated'),
    packet: checked('packet'),
    roundBoardWidths: !checked('noRoundBoardWidths'), // по умолчанию ширины округляются
    verticalEnd: checked('verticalEnd'),               // только у II-1
    noLid: checked('noLid'),
    availableThicknesses: thicknessPicker.get(),
    availableWidths: widthPicker.get(),
    mainWidth: mainWidthPicker.get(),
    tableEdits: readTableEdits(),
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
    const resp = await fetch(G2991_TYPE.api, {
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

  renderSummary(calc);
  renderBoardTables(calc);
  renderWarnings(calc.warnings);

  document.getElementById('results').style.display = 'block';
  setCalcStatus('check');
  showQuotaHint(calc.quota); // осталось мало расчётов - подсказка, common-account.js
}

// Правка ячейки таблицы: толщина - расчёт устарел (учтётся по «Рассчитать»),
// остальное - итоги сразу (onTableCellInput в common-table-edits.js).
document.getElementById('boardTables').addEventListener('input', e=>{
  if(e.target.classList.contains('editable-cell')){
    onTableCellInput(e.target);
  }
});

// Поля, из-за которых расчёт заблокирован (по тексту ошибки), - подсвечиваются
// красной рамкой (highlightErrorFields в common-calc-state.js).
function errorFieldsFor(text){
  if(/Размеры груза - не больше/.test(text)) return ['L','W','H'].filter(id => parseFloat(document.getElementById(id).value) > 15000);
  if(/Масса груза - не больше/.test(text)) return ['M'];
  if(/Заполните все поля/.test(text)) return ['L','W','H','M'].filter(id => !(parseFloat(document.getElementById(id).value) > 0));
  return [];
}

document.getElementById('boxView').src = G2991_TYPE.boxImg;
initTimeSettings(TIME_SETTINGS_STORAGE_KEY);
initDensitySettings(WOOD_DENSITY_STORAGE_KEY);
