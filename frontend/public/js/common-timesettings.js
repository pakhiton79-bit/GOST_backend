// Настройки нормы времени (шестерёнка у плитки "Норма времени" в ИТОГ) -
// общие для всех 3 типов ящика, но сохраняются в localStorage отдельно
// для каждого типа (ключ storageKey передаётся в initTimeSettings() из
// calc-i1.js/calc-ii1.js/app-i3.js этого типа - тот же приём, что и у
// THICKNESS_STORAGE_KEY). Порт src/common-timesettings.js исходного
// (фронтенд-only) репозитория pakhiton79-bit/GOST_10198-91 - отличие: там
// computeNormaVremeni() и есть источник итогового значения нормы времени
// (расчёт целиком в браузере), здесь тот же расчёт дублируется клиентом
// только для мгновенного отклика на ползунки и для recalcFromTable()
// (ручное редактирование ячеек таблицы) - основной путь: baseProductivity/
// timeCoeff уходят в теле запроса на сервер (POST /api/*/calculate,
// computeNormaVremeni() в backend/src/helpers.js) вместе с остальными
// входными данными, и итоговое normaVremeni приходит уже оттуда (calc.normaVremeni).
const TIME_SETTINGS_PRODUCTIVITY_STEPS = [0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09];
const TIME_SETTINGS_COEFF_STEPS = [0.5, 0.7, 1.0, 1.2, 1.5, 2.0, 3.0];
const TIME_SETTINGS_DEFAULTS = { baseProductivity: 0.06, timeCoeff: 1.0 };

// totalVolume последнего расчёта - запоминается при каждом вызове
// computeNormaVremeni() (используется только для recalcFromTable(), см.
// выше), чтобы при изменении ползунков в уже открытой шестерёнке можно
// было сразу пересчитать и обновить плитку, не заставляя пользователя
// заново нажимать «Рассчитать» (полный пересчёт на сервере учтёт новые
// настройки в любом случае при следующем нажатии).
let _timeSettingsLastVolume = null;

function loadTimeSettings(storageKey){
  try{
    const raw = localStorage.getItem(storageKey);
    if(raw){
      const parsed = JSON.parse(raw);
      const bp = Number(parsed.baseProductivity);
      const tc = Number(parsed.timeCoeff);
      return {
        baseProductivity: bp > 0 ? bp : TIME_SETTINGS_DEFAULTS.baseProductivity,
        timeCoeff: tc > 0 ? tc : TIME_SETTINGS_DEFAULTS.timeCoeff,
      };
    }
  }catch(e){}
  return Object.assign({}, TIME_SETTINGS_DEFAULTS);
}

function saveTimeSettings(storageKey, settings){
  try{ localStorage.setItem(storageKey, JSON.stringify(settings)); }catch(e){}
}

function computeNormaVremeni(totalVolume, storageKey){
  _timeSettingsLastVolume = totalVolume;
  const s = loadTimeSettings(storageKey);
  return Math.ceil((totalVolume / s.baseProductivity) * s.timeCoeff * 10 - 1e-9) / 10;
}

// Основной путь расчёта (calculate() в calc-i1.js/calc-ii1.js/app-i3.js) не
// проходит через computeNormaVremeni() выше (normaVremeni там уже приходит
// готовым с сервера) - вызывается явно сразу после рендера outTime из
// calc.normaVremeni, чтобы шестерёнка тоже могла мгновенно пересчитать
// плитку при изменении ползунков, не дожидаясь повторного «Рассчитать».
function setTimeSettingsLastVolume(totalVolume){
  _timeSettingsLastVolume = totalVolume;
}

function timeSettingsNearestStepIndex(steps, value){
  let bestIdx = 0, bestDiff = Infinity;
  steps.forEach((v, i)=>{
    const diff = Math.abs(v - value);
    if(diff < bestDiff){ bestDiff = diff; bestIdx = i; }
  });
  return bestIdx;
}

