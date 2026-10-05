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
  fetchAccountUser().then(user => {
    if(!user) return;
    a.href = 'account.html';
    a.querySelector('span').textContent = user.email;
    a.title = 'Аккаунт: ' + user.email;
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

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAccountButton);
else initAccountButton();
