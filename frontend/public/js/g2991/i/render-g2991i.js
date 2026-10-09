// ГОСТ 2991-85, тип I: вывод результата. ЗАГОТОВКА: пока только толщины
// досок по ГОСТ (детали и итог - когда будет таблица расчёта).

function renderThicknessTable(calc){
  let html = `<div class="spec-table"><table><thead><tr><th>Деталь</th><th class="num">Толщина, мм</th><th>Основание</th></tr></thead><tbody>`;
  calc.thicknessRows.forEach(r => {
    html += `<tr><td>${r.name}</td><td class="num">${r.t}</td><td>${r.basis}</td></tr>`;
  });
  html += `</tbody></table></div>`;
  document.getElementById('thicknessTable').innerHTML = html;
  document.getElementById('outInner').innerHTML = `${calc.innerL} × ${calc.innerW} × ${calc.innerH} <span>мм</span>`;
  document.getElementById('outCargoMass').innerHTML = `${calc.mass} <span>кг</span>`;
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
