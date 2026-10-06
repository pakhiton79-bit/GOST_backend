// Аккаунты (только серверная версия сайта). По указанию пользователя в
// верхней панели - только «Войти» и «Регистрация» (для гостей), всё остальное
// об аккаунте - в окне «Настройки»: разделы «Аккаунт» (почта, выход,
// устройства, удаление) и «Подписка» (лимиты). Подключается в <head> после
// common-settings.js: панель строится там же по DOMContentLoaded, этот
// обработчик срабатывает следом.
const ACCOUNT_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>';

// Кто вошёл: { email, createdAt, quota, isAdmin } или null (ошибка сети - тоже null).
function fetchAccountUser(){
  return fetch('/api/auth/me', { credentials: 'same-origin' })
    .then(r => r.ok ? r.json() : { user: null })
    .then(d => d.user || null)
    .catch(() => null);
}
// Ссылка на вход / регистрацию с возвратом на эту страницу.
function authHref(mode){
  const here = location.pathname.replace(/^\//, '') + location.search;
  const q = [];
  if(mode === 'register') q.push('mode=register');
  if(here && !/^(login|account)\.html/.test(here)) q.push('next=' + encodeURIComponent(here));
  return 'login.html' + (q.length ? '?' + q.join('&') : '');
}

// Слева от «Настройки»: для гостей - «Войти» и «Регистрация», для
// вошедших - кнопка с почтой, открывает «Настройки» на разделе «Аккаунт».
function initAccountButton(){
  const settingsBtn = document.getElementById('siteSettingsBtn');
  if(!settingsBtn || document.getElementById('siteAccountBtn')) return;
  initSettingsAccount();
  fetchAccountUser().then(user => {
    accountUserCache = user;
    applyPlanClass(user);
    if(user){
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.id = 'siteAccountBtn';
      btn.className = 'site-settings-btn site-account-btn';
      btn.title = 'Аккаунт: ' + user.email;
      btn.innerHTML = ACCOUNT_ICON + '<span></span>';
      btn.querySelector('span').textContent = user.email;
      btn.addEventListener('click', () => openSettingsSection('account'));
      settingsBtn.parentNode.insertBefore(btn, settingsBtn);
      return;
    }
    const login = document.createElement('a');
    login.id = 'siteAccountBtn';
    login.className = 'site-settings-btn site-account-btn';
    login.href = authHref('login');
    login.innerHTML = ACCOUNT_ICON + '<span>Войти</span>';
    const reg = document.createElement('a');
    reg.className = 'site-settings-btn site-register-btn';
    reg.href = authHref('register');
    reg.innerHTML = '<span>Регистрация</span>';
    settingsBtn.parentNode.insertBefore(login, settingsBtn);
    settingsBtn.parentNode.insertBefore(reg, settingsBtn);
  });
}

// ---------- Разделы «Аккаунт» и «Подписка» в окне «Настройки» ----------
// «Аккаунт»: почта, дата регистрации, выход, администрирование (для
// администратора), устройства, удаление аккаунта. «Подписка» (по образцу
// Claude): подписка и полосы использованного лимита - месячного и бонуса за
// регистрацию. Разделы добавляются в SITE_SETTINGS_SECTIONS
// (common-settings.js) после «Оформления»; данные - при каждом открытии окна.
let accountUserCache;
// Водяной знак на печатном листе (печать и PDF) - только в Free: по указанию
// пользователя в Pro и Team его нет. Класс на <html> попадает и в копию
// страницы, которую снимает html2canvas для PDF (см. account.css).
function applyPlanClass(user){
  const paid = !!(user && user.quota && user.quota.plan && user.quota.plan !== 'free');
  document.documentElement.classList.toggle('plan-paid', paid);
}
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
  if(!user){ box.innerHTML = guestHtml('Войдите, чтобы видеть подписку и сколько расчётов осталось.'); return; }
  const q = user.quota;
  const days = Math.max(1, Math.ceil((new Date(q.periodEnd) - Date.now()) / 86400000));
  const upgrade = nextPlanId(q.plan);
  let html = `<div class="site-sub-head"><div><div class="site-sub-plan">${q.planName}</div><div class="site-sub-text">${q.devices === 1 ? '1 устройство' : q.devices + ' устройства'} · новые расчёты ${new Date(q.periodEnd).toLocaleDateString('ru-RU')}</div></div>`
    + (upgrade ? '<a class="site-sub-btn site-sub-btn-main" href="plans.html">Улучшить</a>' : '<a class="btn-secondary site-sub-btn" href="plans.html">Все подписки</a>') + '</div>';
  html += usageBlock('Расчёты в этом месяце', q.used, q.monthly, `Обновятся через ${days} ${plural(days, 'день', 'дня', 'дней')}`, `Использовано ${q.used} из ${q.monthly.toLocaleString('ru-RU')}`);
  if(q.welcomeLeft > 0 || q.plan === 'free'){
    const used = q.welcomeTotal - q.welcomeLeft;
    html += usageBlock('Бонус за регистрацию', used, q.welcomeTotal, 'Не сгорает', `Осталось ${q.welcomeLeft} из ${q.welcomeTotal}`);
  }
  box.innerHTML = html;
}
function guestHtml(text){
  return `<p class="site-sub-text">${text}</p><div class="site-acc-actions">`
    + `<a class="site-sub-btn site-sub-btn-main" href="${authHref('login')}">Войти</a>`
    + `<a class="btn-secondary site-sub-btn" href="${authHref('register')}">Регистрация</a></div>`;
}
const fmtAccDate = iso => new Date(iso).toLocaleDateString('ru-RU');
const fmtAccDateTime = iso => fmtAccDate(iso) + ' ' + new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
function escHtml(s){ return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

function renderSiteAccount(user){
  const box = document.getElementById('siteAccountBox');
  if(!box) return;
  if(!user){ box.innerHTML = guestHtml('Войдите или зарегистрируйтесь, чтобы считать ящики.'); return; }
  box.innerHTML = `<div class="site-acc-rows">
      <div class="account-row"><span>Почта</span><span>${escHtml(user.email)}</span></div>
      <div class="account-row"><span>Зарегистрирован</span><span>${fmtAccDate(user.createdAt)}</span></div>
    </div>
    <div class="site-acc-actions">
      <button type="button" class="btn-secondary site-sub-btn" data-acc="logout">Выйти</button>
      ${user.isAdmin ? '<a class="btn-secondary site-sub-btn" href="admin.html">Администрирование</a>' : ''}
    </div>
    <div class="site-acc-block">
      <div class="site-usage-title">Устройства</div>
      <p class="site-sub-text" id="siteAccDevNote"></p>
      <div class="auth-devices" id="siteAccDevices"></div>
    </div>
    <div class="site-acc-block site-acc-danger">
      <div class="site-usage-title">Удаление аккаунта</div>
      <p class="site-sub-text">Аккаунт, подписка, счётчики и входы на всех устройствах удаляются без возможности восстановления.</p>
      <div class="site-acc-delete" id="siteAccDelete" hidden>
        <div class="auth-msg" id="siteAccDelMsg" hidden></div>
        <div class="auth-field"><input type="password" id="siteAccDelPw" placeholder="Пароль для подтверждения" autocomplete="current-password" maxlength="200" aria-label="Пароль для подтверждения"></div>
        <button type="button" class="btn-secondary site-sub-btn site-acc-del-btn" data-acc="delete-confirm">Удалить навсегда</button>
      </div>
      <button type="button" class="btn-secondary site-sub-btn site-acc-del-btn" data-acc="delete-open">Удалить аккаунт</button>
    </div>`;
  loadAccountDevices(user);
}
function loadAccountDevices(user){
  fetch('/api/auth/devices', { credentials: 'same-origin' }).then(r => r.json())
    .then(d => renderAccountDevices(d.devices || [], user.quota)).catch(() => {});
}
function renderAccountDevices(list, q){
  const note = document.getElementById('siteAccDevNote'), box = document.getElementById('siteAccDevices');
  if(!note || !box) return;
  note.textContent = `По подписке ${q.planName}: ${q.devices === 1 ? '1 устройство' : 'до ' + q.devices + ' устройств'}, сейчас ${list.length}.`;
  box.innerHTML = list.map(dev => `<div class="auth-device"><div><div class="auth-device-name">${escHtml(dev.label)}${dev.current ? ' (это устройство)' : ''}</div>`
    + `<div class="auth-device-seen">Последний раз: ${fmtAccDateTime(dev.lastSeen)}</div></div>`
    + (dev.current ? '' : `<button type="button" class="btn-secondary" data-acc="device-logout" data-id="${escHtml(dev.id)}">Выйти</button>`) + '</div>').join('');
}

// Действия в разделе «Аккаунт».
document.addEventListener('click', async e => {
  const el = e.target.closest('[data-acc]');
  if(!el || !el.closest('#siteAccountBox')) return;
  const act = el.dataset.acc;
  const post = (path, body) => fetch('/api/auth/' + path, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
  if(act === 'logout'){
    el.disabled = true;
    post('logout').finally(() => { location.href = 'index.html'; });
  } else if(act === 'device-logout'){
    el.disabled = true;
    const d = await post('devices/logout', { id: el.dataset.id }).then(r => r.json()).catch(() => ({}));
    if(d.devices && accountUserCache) renderAccountDevices(d.devices, accountUserCache.quota); else el.disabled = false;
  } else if(act === 'delete-open'){
    el.hidden = true;
    document.getElementById('siteAccDelete').hidden = false;
    document.getElementById('siteAccDelPw').focus();
  } else if(act === 'delete-confirm'){
    const msg = document.getElementById('siteAccDelMsg'), pw = document.getElementById('siteAccDelPw').value;
    const fail = t => { msg.hidden = false; msg.className = 'auth-msg auth-msg-error'; msg.textContent = t; };
    if(!pw) return fail('Введите пароль, чтобы подтвердить удаление.');
    if(!window.confirm('Удалить аккаунт без возможности восстановления?')) return;
    el.disabled = true;
    try{
      const r = await post('delete', { password: pw });
      const d = await r.json();
      if(!r.ok) throw new Error(d.error || 'Ошибка сервера.');
      location.href = 'index.html';
    }catch(err){ fail(err.message); el.disabled = false; }
  }
});

if(typeof SITE_SETTINGS_SECTIONS !== 'undefined'){
  SITE_SETTINGS_SECTIONS.splice(1, 0, {
    id: 'account', title: 'Аккаунт',
    rows: () => [{ title: 'Данные аккаунта', hint: '', control: () => '<div class="site-acc" id="siteAccountBox"></div>', wide: true }],
  }, {
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
// Адрес с #account или #subscription (например, со старой страницы
// account.html) - окно открывается сразу на этом разделе.
function initSettingsAccount(){
  const btn = document.getElementById('siteSettingsBtn');
  if(!btn) return;
  const render = u => { renderSiteAccount(u); renderSiteSub(u); };
  btn.addEventListener('click', () => {
    if(accountUserCache !== undefined) render(accountUserCache);
    fetchAccountUser().then(u => { accountUserCache = u; applyPlanClass(u); render(u); });
  });
  const section = location.hash.replace('#', '');
  if(section === 'account' || section === 'subscription'){
    openSettingsSection(section);
    history.replaceState(null, '', location.pathname + location.search);
  }
}
// Открыть окно «Настройки» сразу на разделе.
function openSettingsSection(section){
  const btn = document.getElementById('siteSettingsBtn');
  if(!btn) return;
  btn.click();
  const nav = document.querySelector(`.site-settings-nav-item[data-section="${section}"]`);
  if(nav) nav.click();
}

// ---------- Предложения подписки (по указанию пользователя - к месту, не
// везде и коротко): после расчёта - только когда расчётов осталось мало; в
// настройках - кнопка «Улучшить». Числа подписок - с сервера (/api/plans).
let plansPromise = null;
function loadPlans(){
  if(!plansPromise) plansPromise = fetch('/api/plans').then(r => r.json()).then(d => {
    const by = {}; (d.plans || []).forEach(p => { by[p.id] = p; }); return by;
  }).catch(() => ({}));
  return plansPromise;
}
// Следующая подписка для предложения: Free -> Pro, Pro -> Team, Team - нет.
function nextPlanId(plan){ return plan === 'free' ? 'pro' : plan === 'pro' ? 'team' : null; }
function calcWord(n){ return plural(n, 'расчёт', 'расчёта', 'расчётов'); }

// Под кнопкой «Рассчитать» после успешного расчёта: осталось 5 и меньше
// (или 10% и меньше у платных) - сколько осталось и ссылка на подписку больше.
function showQuotaHint(q){
  const err = document.getElementById('err');
  if(!err) return;
  let hint = document.getElementById('quotaHint');
  if(!hint){
    hint = document.createElement('div');
    hint.id = 'quotaHint';
    hint.className = 'quota-hint';
    err.insertAdjacentElement('afterend', hint);
  }
  hint.hidden = true;
  if(!q) return;
  const low = q.plan === 'free' ? q.left <= 5 : q.left <= Math.max(5, Math.round(q.monthly * 0.1));
  if(!low) return;
  const reset = new Date(q.periodEnd).toLocaleDateString('ru-RU');
  const next = nextPlanId(q.plan);
  loadPlans().then(plans => {
    const np = next && plans[next];
    hint.textContent = q.left === 0 ? `Расчёты закончились до ${reset}.` : `Осталось ${q.left} ${calcWord(q.left)}.`;
    if(np){
      const a = document.createElement('a');
      a.href = 'plans.html';
      a.textContent = `Больше в ${np.name}`;
      hint.append(' ', a);
    }
    hint.hidden = false;
  });
}

// Ошибка расчёта от сервера со ссылкой (не вошли - «Войти» с возвратом на
// эту страницу, закончились расчёты - «Подписки»): ссылка после текста
// ошибки (#err на страницах расчёта).
function appendCalcErrorLink(link){
  const hint = document.getElementById('quotaHint');
  if(hint) hint.hidden = true;
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
