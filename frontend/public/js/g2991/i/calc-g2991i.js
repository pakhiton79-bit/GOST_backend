// ГОСТ 2991-85, тип I: сбор входных данных, запрос расчёта на сервер
// (POST /api/g2991i/calculate) и вывод результата. Кнопка «Рассчитать»
// вызывает общую обёртку calculate() из common-calc-state.js, та -
// calculateNow().

// Тело запроса на расчёт. По нему же common-calc-state.js сравнивает текущую
// форму с последним расчётом (calcStateSignature).
function buildCalcInput(){
  return {
    L: parseFloat(document.getElementById('L').value),
    W: parseFloat(document.getElementById('W').value),
    H: parseFloat(document.getElementById('H').value),
    MASS: parseFloat(document.getElementById('M').value),
    noLid: document.getElementById('noLid').checked,
    availableThicknesses,
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
    const resp = await fetch('/api/g2991i/calculate', {
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

  renderThicknessTable(calc);
  renderWarnings(calc.warnings);

  document.getElementById('results').style.display = 'block';
  setCalcStatus('check');
  showQuotaHint(calc.quota); // осталось мало расчётов - подсказка, common-account.js
}

// Поля, из-за которых расчёт заблокирован (по тексту ошибки), - подсвечиваются
// красной рамкой (highlightErrorFields в common-calc-state.js).
function errorFieldsFor(text){
  if(/Размеры груза - не больше/.test(text)) return ['L','W','H'].filter(id => parseFloat(document.getElementById(id).value) > 15000);
  if(/Масса груза - не больше/.test(text)) return ['M'];
  if(/Заполните все поля/.test(text)) return ['L','W','H','M'].filter(id => !(parseFloat(document.getElementById(id).value) > 0));
  return [];
}
