// ГОСТ 10198-91, тип II-2 (как у II-1): «Тонкая настройка» толщин - раскрывающаяся группа
// в карточке «Толщины пиломатериала в наличии». Пустое поле - толщина по
// расчёту, заполненное - эта толщина в расчёте вместо расчётной (без
// округления до толщин «в наличии»); правка толщины в ячейке таблицы
// деталей - ещё главнее (по указанию пользователя). Каркас - одна толщина и
// у стоек, и у раскосин. Расчёт - на сервере (fineThickness в compute.js).
// Значения запоминаются в localStorage; группа открыта, если есть хоть одно.
// Порядок - по узлам ящика (по указанию пользователя - логично
// расположить): 1-й ряд - дно снизу вверх, 2-й - щиты (каркас и обшивка) и
// крышка. Сетка - 4 или 2 колонки (style.css), чтобы ряды не разъезжались.
const FINE_THICKNESS_FIELDS = [
  { key: 'skid',      label: 'Полозья' },
  { key: 'sub',       label: 'Подполозные доски' },
  { key: 'endBeam',   label: 'Торцовые брусья дна' },
  { key: 'floor',     label: 'Доски дна' },
  { key: 'frame',     label: 'Каркас (стойки и раскосины)' },
  { key: 'skin',      label: 'Доски обшивки' },
  { key: 'crossBeam', label: 'Поперечные брусья крышки' },
  { key: 'longBeam',  label: 'Продольные брусья крышки', hint: 'при досках крышки поперёк ящика' },
];
const FINE_THICKNESS_STORAGE_KEY = OPTIONS_STORAGE_PREFIX + 'fineThickness';

function fineThicknessInputId(key){
  return 'fine' + key.charAt(0).toUpperCase() + key.slice(1);
}

// Заполненные поля (мм > 0) - во входные данные расчёта.
function readFineThickness(){
  const out = {};
  FINE_THICKNESS_FIELDS.forEach(f => {
    const v = parseFloat(String(document.getElementById(fineThicknessInputId(f.key)).value).replace(',', '.'));
    if(v > 0) out[f.key] = v;
  });
  return out;
}

function onFineThicknessInput(){
  try{ localStorage.setItem(FINE_THICKNESS_STORAGE_KEY, JSON.stringify(readFineThickness())); }catch(e){}
  invalidateCalc();
}

// Поля - по списку выше; восстановление сохранённых значений.
(function initFineThickness(){
  const grid = document.getElementById('fineThicknessGrid');
  grid.innerHTML = FINE_THICKNESS_FIELDS.map(f => {
    const id = fineThicknessInputId(f.key);
    return `<div class="fine-thickness-field">
      <label for="${id}">${f.label}${f.hint ? `<span class="fine-thickness-hint">${f.hint}</span>` : ''}</label>
      <input type="number" id="${id}" min="1" step="1" inputmode="decimal" placeholder="по расчёту" oninput="onFineThicknessInput()">
    </div>`;
  }).join('');
  let saved = {};
  try{ saved = JSON.parse(localStorage.getItem(FINE_THICKNESS_STORAGE_KEY)) || {}; }catch(e){}
  let any = false;
  FINE_THICKNESS_FIELDS.forEach(f => {
    if(saved[f.key] > 0){ document.getElementById(fineThicknessInputId(f.key)).value = saved[f.key]; any = true; }
  });
  if(any) document.getElementById('fineThickness').open = true;
})();
