// Общие настройки сайта - шестерёнка вверху каждой страницы (главная, список
// типов, калькуляторы), по указанию пользователя «большая и заметная». Пока
// одна настройка - тема оформления (светлая / тёмная, по умолчанию светлая);
// новые добавляются полями в то же окно (см. siteThemeFieldHtml и
// initSiteSettings). Настройки - одним объектом в localStorage, общие для
// всех страниц сайта.
//
// Скрипт подключается в <head>: тема ставится сразу (атрибут data-theme у
// <html>, палитра - в style.css), до первой отрисовки, без мигания светлой
// темы. Кнопка и окно настроек добавляются, когда готова разметка: кнопка -
// в правый край строки «Назад / Главная» (.top-nav), на главной, где этой
// строки нет, - в такую же строку в начале страницы.
const SITE_SETTINGS_STORAGE_KEY = 'gost10198-site-settings';
const SITE_THEMES = [
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

function applySiteTheme(theme){
  if(theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  else document.documentElement.removeAttribute('data-theme');
}
applySiteTheme(loadSiteSettings().theme);

// Шестерёнка (SVG, а не символ ⚙ - тот на части систем рисуется эмодзи или
// тофу, см. значки статусов в style.css).
const SITE_SETTINGS_ICON = '<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">'
  + '<circle cx="12" cy="12" r="3.2"/>'
  + '<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>'
  + '</svg>';

// Разделы окна настроек: заголовок поля и разметка выбора. Тема - два
// переключателя-кнопки; выбор применяется сразу и запоминается.
function siteThemeFieldHtml(){
  const current = loadSiteSettings().theme === 'dark' ? 'dark' : 'light';
  const buttons = SITE_THEMES.map(t =>
    `<button type="button" class="site-theme-option" data-theme-value="${t.value}" aria-pressed="${t.value === current}">${t.label}</button>`).join('');
  return `<div class="modal-field"><label>Тема оформления</label><div class="site-theme-switch" role="group" aria-label="Тема оформления">${buttons}</div></div>`;
}

function initSiteSettings(){
  const wrap = document.querySelector('.wrap');
  if(!wrap || document.getElementById('siteSettingsBtn')) return;
  let nav = wrap.querySelector('.top-nav');
  if(!nav){
    nav = document.createElement('div');
    nav.className = 'top-nav site-settings-only';
    wrap.insertBefore(nav, wrap.firstChild);
  }
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'siteSettingsBtn';
  btn.className = 'site-settings-btn';
  btn.title = 'Настройки';
  btn.setAttribute('aria-label', 'Настройки');
  btn.innerHTML = SITE_SETTINGS_ICON;
  nav.appendChild(btn);

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'siteSettingsOverlay';
  overlay.hidden = true;
  overlay.innerHTML = `<div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="siteSettingsTitle">
      <button type="button" class="modal-close" aria-label="Закрыть">✕</button>
      <h3 id="siteSettingsTitle">Настройки</h3>
      <div class="site-settings-body"></div>
    </div>`;
  document.body.appendChild(overlay);
  const body = overlay.querySelector('.site-settings-body');

  const close = () => { overlay.hidden = true; btn.focus(); };
  btn.addEventListener('click', () => { body.innerHTML = siteThemeFieldHtml(); overlay.hidden = false; });
  overlay.addEventListener('click', e => { if(e.target === overlay) close(); });
  overlay.querySelector('.modal-close').addEventListener('click', close);
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && !overlay.hidden) close(); });
  body.addEventListener('click', e => {
    const opt = e.target.closest('.site-theme-option');
    if(!opt) return;
    const theme = opt.dataset.themeValue;
    saveSiteSetting('theme', theme);
    applySiteTheme(theme);
    body.querySelectorAll('.site-theme-option').forEach(b => b.setAttribute('aria-pressed', String(b === opt)));
  });
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSiteSettings);
else initSiteSettings();
