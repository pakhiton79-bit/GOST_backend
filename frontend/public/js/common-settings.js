// Общие настройки сайта - кнопка «Настройки» в верхней панели каждой
// страницы (главная, список типов, калькуляторы). Окно настроек - большое (по указанию пользователя):
// слева разделы, справа их настройки. Пока один раздел «Оформление» с
// темой: как в системе / светлая / тёмная (по умолчанию светлая),
// переключатель - три значка с плавно перемещающимся ползунком (по образцу
// пользователя). Новые настройки - разделами в SITE_SETTINGS_SECTIONS.
// Настройки - одним объектом в localStorage, общие для всех страниц сайта.
//
// Скрипт подключается в <head>: тема ставится сразу (атрибут data-theme у
// <html>, палитра - в style.css), до первой отрисовки, без мигания светлой
// темы. Верхняя панель с кнопкой «Настройки» и окно настроек добавляются,
// когда готова разметка (см. buildSiteTopbar).
const SITE_SETTINGS_STORAGE_KEY = 'gost10198-site-settings';
const SITE_THEME_DEFAULT = 'light';

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

// Разделы окна: заголовок и строки (название, пояснение, элемент управления).
const SITE_SETTINGS_SECTIONS = [
  {
    id: 'appearance', title: 'Оформление',
    rows: () => [{
      title: 'Тема',
      hint: 'Светлая, тёмная или «как в системе» — вслед за настройкой устройства.',
      control: siteThemeSwitchHtml,
    }],
  },
];

function siteSettingsContentHtml(){
  const nav = SITE_SETTINGS_SECTIONS.map((s, i) =>
    `<a class="site-settings-nav-item${i === 0 ? ' active' : ''}" href="#site-settings-${s.id}">${s.title}</a>`).join('');
  const sections = SITE_SETTINGS_SECTIONS.map(s => `<section class="site-settings-section" id="site-settings-${s.id}">
      <h3>${s.title}</h3>
      ${s.rows().map(r => `<div class="site-settings-row">
        <div class="site-settings-row-text"><div class="site-settings-row-title">${r.title}</div><div class="site-settings-row-hint">${r.hint}</div></div>
        <div class="site-settings-row-control">${r.control()}</div>
      </div>`).join('')}
    </section>`).join('');
  return `<nav class="site-settings-nav">${nav}</nav><div class="site-settings-sections">${sections}</div>`;
}

// Верхняя панель сайта («чердак», по указанию пользователя - отдельно от
// формы расчёта): слева ссылки «Назад / Главная» (берутся из .top-nav
// страницы - сама строка скрыта в style.css), правее них логотип «Тара+»
// (ссылка на главную), справа кнопка «Настройки». Ширина содержимого - как
// у .wrap страницы; место под панель зарезервировано в style.css (body
// padding-top), поэтому при её появлении страница не сдвигается.
function buildSiteTopbar(wrap){
  const bar = document.createElement('div');
  bar.className = 'site-topbar';
  const inner = document.createElement('div');
  inner.className = 'site-topbar-inner';
  inner.style.maxWidth = getComputedStyle(wrap).maxWidth;
  const icon = document.querySelector('link[rel="icon"]');
  const pageNav = wrap.querySelector('.top-nav');
  if(pageNav){
    const links = document.createElement('nav');
    links.className = 'site-topbar-links';
    pageNav.querySelectorAll('a').forEach(a => links.appendChild(a.cloneNode(true)));
    inner.appendChild(links);
  }
  inner.insertAdjacentHTML('beforeend', `<a class="site-brand" href="index.html">${icon ? `<img src="${icon.getAttribute('href')}" alt="">` : ''}<span>Тара+</span></a>`);
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
  content.addEventListener('click', e => {
    const opt = e.target.closest('.theme-switch-option');
    if(opt) selectTheme(opt);
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
