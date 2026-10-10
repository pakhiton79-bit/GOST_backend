// Общие настройки сайта - кнопка «Настройки» в верхней панели каждой
// страницы (главная, список типов, калькуляторы). Окно настроек - большое
// (по указанию пользователя): слева разделы, справа их настройки. Разделы:
// «Оформление» - тема: как в системе / светлая / тёмная (по умолчанию - как
// в системе), переключатель - три значка с плавно перемещающимся ползунком
// (по образцу пользователя); «Пиломатериал в наличии» - подзаголовками по
// ГОСТам (по указанию пользователя): ГОСТ 10198-91 - толщины, ГОСТ 2991-85 -
// толщины и ширины (основная ширина доски - внутри типа, js/g2991/stock.js);
// общие для всех типов своего ГОСТа
// (siteAvailableThicknesses / siteAvailableWidths; выбранные внутри типа -
// в приоритете, см. loadAvailableThicknesses в js/<тип>/options.js);
// «Норма времени» (производительность, коэффициент) и «Масса ящика»
// (плотность древесины) - отдельными разделами (по указанию пользователя),
// общие для всех типов всех ГОСТов (изменённые шестерёнкой внутри типа - в
// приоритете); ГОСТы в «Пиломатериале» - плитками, как карточки внутри типа;
// «Сброс настроек» - отдельным разделом: сброс толщин и ширин и сброс всех
// сохранённых настроек сайта (resetAllSiteSettings). Справа - только
// выбранный слева раздел. Новые настройки - разделами в
// SITE_SETTINGS_SECTIONS.
// Настройки - одним объектом в localStorage, общие для всех страниц сайта.
//
// Скрипт подключается в <head>: тема ставится сразу (атрибут data-theme у
// <html>, палитра - в style.css), до первой отрисовки, без мигания светлой
// темы. Верхняя панель с кнопкой «Настройки» и окно настроек добавляются,
// когда готова разметка (см. buildSiteTopbar).
const SITE_SETTINGS_STORAGE_KEY = 'gost10198-site-settings';
const SITE_THEME_DEFAULT = 'system';
// Общее начало ключей сайта в localStorage: и общих настроек, и настроек
// страниц типов (толщины, галочки, поля, «Тонкая настройка», нормы времени,
// плотность).
const SITE_STORAGE_PREFIX = SITE_SETTINGS_STORAGE_KEY.replace(/site-settings$/, '');
// Общие толщины «в наличии» - тот же ряд, что у типов (AVAILABLE_THICKNESS_OPTIONS
// в js/<тип>/options.js).
const SITE_THICKNESS_OPTIONS = [16, 19, 22, 25, 32, 40, 50, 60, 75, 100, 125, 150, 175, 200, 225, 250];
// ГОСТ 2991-85: толщины - каждый 1 мм от 9 до 25 мм плюс толщины выше;
// ширины - от 40 до 150 мм через 5 мм (G2991_* в backend/src/g2991/table2.js).
const SITE_G2991_THICKNESS_OPTIONS = [...new Set([...Array.from({ length: 17 }, (_, i) => 9 + i), ...SITE_THICKNESS_OPTIONS])].sort((a, b) => a - b);
const SITE_G2991_WIDTH_OPTIONS = Array.from({ length: 23 }, (_, i) => 40 + i * 5);
// Списки «в наличии» по ГОСТам: ключ в общих настройках и варианты.
// Ключ ГОСТ 10198-91 - прежний (availableThickness), сохранённый выбор не теряется.
const SITE_STOCK_LISTS = {
  thickness: { key: 'availableThickness', options: SITE_THICKNESS_OPTIONS },
  thickness2991: { key: 'availableThickness2991', options: SITE_G2991_THICKNESS_OPTIONS },
  width2991: { key: 'availableWidth2991', options: SITE_G2991_WIDTH_OPTIONS },
};