// Дискретный "прыгающий" ползунок по фиксированным остановкам (steps) -
// нативный <input type=range> не подошёл для двух требований пользователя
// сразу: (1) плавная анимация перемещения между остановками - позиция
// нативного бегунка не анимируется через CSS transition; (2) круглые
// отметки остановок на треке - нативный datalist умеет только тонкие
// штрихи, без контроля формы/цвета. Поэтому - свой минимальный виджет:
// трек с закрашенной частью (fill) до текущей остановки, круглые метки
// (по одной на каждый элемент steps, равномерно по индексу, не по
// величине - остановки коэффициента распределены неровно: 0.5..3.0) и
// бегунок (div), перетаскиваемый через Pointer Events. И перетаскивание,
// и клавиатура (стрелки/Home/End), и клик по треку - двигают ровно на
// одну остановку за раз (никогда не между ними), а left/width анимируются
// через CSS transition (см. style.css) - "прыжками, но плавно" по
// формулировке пользователя.
function createJumpSlider(container, steps, onChange){
  container.classList.add('jump-slider');
  container.setAttribute('role', 'slider');
  if(!container.hasAttribute('tabindex')) container.setAttribute('tabindex', '0');
  container.setAttribute('aria-valuemin', steps[0]);
  container.setAttribute('aria-valuemax', steps[steps.length - 1]);

  const n = steps.length;
  container.innerHTML = `
    <div class="jump-slider-track">
      <div class="jump-slider-fill"></div>
      ${steps.map(()=>'<span class="jump-slider-mark"></span>').join('')}
      <div class="jump-slider-thumb"></div>
    </div>
  `;
  const track = container.querySelector('.jump-slider-track');
  const fill = container.querySelector('.jump-slider-fill');
  const marks = Array.from(container.querySelectorAll('.jump-slider-mark'));
  const thumb = container.querySelector('.jump-slider-thumb');

  // Позиция каждой метки по индексу (равномерно) - не меняется после
  // создания, поэтому выставляется один раз здесь, а не в render().
  marks.forEach((m, i)=>{ m.style.left = (i / (n - 1) * 100) + '%'; });

  let index = 0;

  function render(){
    const pct = (index / (n - 1)) * 100;
    thumb.style.left = pct + '%';
    fill.style.width = pct + '%';
    marks.forEach((m, i)=>{ m.classList.toggle('passed', i <= index); });
    container.setAttribute('aria-valuenow', steps[index]);
  }

  function setIndex(newIndex, fire){
    newIndex = Math.max(0, Math.min(n - 1, newIndex));
    if(newIndex === index){ return; }
    index = newIndex;
    render();
    if(fire) onChange(steps[index]);
  }

  function indexFromClientX(clientX){
    const rect = track.getBoundingClientRect();
    const fraction = rect.width ? (clientX - rect.left) / rect.width : 0;
    return Math.round(Math.max(0, Math.min(1, fraction)) * (n - 1));
  }

  container.addEventListener('pointerdown', e=>{
    container.setPointerCapture(e.pointerId);
    container.focus();
    setIndex(indexFromClientX(e.clientX), true);
    function onMove(ev){ setIndex(indexFromClientX(ev.clientX), true); }
    function onUp(){
      container.removeEventListener('pointermove', onMove);
      container.removeEventListener('pointerup', onUp);
      container.removeEventListener('pointercancel', onUp);
    }
    container.addEventListener('pointermove', onMove);
    container.addEventListener('pointerup', onUp);
    container.addEventListener('pointercancel', onUp);
  });

  container.addEventListener('keydown', e=>{
    if(e.key === 'ArrowRight' || e.key === 'ArrowUp'){ setIndex(index + 1, true); e.preventDefault(); }
    else if(e.key === 'ArrowLeft' || e.key === 'ArrowDown'){ setIndex(index - 1, true); e.preventDefault(); }
    else if(e.key === 'Home'){ setIndex(0, true); e.preventDefault(); }
    else if(e.key === 'End'){ setIndex(n - 1, true); e.preventDefault(); }
  });

  render();

  return {
    setValue(v){
      index = timeSettingsNearestStepIndex(steps, v);
      render();
    },
  };
}

function initTimeSettings(storageKey){
  const btn = document.getElementById('timeSettingsBtn');
  const overlay = document.getElementById('timeSettingsOverlay');
  if(!btn || !overlay) return;

  const bpSliderEl = document.getElementById('baseProductivitySlider');
  const bpInput = document.getElementById('baseProductivityInput');
  const tcSliderEl = document.getElementById('timeCoeffSlider');
  const tcInput = document.getElementById('timeCoeffInput');

  function applySettings(next){
    saveTimeSettings(storageKey, next);
    if(_timeSettingsLastVolume != null){
      const val = computeNormaVremeni(_timeSettingsLastVolume, storageKey);
      const el = document.getElementById('outTime');
      if(el) el.innerHTML = `${val} <span>ч</span>`;
    }
  }

  const bpSlider = createJumpSlider(bpSliderEl, TIME_SETTINGS_PRODUCTIVITY_STEPS, v=>{
    bpInput.value = v;
    applySettings({ baseProductivity: v, timeCoeff: loadTimeSettings(storageKey).timeCoeff });
  });
  const tcSlider = createJumpSlider(tcSliderEl, TIME_SETTINGS_COEFF_STEPS, v=>{
    tcInput.value = v;
    applySettings({ baseProductivity: loadTimeSettings(storageKey).baseProductivity, timeCoeff: v });
  });

  function syncFieldsFromSettings(){
    const s = loadTimeSettings(storageKey);
    bpSlider.setValue(s.baseProductivity);
    bpInput.value = s.baseProductivity;
    tcSlider.setValue(s.timeCoeff);
    tcInput.value = s.timeCoeff;
  }

  window.onTimeSettingsOpen = function(){
    syncFieldsFromSettings();
    overlay.hidden = false;
  };
  window.onTimeSettingsClose = function(){
    overlay.hidden = true;
  };
  window.onTimeSettingsOverlayClick = function(event){
    if(event.target === overlay) overlay.hidden = true;
  };

  window.onBaseProductivityInputChange = function(){
    const v = parseFloat(String(bpInput.value).replace(',', '.'));
    if(!(v > 0)) return;
    bpSlider.setValue(v);
    applySettings({ baseProductivity: v, timeCoeff: loadTimeSettings(storageKey).timeCoeff });
  };
  window.onTimeCoeffInputChange = function(){
    const v = parseFloat(String(tcInput.value).replace(',', '.'));
    if(!(v > 0)) return;
    tcSlider.setValue(v);
    applySettings({ baseProductivity: loadTimeSettings(storageKey).baseProductivity, timeCoeff: v });
  };
}
