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

function initTimeSettings(storageKey){
  const btn = document.getElementById('timeSettingsBtn');
  const overlay = document.getElementById('timeSettingsOverlay');
  if(!btn || !overlay) return;

  const bpSlider = document.getElementById('baseProductivitySlider');
  const bpInput = document.getElementById('baseProductivityInput');
  const tcSlider = document.getElementById('timeCoeffSlider');
  const tcInput = document.getElementById('timeCoeffInput');

  function syncFieldsFromSettings(){
    const s = loadTimeSettings(storageKey);
    bpSlider.value = timeSettingsNearestStepIndex(TIME_SETTINGS_PRODUCTIVITY_STEPS, s.baseProductivity);
    bpInput.value = s.baseProductivity;
    tcSlider.value = timeSettingsNearestStepIndex(TIME_SETTINGS_COEFF_STEPS, s.timeCoeff);
    tcInput.value = s.timeCoeff;
  }

  function applySettings(next){
    saveTimeSettings(storageKey, next);
    if(_timeSettingsLastVolume != null){
      const val = computeNormaVremeni(_timeSettingsLastVolume, storageKey);
      const el = document.getElementById('outTime');
      if(el) el.innerHTML = `${val} <span>ч</span>`;
    }
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

  window.onBaseProductivitySliderInput = function(){
    const v = TIME_SETTINGS_PRODUCTIVITY_STEPS[parseInt(bpSlider.value, 10)];
    bpInput.value = v;
    applySettings({ baseProductivity: v, timeCoeff: loadTimeSettings(storageKey).timeCoeff });
  };
  window.onBaseProductivityInputChange = function(){
    const v = parseFloat(String(bpInput.value).replace(',', '.'));
    if(!(v > 0)) return;
    bpSlider.value = timeSettingsNearestStepIndex(TIME_SETTINGS_PRODUCTIVITY_STEPS, v);
    applySettings({ baseProductivity: v, timeCoeff: loadTimeSettings(storageKey).timeCoeff });
  };
  window.onTimeCoeffSliderInput = function(){
    const v = TIME_SETTINGS_COEFF_STEPS[parseInt(tcSlider.value, 10)];
    tcInput.value = v;
    applySettings({ baseProductivity: loadTimeSettings(storageKey).baseProductivity, timeCoeff: v });
  };
  window.onTimeCoeffInputChange = function(){
    const v = parseFloat(String(tcInput.value).replace(',', '.'));
    if(!(v > 0)) return;
    tcSlider.value = timeSettingsNearestStepIndex(TIME_SETTINGS_COEFF_STEPS, v);
    applySettings({ baseProductivity: loadTimeSettings(storageKey).baseProductivity, timeCoeff: v });
  };
}
