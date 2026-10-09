// Настройки нормы времени (шестерёнка у плитки "Норма времени" в ИТОГ) -
// общие для всех 3 типов ящика, но сохраняются в localStorage отдельно
// для каждого типа (ключ storageKey передаётся в initTimeSettings() из
// calc-i1.js/calc-ii1.js/app-i3.js этого типа - тот же приём, что и у
// THICKNESS_STORAGE_KEY). Порт src/common-timesettings.js исходного
// (фронтенд-only) репозитория pakhiton79-bit/GOST_10198-91 - отличие: там
// computeNormaVremeni() и есть источник итогового значения нормы времени
// (расчёт целиком в браузере), здесь норма времени считается только на
// сервере: baseProductivity/timeCoeff уходят в теле запроса (POST
// /api/*/calculate, computeNormaVremeni() в backend/src/helpers.js) вместе
// с остальными входными данными, и итоговое normaVremeni приходит уже
// оттуда (calc.normaVremeni). Изменение настроек в шестерёнке только
// сохраняет их и помечает расчёт как устаревший - см. applySettings ниже.
// Остановки ползунков, значения по умолчанию и сам ползунок (createJumpSlider) -
// в common-settings.js: они же нужны окну «Настройки» на всех страницах.

function loadTimeSettings(storageKey){
  try{
    const raw = localStorage.getItem(storageKey);
    if(raw){
      const parsed = JSON.parse(raw);
      const bp = Number(parsed.baseProductivity);
      const tc = Number(parsed.timeCoeff);
      return {
        baseProductivity: bp > 0 ? bp : siteCalcParam('baseProductivity'),
        timeCoeff: tc > 0 ? tc : siteCalcParam('timeCoeff'),
      };
    }
  }catch(e){}
  return siteTimeSettings(); // внутри типа не меняли - общие «Настройки»
}

function saveTimeSettings(storageKey, settings){
  try{ localStorage.setItem(storageKey, JSON.stringify(settings)); }catch(e){}
}

// Подпись в окне шестерёнки: значения свои у типа или из общих «Настроек».
function calcSourceNote(overlay, storageKey){
  const box = overlay.querySelector('.modal-box');
  let note = box.querySelector('.modal-note');
  if(!note){
    note = document.createElement('p');
    note.className = 'modal-note';
    box.appendChild(note);
  }
  let own = false;
  try{ own = localStorage.getItem(storageKey) !== null; }catch(e){}
  note.textContent = own
    ? 'Свои значения этого типа ящика. Общие - в «Настройках».'
    : 'Сейчас - из общих «Настроек». Изменённые здесь будут только для этого типа ящика.';
}
// Общие значения поменяли в «Настройках» - тип, который берёт их, пересчитывается.
function onSiteCalcParamsChange(storageKey){
  window.addEventListener('site-calc-settings-change', ()=>{
    let own = false;
    try{ own = localStorage.getItem(storageKey) !== null; }catch(e){}
    if(!own && typeof invalidateCalc === 'function') invalidateCalc();
  });
}

function initTimeSettings(storageKey){
  const btn = document.getElementById('timeSettingsBtn');
  const overlay = document.getElementById('timeSettingsOverlay');
  if(!btn || !overlay) return;

  const bpSliderEl = document.getElementById('baseProductivitySlider');
  const bpInput = document.getElementById('baseProductivityInput');
  const tcSliderEl = document.getElementById('timeCoeffSlider');
  const tcInput = document.getElementById('timeCoeffInput');

  // По указанию пользователя - настройки нормы времени, как и любые другие
  // параметры, применяются только по «Рассчитать» (на сервере): здесь только сохраняем их и помечаем расчёт как устаревший
  // (подсказка «Нажмите «Рассчитать»», см. invalidateCalc()).
  function applySettings(next){
    saveTimeSettings(storageKey, next);
    calcSourceNote(overlay, storageKey);
    if(typeof invalidateCalc === 'function') invalidateCalc();
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
    calcSourceNote(overlay, storageKey);
    overlay.hidden = false;
  };
  onSiteCalcParamsChange(storageKey);
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

// ============ Плотность древесины («Масса ящика») ============
// Шестерёнка у плитки «Масса ящика» (по указанию пользователя - по аналогии с
// настройками нормы времени): масса ящика = объём пиломатериала × плотность.
// По умолчанию 700 кг/м³; остановки ползунка - 400..900 кг/м³ с шагом 50
// (от лёгкой сухой хвои ~450 до тяжёлых лиственных пород/сырой древесины
// ~850-900), любое другое значение - в поле ручного ввода. Хранится в
// localStorage отдельно для каждого типа ящика (ключ передаётся в
// initDensitySettings()), применяется только по «Рассчитать». Пока внутри
// типа не меняли - общая плотность из окна «Настройки» (siteWoodDensity).

function loadWoodDensity(storageKey){
  try{
    const v = Number(localStorage.getItem(storageKey));
    if(v > 0) return v;
  }catch(e){}
  return siteWoodDensity(); // внутри типа не меняли - общие «Настройки»
}

function initDensitySettings(storageKey){
  const overlay = document.getElementById('densitySettingsOverlay');
  const sliderEl = document.getElementById('woodDensitySlider');
  const input = document.getElementById('woodDensityInput');
  if(!overlay || !sliderEl || !input) return;

  function apply(v){
    try{ localStorage.setItem(storageKey, String(v)); }catch(e){}
    calcSourceNote(overlay, storageKey);
    if(typeof invalidateCalc === 'function') invalidateCalc();
  }
  const slider = createJumpSlider(sliderEl, WOOD_DENSITY_STEPS, v=>{ input.value = v; apply(v); });

  window.onDensitySettingsOpen = function(){
    const v = loadWoodDensity(storageKey);
    slider.setValue(v);
    input.value = v;
    calcSourceNote(overlay, storageKey);
    overlay.hidden = false;
  };
  onSiteCalcParamsChange(storageKey);
  window.onDensitySettingsClose = function(){ overlay.hidden = true; };
  window.onDensitySettingsOverlayClick = function(event){
    if(event.target === overlay) overlay.hidden = true;
  };
  window.onWoodDensityInputChange = function(){
    const v = parseFloat(String(input.value).replace(',', '.'));
    if(!(v > 0)) return;
    slider.setValue(v);
    apply(v);
  };
}