// Норма времени и плотность древесины - общие для всех типов ящиков (ключи в
// общих настройках); внутри типа шестерёнкой можно задать свои - они в
// приоритете (loadTimeSettings / loadWoodDensity в common-timesettings.js).
// Остановки ползунков и значения по умолчанию - здесь: окно «Настройки» есть
// на всех страницах, common-timesettings.js - только на страницах типов.
const TIME_SETTINGS_PRODUCTIVITY_STEPS = [0.03, 0.04, 0.05, 0.06, 0.07, 0.08, 0.09];
const TIME_SETTINGS_COEFF_STEPS = [0.5, 0.7, 1.0, 1.2, 1.5, 2.0, 3.0];
const TIME_SETTINGS_DEFAULTS = { baseProductivity: 0.06, timeCoeff: 1.0 };
const WOOD_DENSITY_STEPS = [400, 450, 500, 550, 600, 650, 700, 750, 800, 850, 900];
const WOOD_DENSITY_DEFAULT = 700;
const SITE_CALC_PARAMS = {
  baseProductivity: { steps: TIME_SETTINGS_PRODUCTIVITY_STEPS, def: TIME_SETTINGS_DEFAULTS.baseProductivity, step: 0.01 },
  timeCoeff: { steps: TIME_SETTINGS_COEFF_STEPS, def: TIME_SETTINGS_DEFAULTS.timeCoeff, step: 0.01 },
  woodDensity: { steps: WOOD_DENSITY_STEPS, def: WOOD_DENSITY_DEFAULT, step: 10 },
};

