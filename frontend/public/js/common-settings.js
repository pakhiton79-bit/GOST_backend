// Общие настройки сайта - кнопка «Настройки» в верхней панели каждой
// страницы (главная, список типов, калькуляторы). Окно настроек - большое
// (по указанию пользователя): слева разделы, справа их настройки. Разделы:
// «Оформление» - тема: как в системе / светлая / тёмная (по умолчанию - как
// в системе), переключатель - три значка с плавно перемещающимся ползунком
// (по образцу пользователя); «Пиломатериал в наличии» - подзаголовками по
// ГОСТам (по указанию пользователя): ГОСТ 10198-91 - толщины, ГОСТ 2991-85 -
// толщины, ширины и основная ширина доски; общие для всех типов своего ГОСТа
// (siteAvailableThicknesses / siteAvailableWidths; выбранные внутри типа -
// в приоритете, см. loadAvailableThicknesses в js/<тип>/options.js);
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
// ширины - от 40 до 150 мм через 5 мм; основная ширина доски - 100 мм по
// умолчанию (G2991_* в js/g2991/... и backend/src/g2991/table2.js).
const SITE_G2991_THICKNESS_OPTIONS = [...new Set([...Array.from({ length: 17 }, (_, i) => 9 + i), ...SITE_THICKNESS_OPTIONS])].sort((a, b) => a - b);
const SITE_G2991_WIDTH_OPTIONS = Array.from({ length: 23 }, (_, i) => 40 + i * 5);
const SITE_G2991_MAIN_WIDTH_DEFAULT = 100;
// Списки «в наличии» по ГОСТам: ключ в общих настройках и варианты.
// Ключ ГОСТ 10198-91 - прежний (availableThickness), сохранённый выбор не теряется.
const SITE_STOCK_LISTS = {
  thickness: { key: 'availableThickness', options: SITE_THICKNESS_OPTIONS },
  thickness2991: { key: 'availableThickness2991', options: SITE_G2991_THICKNESS_OPTIONS },
  width2991: { key: 'availableWidth2991', options: SITE_G2991_WIDTH_OPTIONS },
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
// Основная ширина доски ГОСТ 2991-85.
function siteMainWidth2991(){
  const w = loadSiteSettings().mainWidth2991;
  return SITE_G2991_WIDTH_OPTIONS.includes(w) ? w : SITE_G2991_MAIN_WIDTH_DEFAULT;
}
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
// Основная ширина доски ГОСТ 2991-85 - один вариант из списка ширин.
function siteMainWidthHtml(){
  const cur = siteMainWidth2991();
  return `<div class="thickness-checkbox-list" id="siteMainWidth2991">${SITE_G2991_WIDTH_OPTIONS.map(w =>
    `<label><input type="radio" name="siteMainWidth2991" value="${w}"${w === cur ? ' checked' : ''}> ${w} мм</label>`).join('')}</div>`;
}

// Сброс всех толщин (по указанию пользователя): после подтверждения
// очищаются общие толщины и толщины, выбранные внутри каждого типа (ключи
// <префикс><тип>-available-thickness), страница перезагружается - везде
// расчёт строго по ГОСТ, пока толщины не выберут заново.
function resetAllThicknesses(){
  if(!window.confirm('Сбросить все толщины и ширины? Общие и выбранные внутри типов ящиков толщины и ширины в наличии будут сняты - везде расчёт строго по ГОСТ, пока не выберете их заново.')) return;
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
function resetAllSiteSettings(){
  if(!window.confirm('Сбросить все настройки сайта? Толщины в наличии, галочки, поля опций, «Тонкая настройка», нормы времени, плотность древесины и тема на всех страницах вернутся к значениям по умолчанию.')) return;
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
      hint: 'Доборные доски и планки - вверх до ближайшей ширины в наличии. Ничего не выбрано - ширины как получились по расчёту.',
      control: () => siteStockListHtml('width2991'),
      wide: true,
    }, {
      title: 'Основная ширина доски',
      hint: 'Ширина основных досок щитов, дна и крышки (по умолчанию 100 мм); остаток закрывают доборные доски.',
      control: siteMainWidthHtml,
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

function siteSettingsContentHtml(){
  const nav = SITE_SETTINGS_SECTIONS.map((s, i) =>
    `<a class="site-settings-nav-item${i === 0 ? ' active' : ''}" href="#site-settings-${s.id}" data-section="${s.id}">${s.title}</a>`).join('');
  const sections = SITE_SETTINGS_SECTIONS.map((s, i) => `<section class="site-settings-section${i === 0 ? ' active' : ''}" id="site-settings-${s.id}">
      <h3>${s.title}</h3>
      ${s.rows().map(r => r.group ? `<div class="site-settings-group">${r.group}</div>` : `<div class="site-settings-row${r.wide ? ' site-settings-row-wide' : ''}">
        <div class="site-settings-row-text"><div class="site-settings-row-title">${r.title}</div><div class="site-settings-row-hint">${r.hint}</div></div>
        <div class="site-settings-row-control">${r.control()}</div>
      </div>`).join('')}
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
    overlay.hidden = false;
    const cur = content.querySelector('.theme-switch-option[aria-checked="true"]');
    if(cur) cur.focus();
  });
  overlay.addEventListener('click', e => { if(e.target === overlay) close(); });
  overlay.querySelector('.site-settings-close').addEventListener('click', close);
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && !overlay.hidden) close(); });

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
  // Галочки общих толщин и ширин и основная ширина - сохраняются сразу.
  content.addEventListener('change', e => {
    const box = e.target.closest('[data-site-list-box]');
    if(box){
      saveSiteStockList(box.dataset.siteListBox, Array.from(box.querySelectorAll('input:checked')).map(i => parseInt(i.value, 10)));
      return;
    }
    if(e.target.name === 'siteMainWidth2991'){
      saveSiteSetting('mainWidth2991', parseInt(e.target.value, 10));
      window.dispatchEvent(new CustomEvent('site-thickness-change', { detail: { list: 'mainWidth2991' } }));
    }
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
