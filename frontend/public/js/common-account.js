// Аккаунты (только серверная версия сайта): кнопка в верхней панели слева от
// «Настройки» - «Войти» (ведёт на login.html) или почта вошедшего (ведёт на
// account.html). Подключается в <head> после common-settings.js: панель
// строится там же по DOMContentLoaded, этот обработчик срабатывает следом.
const ACCOUNT_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>';

// Кто вошёл: { email, plan, createdAt } или null (ошибка сети - тоже null).
function fetchAccountUser(){
  return fetch('/api/auth/me', { credentials: 'same-origin' })
    .then(r => r.ok ? r.json() : { user: null })
    .then(d => d.user || null)
    .catch(() => null);
}

function initAccountButton(){
  const settingsBtn = document.getElementById('siteSettingsBtn');
  if(!settingsBtn || document.getElementById('siteAccountBtn')) return;
  const a = document.createElement('a');
  a.id = 'siteAccountBtn';
  a.className = 'site-settings-btn site-account-btn';
  const here = location.pathname.replace(/^\//, '') + location.search;
  const loginHref = 'login.html' + (here && !/^(login|account)\.html/.test(here) ? '?next=' + encodeURIComponent(here) : '');
  a.href = loginHref;
  a.innerHTML = ACCOUNT_ICON + '<span>Войти</span>';
  settingsBtn.parentNode.insertBefore(a, settingsBtn);
  initSettingsSubscription();
  fetchAccountUser().then(user => {
    accountUserCache = user;
    if(!user) return;
    a.href = 'account.html';
    a.querySelector('span').textContent = user.email;
    a.title = 'Аккаунт: ' + user.email;
  });
}

// ---------- Раздел «Подписка» в окне «Настройки» ----------
// (по указанию пользователя, по образцу Claude): подписка и полосы
// использованного лимита - месячного и бонуса за регистрацию. Раздел
// добавляется в SITE_SETTINGS_SECTIONS (common-settings.js) вторым, после
// «Оформления»; данные - при каждом открытии окна.
let accountUserCache;
function plural(n, one, few, many){
  const a = n % 10, b = n % 100;
  return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many;
}
function usageBlock(title, used, total, rightTop, leftBottom){
  const pct = total > 0 ? Math.min(100, Math.round(used / total * 100)) : 0;
  const level = pct >= 100 ? ' site-usage-full' : pct >= 80 ? ' site-usage-high' : '';
  return `<div class="site-usage${level}">
      <div class="site-usage-top"><span class="site-usage-title">${title}</span><span>${rightTop}</span></div>
      <div class="site-usage-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><div style="width:${pct}%"></div></div>
      <div class="site-usage-bottom"><span>${leftBottom}</span><span>${pct}% использовано</span></div>
    </div>`;
}
function renderSiteSub(user){
  const box = document.getElementById('siteSubBox');
  if(!box) return;
  if(!user){
    box.innerHTML = '<p class="site-sub-text">Войдите, чтобы видеть подписку и сколько расчётов осталось.</p><a class="btn-secondary site-sub-btn" href="login.html">Войти</a>';
    return;
  }
  const q = user.quota;
  const days = Math.max(1, Math.ceil((new Date(q.periodEnd) - Date.now()) / 86400000));
  let html = `<div class="site-sub-head"><div><div class="site-sub-plan">${q.planName}</div><div class="site-sub-text">${q.devices === 1 ? '1 устройство' : q.devices + ' устройства'} · новые расчёты ${new Date(q.periodEnd).toLocaleDateString('ru-RU')}</div></div>`
    + '<a class="btn-secondary site-sub-btn" href="plans.html">Все подписки</a></div>';
  html += usageBlock('Расчёты в этом месяце', q.used, q.monthly, `Обновятся через ${days} ${plural(days, 'день', 'дня', 'дней')}`, `Использовано ${q.used} из ${q.monthly.toLocaleString('ru-RU')}`);
  if(q.welcomeLeft > 0 || q.plan === 'free'){
    const used = q.welcomeTotal - q.welcomeLeft;
    html += usageBlock('Бонус за регистрацию', used, q.welcomeTotal, 'Не сгорает', `Осталось ${q.welcomeLeft} из ${q.welcomeTotal}`);
  }
  box.innerHTML = html;
}
if(typeof SITE_SETTINGS_SECTIONS !== 'undefined'){
  SITE_SETTINGS_SECTIONS.splice(1, 0, {
    id: 'subscription', title: 'Подписка',
    rows: () => [{
      title: 'Подписка и лимиты',
      hint: 'Расчёт - одно нажатие «Рассчитать». Сначала тратятся расчёты месяца, потом бонус за регистрацию.',
      control: () => '<div class="site-sub" id="siteSubBox"></div>',
      wide: true,
    }],
  });
}
// Окно открыли - сразу последние известные данные, затем свежие с сервера.
function initSettingsSubscription(){
  const btn = document.getElementById('siteSettingsBtn');
  if(!btn) return;
  btn.addEventListener('click', () => {
    if(accountUserCache !== undefined) renderSiteSub(accountUserCache);
    fetchAccountUser().then(u => { accountUserCache = u; renderSiteSub(u); });
  });
}

// Ошибка расчёта от сервера со ссылкой (не вошли - «Войти» с возвратом на
// эту страницу, закончились расчёты - «Подписки»): ссылка после текста
// ошибки (#err на страницах расчёта).
function appendCalcErrorLink(link){
  const err = document.getElementById('err');
  if(!err || !link || !/^[a-z0-9-]+\.html$/.test(link.href)) return;
  const a = document.createElement('a');
  a.className = 'calc-error-link';
  a.textContent = link.text;
  a.href = link.href === 'login.html' ? 'login.html?next=' + encodeURIComponent(location.pathname.replace(/^\//, '')) : link.href;
  err.appendChild(document.createTextNode(' '));
  err.appendChild(a);
}

// Подвал со ссылками на юридические документы (политика обработки
// персональных данных должна быть доступна на сайте без ограничений, 152-ФЗ
// ст. 18.1) - на всех страницах с .wrap.
function initLegalFooter(){
  const wrap = document.querySelector('.wrap');
  if(!wrap || document.getElementById('siteLegalFooter')) return;
  const f = document.createElement('footer');
  f.id = 'siteLegalFooter';
  f.className = 'site-legal-footer';
  f.innerHTML = `<span>© Тара+, ${new Date().getFullYear()}</span>`
    + '<a href="terms.html">Пользовательское соглашение</a>'
    + '<a href="privacy.html">Политика обработки персональных данных</a>'
    + '<a href="consent.html">Согласие на обработку персональных данных</a>';
  wrap.insertAdjacentElement('afterend', f);
}

function initAccountPage(){ initAccountButton(); initLegalFooter(); }
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAccountPage);
else initAccountPage();