// Значки - SVG (а не символы: те на части систем рисуются эмодзи или тофу).
const siteIcon = body => `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
const SITE_ICONS = {
  gear: siteIcon('<circle cx="12" cy="12" r="3.2"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'),
  system: siteIcon('<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>'),
  light: siteIcon('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>'),
  dark: siteIcon('<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>'),
  close: siteIcon('<path d="M6 6l12 12M18 6L6 18"/>'),
};
const SITE_THEMES = [
  { value: 'system', label: 'Как в системе' },
  { value: 'light', label: 'Светлая' },
  { value: 'dark', label: 'Тёмная' },
];

function loadSiteSettings(){
  try{
    const s = JSON.parse(localStorage.getItem(SITE_SETTINGS_STORAGE_KEY));
    if(s && typeof s === 'object') return s;
  }catch(e){}
  return {};
}
function saveSiteSetting(key, value){
  const s = loadSiteSettings();
  s[key] = value;
  try{ localStorage.setItem(SITE_SETTINGS_STORAGE_KEY, JSON.stringify(s)); }catch(e){}
}

// Выбранная тема (system / light / dark) и фактическая (light / dark).
function siteThemePref(){
  const t = loadSiteSettings().theme;
  return SITE_THEMES.some(x => x.value === t) ? t : SITE_THEME_DEFAULT;
}
const siteDarkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
function applySiteTheme(){
  const pref = siteThemePref();
  const dark = pref === 'dark' || (pref === 'system' && siteDarkQuery && siteDarkQuery.matches);
  if(dark) document.documentElement.setAttribute('data-theme', 'dark');
  else document.documentElement.removeAttribute('data-theme');
}
applySiteTheme();
// «Как в системе» - следом за сменой темы системы, без перезагрузки.
if(siteDarkQuery){
  const onChange = () => { if(siteThemePref() === 'system') applySiteTheme(); };
  if(siteDarkQuery.addEventListener) siteDarkQuery.addEventListener('change', onChange);
  else if(siteDarkQuery.addListener) siteDarkQuery.addListener(onChange);
}

// Переключатель темы: три значка в капсуле, под выбранным - ползунок,
// который плавно переезжает (CSS transition по --i - номеру выбранного).
function siteThemeSwitchHtml(){
  const pref = siteThemePref();
  const idx = SITE_THEMES.findIndex(t => t.value === pref);
  const opts = SITE_THEMES.map(t =>
    `<button type="button" class="theme-switch-option" role="radio" data-theme-value="${t.value}" aria-checked="${t.value === pref}" tabindex="${t.value === pref ? 0 : -1}" title="${t.label}" aria-label="${t.label}">${SITE_ICONS[t.value]}</button>`).join('');
  return `<div class="theme-switch" role="radiogroup" aria-label="Тема оформления" style="--i:${idx}"><span class="theme-switch-thumb" aria-hidden="true"></span>${opts}</div>`;
}

// Общие толщины и ширины «в наличии» (по возрастанию; пусто - строго по
// ГОСТ). list - ключ SITE_STOCK_LISTS.
function siteStockList(list){
  const d = SITE_STOCK_LISTS[list];
  const a = loadSiteSettings()[d.key];
  return Array.isArray(a) ? a.filter(v => d.options.includes(v)).sort((x, y) => x - y) : [];
}
// Толщины своего ГОСТа: gost '2991' - ГОСТ 2991-85, иначе ГОСТ 10198-91.
function siteAvailableThicknesses(gost){
  return siteStockList(gost === '2991' ? 'thickness2991' : 'thickness');
}
function siteAvailableWidths(){ return siteStockList('width2991'); }
// Сохранить общий список и сообщить странице типа (она обновит свои, если
// берёт общие): событие site-thickness-change (detail.list - какой список).
function saveSiteStockList(list, arr){
  saveSiteSetting(SITE_STOCK_LISTS[list].key, arr);
  window.dispatchEvent(new CustomEvent('site-thickness-change', { detail: { list } }));
}
function saveSiteThicknesses(arr){ saveSiteStockList('thickness', arr); }
function siteStockListHtml(list){
  const d = SITE_STOCK_LISTS[list], sel = siteStockList(list);
  const boxes = d.options.map(t =>
    `<label><input type="checkbox" value="${t}"${sel.includes(t) ? ' checked' : ''}> ${t} мм</label>`).join('');
  return `<div class="thickness-dropdown-actions">
      <button type="button" class="btn-secondary" data-site-list-all="1" data-site-list="${list}">Выбрать все</button>
      <button type="button" class="btn-secondary" data-site-list-all="0" data-site-list="${list}">Снять все</button>
    </div>
    <div class="thickness-checkbox-list" data-site-list-box="${list}">${boxes}</div>`;
}
function siteThicknessHtml(){ return siteStockListHtml('thickness'); }

// Общие норма времени и плотность (ключи настроек - имена в SITE_CALC_PARAMS).
function siteCalcParam(name){
  const v = Number(loadSiteSettings()[name]);
  return v > 0 ? v : SITE_CALC_PARAMS[name].def;
}
function siteTimeSettings(){
  return { baseProductivity: siteCalcParam('baseProductivity'), timeCoeff: siteCalcParam('timeCoeff') };
}
function siteWoodDensity(){ return siteCalcParam('woodDensity'); }
// Сохранить и сообщить странице типа (событие site-calc-settings-change).
function saveSiteCalcParam(name, v){
  saveSiteSetting(name, v);
  window.dispatchEvent(new CustomEvent('site-calc-settings-change', { detail: { param: name } }));
}
// Ползунок и поле ввода - как в шестерёнках у плиток «Итога».
function siteCalcParamHtml(name){
  const d = SITE_CALC_PARAMS[name];
  return `<div class="modal-slider-row site-calc-param">
      <div class="jump-slider" data-site-calc-slider="${name}"></div>
      <input type="number" data-site-calc-input="${name}" step="${d.step}" min="${d.step}" value="${siteCalcParam(name)}" aria-label="Значение">
    </div>`;
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
// Больше стольких шагов - метки не рисуются (на узком экране сливаются в
// сплошную рябь): ползунок выглядит сплошным, но по-прежнему ходит по шагам.
const JUMP_SLIDER_MAX_MARKS = 25;

function createJumpSlider(container, steps, onChange){
  container.classList.add('jump-slider');
  container.classList.toggle('jump-slider-dense', steps.length > JUMP_SLIDER_MAX_MARKS);
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

  // Рамка фокуса вокруг бегунка - только при управлении с клавиатуры: при
  // перетаскивании мышью/пальцем её не видно (по замечанию пользователя -
  // «коричневый круг» вокруг ползунка), см. .jump-slider-pointer в style.css.
  container.addEventListener('pointerdown', e=>{
    container.classList.add('jump-slider-pointer');
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
    container.classList.remove('jump-slider-pointer');
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

// Сброс всех толщин (по указанию пользователя): после подтверждения
// очищаются общие толщины и толщины, выбранные внутри каждого типа (ключи
// <префикс><тип>-available-thickness), страница перезагружается - везде
// расчёт строго по ГОСТ, пока толщины не выберут заново.
async function resetAllThicknesses(){
  if(!await siteConfirm({ title: 'Сбросить все толщины и ширины?', text: 'Общие и выбранные внутри типов ящиков толщины и ширины в наличии будут сняты - везде расчёт строго по ГОСТ, пока не выберете их заново.', ok: 'Сбросить', danger: true })) return;
  Object.values(SITE_STOCK_LISTS).forEach(d => saveSiteSetting(d.key, []));
  try{
    const keys = [];
    for(let i = 0; i < localStorage.length; i++){
      const k = localStorage.key(i);
      if(k && /-available-(thickness|width)$/.test(k)) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
  }catch(e){}
  location.reload();
}

// Сброс всех настроек сайта (по указанию пользователя): после подтверждения
// удаляются все ключи сайта в localStorage, страница перезагружается -
// всё возвращается к значениям по умолчанию.
async function resetAllSiteSettings(){
  if(!await siteConfirm({ title: 'Сбросить все настройки сайта?', text: 'Толщины в наличии, галочки, поля опций, «Тонкая настройка», нормы времени, плотность древесины и тема на всех страницах вернутся к значениям по умолчанию.', ok: 'Сбросить', danger: true })) return;
  try{
    const keys = [];
    for(let i = 0; i < localStorage.length; i++){
      const k = localStorage.key(i);
      if(k && (k.indexOf(SITE_STORAGE_PREFIX) === 0 || k.indexOf(SITE_STORAGE_PREFIX.replace('10198', '2991')) === 0)) keys.push(k);
    }
    keys.forEach(k => localStorage.removeItem(k));
  }catch(e){}
  location.reload();
}

// Разделы окна: заголовок и строки (название, пояснение, элемент управления).
const SITE_SETTINGS_SECTIONS = [
  {
    id: 'appearance', title: 'Оформление',
    rows: () => [{
      title: 'Тема',
      hint: 'Светлая, тёмная или «как в системе» - вслед за настройкой устройства.',
      control: siteThemeSwitchHtml,
    }],
  },
  {
    // Оба ГОСТа - в одном разделе (по указанию пользователя), подзаголовками.
    id: 'stock', title: 'Пиломатериал в наличии',
    rows: () => [{ group: 'ГОСТ 10198-91' }, {
      title: 'Толщины в наличии',
      hint: 'По умолчанию берутся во всех типах ящиков ГОСТ 10198-91. Толщины, выбранные внутри типа, - в приоритете. Ничего не выбрано - расчёт строго по ГОСТ.',
      control: () => siteStockListHtml('thickness'),
      wide: true,
    }, { group: 'ГОСТ 2991-85' }, {
      title: 'Толщины в наличии',
      hint: 'Для всех типов ящиков ГОСТ 2991-85: каждый 1 мм от 9 до 25 мм и толщины выше. Выбранные внутри типа - в приоритете. Ничего не выбрано - строго по ГОСТ.',
      control: () => siteStockListHtml('thickness2991'),
      wide: true,
    }, {
      title: 'Ширины в наличии',
      hint: 'Основные доски (основная ширина выбирается внутри типа) и доски торца - вверх до ближайшей ширины в наличии, одна ширина в наличии - все доски по ней; доборные доски и планки - тоже вверх до ближайшей. Ничего не выбрано - основная ширина как выбрана в типе (по умолчанию 100 мм), доски торца типа I - 150 мм.',
      control: () => siteStockListHtml('width2991'),
      wide: true,
    }],
  },
  {
    // Норма времени и масса ящика - отдельными разделами (по указанию
    // пользователя), общие для всех типов всех ГОСТов.
    id: 'time', title: 'Норма времени',
    rows: () => [{
      title: 'Базовая производительность, м³/ч',
      hint: 'Норма времени = объём пиломатериала / производительность × коэффициент. По умолчанию 0.06 м³/ч. Для всех типов ящиков; заданное шестерёнкой внутри типа - в приоритете.',
      control: () => siteCalcParamHtml('baseProductivity'),
      wide: true,
    }, {
      title: 'Коэффициент времени',
      hint: 'По умолчанию 1.0.',
      control: () => siteCalcParamHtml('timeCoeff'),
      wide: true,
    }],
  },
  {
    id: 'mass', title: 'Масса ящика',
    rows: () => [{
      title: 'Плотность древесины, кг/м³',
      hint: 'Масса ящика = объём пиломатериала × плотность. По умолчанию 700 кг/м³. Для всех типов ящиков; заданное шестерёнкой внутри типа - в приоритете.',
      control: () => siteCalcParamHtml('woodDensity'),
      wide: true,
    }],
  },
  {
    id: 'reset', title: 'Сброс настроек',
    rows: () => [{
      title: 'Сбросить все толщины и ширины',
      hint: 'Снимаются общие и выбранные внутри типов ящиков толщины и ширины в наличии (все ГОСТы) - везде расчёт строго по ГОСТ, пока не выберете их заново.',
      control: () => '<button type="button" class="btn-secondary" id="siteThicknessReset">Сбросить</button>',
    }, {
      title: 'Сбросить все настройки',
      hint: 'Толщины и ширины в наличии, галочки и поля опций, «Тонкая настройка», нормы времени, плотность древесины и тема - на всех страницах сайта вернутся к значениям по умолчанию.',
      control: () => '<button type="button" class="btn-secondary" id="siteSettingsReset">Сбросить</button>',
    }],
  },
];

// Строки раздела; { group } начинает плитку (по указанию пользователя - как
// карточки внутри типа): заголовок и её строки в рамке.
function siteSettingsRowsHtml(rows){
  let html = '', open = false;
  rows.forEach(r => {
    if(r.group){
      if(open) html += '</div>';
      html += `<div class="site-settings-tile"><div class="site-settings-tile-title">${r.group}</div>`;
      open = true;
      return;
    }
    html += `<div class="site-settings-row${r.wide ? ' site-settings-row-wide' : ''}">
        <div class="site-settings-row-text"><div class="site-settings-row-title">${r.title}</div><div class="site-settings-row-hint">${r.hint}</div></div>
        <div class="site-settings-row-control">${r.control()}</div>
      </div>`;
  });
  if(open) html += '</div>';
  return html;
}

function siteSettingsContentHtml(){
  const nav = SITE_SETTINGS_SECTIONS.map((s, i) =>
    `<a class="site-settings-nav-item${i === 0 ? ' active' : ''}" href="#site-settings-${s.id}" data-section="${s.id}">${s.title}</a>`).join('');
  const sections = SITE_SETTINGS_SECTIONS.map((s, i) => `<section class="site-settings-section${i === 0 ? ' active' : ''}" id="site-settings-${s.id}">
      <h3>${s.title}</h3>
      ${siteSettingsRowsHtml(s.rows())}
    </section>`).join('');
  return `<nav class="site-settings-nav">${nav}</nav><div class="site-settings-sections">${sections}</div>`;
}

// Верхняя панель сайта («чердак», по указанию пользователя - отдельно от
// формы расчёта): слева логотип «Тара+» (ссылка на главную) и ссылки
// «Назад / Главная» (берутся из .top-nav страницы - сама строка скрыта в
// style.css), справа кнопка «Настройки». Ширина содержимого - как у .wrap
// страницы; место под панель зарезервировано в style.css (body
// padding-top), поэтому при её появлении страница не сдвигается.
function buildSiteTopbar(wrap){
  const bar = document.createElement('div');
  bar.className = 'site-topbar';
  const inner = document.createElement('div');
  inner.className = 'site-topbar-inner';
  inner.style.maxWidth = getComputedStyle(wrap).maxWidth;
  const icon = document.querySelector('link[rel="icon"]');
  inner.innerHTML = `<a class="site-brand" href="index.html">${icon ? `<img src="${icon.getAttribute('href')}" alt="">` : ''}<span>Тара+</span></a>`;
  const pageNav = wrap.querySelector('.top-nav');
  if(pageNav){
    const links = document.createElement('nav');
    links.className = 'site-topbar-links';
    pageNav.querySelectorAll('a').forEach(a => links.appendChild(a.cloneNode(true)));
    inner.appendChild(links);
  }
  bar.appendChild(inner);
  document.body.insertBefore(bar, document.body.firstChild);
  return inner;
}

function initSiteSettings(){
  const wrap = document.querySelector('.wrap');
  if(!wrap || document.getElementById('siteSettingsBtn')) return;
  const topbar = buildSiteTopbar(wrap);
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'siteSettingsBtn';
  btn.className = 'site-settings-btn';
  btn.setAttribute('aria-label', 'Настройки');
  btn.innerHTML = SITE_ICONS.gear + '<span>Настройки</span>';
  topbar.appendChild(btn);

  const overlay = document.createElement('div');
  overlay.className = 'site-settings-overlay';
  overlay.id = 'siteSettingsOverlay';
  overlay.hidden = true;
  overlay.innerHTML = `<div class="site-settings-dialog" role="dialog" aria-modal="true" aria-labelledby="siteSettingsTitle">
      <div class="site-settings-head">
        <h2 id="siteSettingsTitle">Настройки</h2>
        <button type="button" class="site-settings-close" aria-label="Закрыть">${SITE_ICONS.close}</button>
      </div>
      <div class="site-settings-content"></div>
    </div>`;
  document.body.appendChild(overlay);
  const content = overlay.querySelector('.site-settings-content');

  const close = () => { overlay.hidden = true; btn.focus(); };
  btn.addEventListener('click', () => {
    content.innerHTML = siteSettingsContentHtml();
    initSiteCalcParams();
    overlay.hidden = false;
    const cur = content.querySelector('.theme-switch-option[aria-checked="true"]');
    if(cur) cur.focus();
  });
  overlay.addEventListener('click', e => { if(e.target === overlay) close(); });
  overlay.querySelector('.site-settings-close').addEventListener('click', close);
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && !overlay.hidden) close(); });

  // Норма времени и плотность: ползунок и поле, сохраняются сразу.
  function initSiteCalcParams(){
    content.querySelectorAll('[data-site-calc-slider]').forEach(el => {
      const name = el.dataset.siteCalcSlider;
      const input = content.querySelector(`[data-site-calc-input="${name}"]`);
      const slider = createJumpSlider(el, SITE_CALC_PARAMS[name].steps, v => { input.value = v; saveSiteCalcParam(name, v); });
      slider.setValue(siteCalcParam(name));
      input.addEventListener('input', () => {
        const v = parseFloat(String(input.value).replace(',', '.'));
        if(!(v > 0)) return;
        slider.setValue(v);
        saveSiteCalcParam(name, v);
      });
    });
  }
  // Выбор темы: ползунок переезжает (меняется --i), тема применяется сразу.
  function selectTheme(opt){
    const sw = opt.closest('.theme-switch');
    const opts = Array.from(sw.querySelectorAll('.theme-switch-option'));
    sw.style.setProperty('--i', opts.indexOf(opt));
    opts.forEach(o => { const on = o === opt; o.setAttribute('aria-checked', String(on)); o.tabIndex = on ? 0 : -1; });
    saveSiteSetting('theme', opt.dataset.themeValue);
    applySiteTheme();
  }
  // Выбор раздела слева: справа показывается только он.
  function selectSection(id){
    content.querySelectorAll('.site-settings-nav-item').forEach(a => a.classList.toggle('active', a.dataset.section === id));
    content.querySelectorAll('.site-settings-section').forEach(s => s.classList.toggle('active', s.id === 'site-settings-' + id));
  }
  content.addEventListener('click', e => {
    const nav = e.target.closest('.site-settings-nav-item');
    if(nav){ e.preventDefault(); selectSection(nav.dataset.section); return; }
    const opt = e.target.closest('.theme-switch-option');
    if(opt) selectTheme(opt);
    if(e.target.closest('#siteSettingsReset')) resetAllSiteSettings();
    if(e.target.closest('#siteThicknessReset')) resetAllThicknesses();
    const all = e.target.closest('[data-site-list-all]');
    if(all){
      const on = all.dataset.siteListAll === '1', list = all.dataset.siteList;
      content.querySelectorAll(`[data-site-list-box="${list}"] input`).forEach(i => { i.checked = on; });
      saveSiteStockList(list, on ? SITE_STOCK_LISTS[list].options.slice() : []);
    }
  });
  // Галочки общих толщин и ширин - сохраняются сразу.
  content.addEventListener('change', e => {
    const box = e.target.closest('[data-site-list-box]');
    if(box) saveSiteStockList(box.dataset.siteListBox, Array.from(box.querySelectorAll('input:checked')).map(i => parseInt(i.value, 10)));
  });
  // Стрелки - по вариантам, как у обычной группы переключателей.
  content.addEventListener('keydown', e => {
    const opt = e.target.closest('.theme-switch-option');
    if(!opt || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    const opts = Array.from(opt.parentNode.querySelectorAll('.theme-switch-option'));
    const step = (e.key === 'ArrowLeft' || e.key === 'ArrowUp') ? -1 : 1;
    const next = opts[(opts.indexOf(opt) + step + opts.length) % opts.length];
    selectTheme(next); next.focus(); e.preventDefault();
  });
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSiteSettings);
else initSiteSettings();

// Окно подтверждения в стиле сайта (по указанию пользователя: вместо окон
// браузера confirm/prompt). siteConfirm({ title, text, ok, danger, input })
// - Promise: отмена - null, «ОК» - true, с полем input ({ label,
// placeholder }) - введённый текст. Enter - «ОК», Esc и клик мимо - отмена.
function siteConfirm(opts){
  return new Promise(resolve => {
    const o = opts || {};
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay site-confirm';
    overlay.innerHTML = `<div class="modal-box site-confirm-box" role="alertdialog" aria-modal="true" aria-labelledby="siteConfirmTitle">
        <h3 id="siteConfirmTitle"></h3>
        <p class="site-confirm-text"></p>
        ${o.input ? '<div class="site-confirm-field"><label for="siteConfirmInput"></label><input type="text" id="siteConfirmInput" maxlength="300" autocomplete="off"></div>' : ''}
        <div class="site-confirm-actions">
          <button type="button" class="btn-secondary site-confirm-cancel">${o.cancel || 'Отмена'}</button>
          <button type="button" class="site-confirm-ok${o.danger ? ' site-confirm-danger' : ''}"></button>
        </div>
      </div>`;
    overlay.querySelector('h3').textContent = o.title || 'Подтвердите действие';
    const text = overlay.querySelector('.site-confirm-text');
    if(o.text) text.textContent = o.text; else text.remove();
    overlay.querySelector('.site-confirm-ok').textContent = o.ok || 'ОК';
    const input = overlay.querySelector('#siteConfirmInput');
    if(input){
      overlay.querySelector('label').textContent = o.input.label || '';
      input.placeholder = o.input.placeholder || '';
    }
    const before = document.activeElement;
    const done = value => {
      document.removeEventListener('keydown', onKey, true);
      overlay.remove();
      if(before && before.focus) before.focus({ preventScroll: true });
      resolve(value);
    };
    const ok = () => done(input ? input.value.trim() : true);
    const onKey = e => {
      if(e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); done(null); }
      else if(e.key === 'Enter' && !e.target.closest('.site-confirm-cancel')){ e.preventDefault(); ok(); }
      else if(e.key === 'Tab'){
        // Фокус не уходит из окна.
        const f = [...overlay.querySelectorAll('input, button')];
        const i = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
    };
    overlay.addEventListener('click', e => {
      if(e.target === overlay || e.target.closest('.site-confirm-cancel')) done(null);
      else if(e.target.closest('.site-confirm-ok')) ok();
    });
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(overlay);
    (input || overlay.querySelector('.site-confirm-ok')).focus();
  });
}
