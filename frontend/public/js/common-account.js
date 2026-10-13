// Аккаунт и всё вокруг него в общих частях страниц. Подключается в <head>
// после common-settings.js: панель строится там же по DOMContentLoaded, этот
// обработчик срабатывает следом (initAccountPage в конце файла).
//
// Содержание:
//   - кто вошёл (fetchAccountUser) и кнопка аккаунта в верхней панели: для
//     гостей «Войти» и «Регистрация», для вошедших - почта, открывает
//     «Настройки» на разделе «Аккаунт»;
//   - разделы окна «Настройки»: «Аккаунт» (почта, выход, устройства,
//     удаление), «Подписка» (лимиты), «Помощь» (почта поддержки);
//   - подсказки о лимите расчётов и ссылки на подписки;
//   - нижняя строка со ссылками на юридические документы;
//   - вид страницы (sitePageMode): на главной и на входе в «Настройках» только
//     тема, на входе нет кнопки аккаунта и нижней строки.
const ACCOUNT_ICON = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>';

// Кто вошёл: { email, createdAt, quota, isAdmin } или null.
// По замечанию пользователя («вошёл, а просит войти»): ошибка связи (сервер
// на Render перезапускается или «просыпается») - не повод считать человека
// гостем. Запрос повторяется; если сервер так и не ответил - остаётся то, что
// было известно. Ответ «не вошёл» при известном входе (аккаунты стёрлись при
// перезапуске или вход на другом устройстве) - панель переключается на
// «Войти» и объясняет причину (noteAccountUser).
function fetchAccountUser(){
  const once = () => fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' })
    .then(r => { if(!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(d => d.user || null);
  const attempt = left => once().catch(err => left > 0
    ? new Promise(res => setTimeout(res, 1500)).then(() => attempt(left - 1))
    : Promise.reject(err));
  return attempt(2)
    .then(user => { noteAccountUser(user); return user; })
    .catch(() => (accountUserCache !== undefined ? accountUserCache : null));
}
// Вход завершился, пока страница была открыта (сообщение в окнах вместо
// обычного «Войдите»).
let accountSessionEnded = false;
let accountButtonEnabled = false; // кнопка аккаунта есть на этой странице (initAccountButton)
function noteAccountUser(user){
  if(accountUserCache && !user) accountSessionEnded = true;
  if(user) accountSessionEnded = false;
  accountUserCache = user;
  applyPlanClass(user);
  renderAccountButton(user);
  renderAutoRenewNotice(user);
}
// Сообщение об автопродлении (по указанию пользователя - вместе с письмом):
// за 3 дня до продления (autoRenew.noticeDue с сервера) - полоса вверху
// страницы со ссылкой на «Аккаунт», где его можно отключить. Закрытое
// сообщение больше не показывается до следующего продления (ключ - дата
// окончания подписки).
function renderAutoRenewNotice(user){
  const old = document.getElementById('siteAutoRenewNotice');
  const ar = user && user.autoRenew, until = user && user.quota && user.quota.planUntil;
  const key = 'gost10198-autorenew-notice-' + until;
  let closed = false;
  try{ closed = localStorage.getItem(key) === '1'; }catch(e){}
  if(!ar || !ar.noticeDue || !until || closed){ if(old) old.remove(); return; }
  if(old) return;
  const wrap = document.querySelector('.wrap');
  if(!wrap) return;
  const el = document.createElement('div');
  el.id = 'siteAutoRenewNotice';
  el.className = 'note site-autorenew-notice';
  el.innerHTML = `<span>Подписка ${escHtml(user.quota.planName)} будет автоматически продлена ${new Date(until).toLocaleDateString('ru-RU')}, сумма ${ar.amount.toLocaleString('ru-RU')} ₽. `
    + `<a href="#account" data-ar-open>Отключить автопродление</a></span>`
    + '<button type="button" class="site-autorenew-close" aria-label="Закрыть">×</button>';
  el.querySelector('[data-ar-open]').addEventListener('click', e => {
    e.preventDefault();
    openSettingsSection('account');
    // блок автопродления появляется, когда придут данные аккаунта
    let tries = 0;
    const scroll = () => { const b = document.getElementById('siteAutoRenew'); if(b) b.scrollIntoView({ block: 'center' }); else if(++tries < 20) setTimeout(scroll, 100); };
    scroll();
  });
  el.querySelector('.site-autorenew-close').addEventListener('click', () => {
    try{ localStorage.setItem(key, '1'); }catch(e){}
    el.remove();
  });
  wrap.insertBefore(el, wrap.firstChild);
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
  accountButtonEnabled = true;
  fetchAccountUser();
}
// Кнопка (кнопки) аккаунта по состоянию входа; перерисовывается, только
// если состояние поменялось.
function renderAccountButton(user){
  const settingsBtn = document.getElementById('siteSettingsBtn');
  if(!accountButtonEnabled || !settingsBtn) return;
  const state = user ? 'user:' + user.email : 'guest';
  const cur = document.getElementById('siteAccountBtn');
  if(cur && cur.dataset.state === state) return;
  if(cur) cur.remove();
  document.querySelectorAll('.site-register-btn').forEach(el => el.remove());
  if(user){
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'siteAccountBtn';
    btn.className = 'site-settings-btn site-account-btn';
    btn.title = 'Аккаунт: ' + user.email;
    btn.innerHTML = ACCOUNT_ICON + '<span></span>';
    btn.querySelector('span').textContent = user.email;
    btn.dataset.state = state;
    btn.addEventListener('click', () => openSettingsSection('account'));
    settingsBtn.parentNode.insertBefore(btn, settingsBtn);
    return;
  }
  const login = document.createElement('a');
  login.id = 'siteAccountBtn';
  login.dataset.state = state;
  login.className = 'site-settings-btn site-account-btn';
  login.href = authHref('login');
  login.innerHTML = ACCOUNT_ICON + '<span>Войти</span>';
  const reg = document.createElement('a');
  reg.className = 'site-settings-btn site-register-btn';
  reg.href = authHref('register');
  reg.innerHTML = '<span>Регистрация</span>';
  settingsBtn.parentNode.insertBefore(login, settingsBtn);
  settingsBtn.parentNode.insertBefore(reg, settingsBtn);
}

// ---------- Разделы «Аккаунт» и «Подписка» в окне «Настройки» ----------
// «Аккаунт»: почта, дата регистрации, выход, администрирование (для
// администратора), устройства, удаление аккаунта. «Подписка» (по образцу
// Claude): подписка и полосы использованного лимита - месячного и бонуса за
// регистрацию. Разделы добавляются в SITE_SETTINGS_SECTIONS
// (common-settings.js) после «Оформления»; данные - при каждом открытии окна.
let accountUserCache;
// Водяной знак на печатном листе (печать и PDF): по указанию пользователя в
// Pro и Team его нет (в пробной и Base - есть). Класс на <html> попадает и в копию
// страницы, которую снимает html2canvas для PDF (см. account.css).
function applyPlanClass(user){
  const paid = !!(user && user.quota && ['pro', 'team'].includes(user.quota.plan));
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
  // У пробной месячных расчётов нет (только за регистрацию) - без даты и полосы месяца.
  const renew = q.monthly ? ` · новые расчёты ${new Date(q.periodEnd).toLocaleDateString('ru-RU')}` : '';
  // Платная подписка - на срок (1 или 3 месяца), по окончании - пробная.
  const until = q.planUntil ? ` · действует до ${new Date(q.planUntil).toLocaleDateString('ru-RU')}` : '';
  let html = `<div class="site-sub-head"><div><div class="site-sub-plan">${q.planName}</div><div class="site-sub-text">${q.devices === 1 ? '1 устройство' : q.devices + ' устройства'}${until}${renew}</div></div>`
    + (upgrade ? '<a class="site-sub-btn site-sub-btn-main" href="plans.html">Улучшить</a>' : '<a class="btn-secondary site-sub-btn" href="plans.html">Все подписки</a>') + '</div>';
  if(q.monthly) html += usageBlock('Расчёты в этом месяце', q.used, q.monthly, `Обновятся через ${days} ${plural(days, 'день', 'дня', 'дней')}`, `Использовано ${q.used} из ${q.monthly.toLocaleString('ru-RU')}`);
  if(q.welcomeLeft > 0 || q.plan === 'free'){
    const used = q.welcomeTotal - q.welcomeLeft;
    html += usageBlock('Бонус за регистрацию', used, q.welcomeTotal, 'Не сгорает', `Осталось ${q.welcomeLeft} из ${q.welcomeTotal}`);
  }
  // Расчёты, выданные администратором (сверх подписки).
  if(q.extraLeft > 0) html += usageBlock('Дополнительные расчёты', q.extraTotal - q.extraLeft, q.extraTotal, 'Не сгорают', `Осталось ${q.extraLeft.toLocaleString('ru-RU')} из ${q.extraTotal.toLocaleString('ru-RU')}`);
  html += autoRenewHtml(user);
  box.innerHTML = html;
}
// Автопродление платной подписки (по указанию пользователя; сервер -
// src/auth/auto-renew.js). user.autoRenew - null, пока функция выключена на
// сервере (до подключения онлайн-оплаты) - тогда блока нет. Включить - только
// с отдельным согласием (галочка не отмечена заранее), отключить - одной
// кнопкой в любой момент.
function autoRenewHtml(user){
  const ar = user.autoRenew;
  if(!ar || !ar.paid) return '';
  const q = user.quota, sum = ar.amount.toLocaleString('ru-RU') + ' ₽';
  const until = q.planUntil ? new Date(q.planUntil).toLocaleDateString('ru-RU') : '';
  const body = ar.on
    ? `<p class="site-sub-text">Включено. ${until ? until + ' ' : ''}подписка ${escHtml(q.planName)} продлится на тот же срок, сумма ${sum}. За ${ar.noticeDays} дня до списания придёт письмо.</p>
       <div class="site-acc-actions"><button type="button" class="btn-secondary site-sub-btn" data-ar="off">Отключить автопродление</button></div>`
    : `<p class="site-sub-text">Выключено: по окончании срока${until ? ' (' + until + ')' : ''} подписка перейдёт на «Пробную».</p>
       <label class="site-ar-consent"><input type="checkbox" id="siteArConsent"> <span>Согласен(на) на автоматическое продление подписки ${escHtml(q.planName)} на тот же срок со списанием ${sum} (по действующей цене) тем же способом оплаты - на условиях <a href="terms.html#terms-autorenew" target="_blank">Пользовательского соглашения</a>. Отключить можно в любой момент.</span></label>
       <div class="site-acc-actions"><button type="button" class="site-sub-btn site-sub-btn-main" data-ar="on" disabled>Включить автопродление</button></div>`;
  return `<div class="site-acc-block" id="siteAutoRenew"><div class="site-usage-title">Автопродление</div>${body}<div class="auth-msg" id="siteArMsg" hidden></div></div>`;
}
document.addEventListener('change', e => {
  if(e.target.id !== 'siteArConsent') return;
  const btn = document.querySelector('#siteAutoRenew [data-ar="on"]');
  if(btn) btn.disabled = !e.target.checked;
});
document.addEventListener('click', async e => {
  const el = e.target.closest('#siteAutoRenew [data-ar]');
  if(!el) return;
  const on = el.dataset.ar === 'on', msg = document.getElementById('siteArMsg');
  const consent = document.getElementById('siteArConsent');
  if(on && !(consent && consent.checked)) return;
  el.disabled = true;
  try{
    const r = await fetch('/api/auth/auto-renew', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(on ? { on: true, consent: true } : { on: false }) });
    const d = await r.json();
    if(!r.ok) throw new Error(d.error || 'Ошибка сервера.');
    if(accountUserCache){ accountUserCache.autoRenew = d.autoRenew; renderSiteSub(accountUserCache); }
  }catch(err){
    msg.hidden = false; msg.className = 'auth-msg auth-msg-error'; msg.textContent = err.message;
    el.disabled = false;
  }
});
// Пояснение, если вход завершился, пока страница была открыта.
function sessionEndedText(){
  return accountSessionEnded ? 'Вход завершён: сервер обновлялся или в аккаунт вошли на другом устройстве. ' : '';
}
function guestHtml(text){
  return `<p class="site-sub-text">${sessionEndedText()}${text}</p><div class="site-acc-actions">`
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
    <div class="site-acc-block">
      <div class="site-usage-title">Пароль</div>
      <div class="site-acc-delete" id="siteAccPw" hidden>
        <div class="auth-msg" id="siteAccPwMsg" hidden></div>
        <div class="auth-field"><input type="password" id="siteAccPwOld" placeholder="Текущий пароль" autocomplete="current-password" maxlength="200" aria-label="Текущий пароль"></div>
        <div class="auth-field"><input type="password" id="siteAccPwNew" placeholder="Новый пароль, не короче 8 символов" autocomplete="new-password" maxlength="200" aria-label="Новый пароль"></div>
        <button type="button" class="btn-secondary site-sub-btn" data-acc="password-save">Сохранить пароль</button>
      </div>
      <button type="button" class="btn-secondary site-sub-btn site-acc-pw-btn" data-acc="password-open">Сменить пароль</button>
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
  } else if(act === 'password-open'){
    el.hidden = true;
    document.getElementById('siteAccPw').hidden = false;
    document.getElementById('siteAccPwOld').focus();
  } else if(act === 'password-save'){
    // Смена пароля: текущий + новый; входы на других устройствах завершаются.
    const msg = document.getElementById('siteAccPwMsg');
    const oldPw = document.getElementById('siteAccPwOld').value, newPw = document.getElementById('siteAccPwNew').value;
    const show = (t, ok) => { msg.hidden = false; msg.className = 'auth-msg ' + (ok ? 'auth-msg-ok' : 'auth-msg-error'); msg.textContent = t; };
    if(!oldPw || !newPw) return show('Введите текущий и новый пароль.');
    el.disabled = true;
    try{
      const r = await post('password', { current: oldPw, password: newPw });
      const d = await r.json();
      if(!r.ok) throw new Error(d.error || 'Ошибка сервера.');
      document.getElementById('siteAccPwOld').value = '';
      document.getElementById('siteAccPwNew').value = '';
      show('Пароль изменён. На других устройствах выполнен выход.', true);
      if(accountUserCache) loadAccountDevices(accountUserCache);
    }catch(err){ show(err.message); }
    el.disabled = false;
  } else if(act === 'delete-open'){
    el.hidden = true;
    document.getElementById('siteAccDelete').hidden = false;
    document.getElementById('siteAccDelPw').focus();
  } else if(act === 'delete-confirm'){
    const msg = document.getElementById('siteAccDelMsg'), pw = document.getElementById('siteAccDelPw').value;
    const fail = t => { msg.hidden = false; msg.className = 'auth-msg auth-msg-error'; msg.textContent = t; };
    if(!pw) return fail('Введите пароль, чтобы подтвердить удаление.');
    // Сначала сервер проверяет пароль; окно подтверждения - только при верном.
    el.disabled = true;
    try{
      const r = await post('delete', { password: pw, checkOnly: true });
      const d = await r.json();
      if(!r.ok) throw new Error(d.error || 'Ошибка сервера.');
    }catch(err){ fail(err.message); el.disabled = false; return; }
    msg.hidden = true;
    el.disabled = false;
    if(!await siteConfirm({ title: 'Удалить аккаунт?', text: 'Аккаунт, подписка и расчёты будут удалены без возможности восстановления.', ok: 'Удалить', danger: true })) return;
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
  // «Аккаунт» и «Подписка» - один раздел (по указанию пользователя):
  // подписка, лимиты и автопродление, затем данные аккаунта. Первым в окне,
  // выше «Оформления» (по указанию пользователя).
  SITE_SETTINGS_SECTIONS.splice(0, 0, {
    id: 'account', title: 'Аккаунт',
    rows: () => [{
      title: 'Подписка и лимиты',
      hint: 'Расчёт - одно нажатие «Рассчитать». Сначала тратятся расчёты месяца, потом бонус за регистрацию.',
      control: () => '<div class="site-sub" id="siteSubBox"></div>',
      wide: true,
    }, { title: 'Данные аккаунта', hint: '', control: () => '<div class="site-acc" id="siteAccountBox"></div>', wide: true }],
  });
  // «Помощь» (по указанию пользователя) - последним разделом, на всех
  // страницах: почта поддержки (после проверки «Я не робот», см.
  // renderSiteHelp) и, кроме главной и входа, кнопка «Сообщить об ошибке»
  // (js/account/feedback.js). На главной и на входе остаются только
  // «Оформление» и «Помощь» (initAccountPage).
  SITE_SETTINGS_SECTIONS.push({
    id: 'help', title: 'Помощь',
    rows: () => [{
      title: 'Почта поддержки',
      hint: 'Вопросы о расчётах, подписке и аккаунте.',
      control: () => '<div class="site-help-email" id="siteHelpEmail"></div>',
      wide: true,
    }].concat(sitePageMode() !== 'full' ? [] : [{
      title: 'Сообщить об ошибке',
      hint: 'Нашли неверный размер, деталь или чертёж? ГОСТ и тип ящика подставятся сами.',
      control: () => '<button type="button" class="btn-secondary" id="siteHelpBug">Сообщить</button>',
    }]),
  });
}
// Почта поддержки (по указанию пользователя) - только после проверки «Я не
// робот», чтобы адрес не собирали боты: браузер решает задачу сервера
// (js/account/pow.js), с ответом сервер отдаёт адрес
// (POST /api/feedback/contact, backend/src/auth/feedback.js). Адрес
// запоминается до перезагрузки страницы.
let helpEmailPromise = null;
function loadPow(){
  if(typeof powSolve === 'function') return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = '/js/account/pow.js';
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}
const HELP_POW_TEXT = { work: 'Проверяем, что вы не робот...', ok: 'Проверка пройдена, загружаем адрес...', fail: 'Проверка «Я не робот» не удалась.' };
function renderSiteHelp(){
  const el = document.getElementById('siteHelpEmail');
  if(!el) return;
  // Значок - как на странице входа: кольцо заполняется по ходу проверки.
  const showState = state => {
    el.innerHTML = `<div class="auth-pow" data-state="${state}"><svg class="auth-pow-icon" viewBox="0 0 22 22" aria-hidden="true"><circle class="auth-pow-bg" cx="11" cy="11" r="9"/><circle class="auth-pow-fg" cx="11" cy="11" r="9" transform="rotate(-90 11 11)"/><path class="auth-pow-tick" d="M7 11.4l2.8 2.7L15.2 8.3"/></svg><span role="status">${HELP_POW_TEXT[state]}</span></div>`;
  };
  const showProgress = p => {
    const ring = el.querySelector('.auth-pow[data-state="work"] .auth-pow-fg');
    if(ring) ring.style.strokeDashoffset = (56.55 * (1 - p)).toFixed(2);
  };
  if(!helpEmailPromise){
    helpEmailPromise = loadPow()
      .then(() => powSolve(state => { if(document.getElementById('siteHelpEmail') === el) showState(state); }, showProgress))
      .then(captchaToken => fetch('/api/feedback/contact', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ captchaToken }) }))
      .then(r => r.ok ? r.json() : Promise.reject(new Error('contact ' + r.status)))
      .then(d => d.email || '');
    helpEmailPromise.catch(() => { helpEmailPromise = null; }); // при следующем открытии - заново
  }
  showState('work');
  helpEmailPromise.then(email => {
    const box = document.getElementById('siteHelpEmail');
    if(!box) return;
    box.innerHTML = email
      ? `<a class="site-help-mail" href="mailto:${escHtml(email)}">${escHtml(email)}</a>`
      : `<span class="site-sub-text">Почта поддержки скоро появится.${sitePageMode() === 'full' ? ' Пока сообщите о проблеме кнопкой «Сообщить об ошибке».' : ''}</span>`;
  }).catch(() => {
    const box = document.getElementById('siteHelpEmail');
    if(box) box.innerHTML = '<span class="site-sub-text">Не удалось показать адрес. Закройте и откройте «Помощь» ещё раз.</span>';
  });
}
document.addEventListener('click', e => {
  if(!e.target.closest) return;
  if(e.target.closest('#siteHelpBug') && typeof openErrorReport === 'function') openErrorReport();
  // Раздел «Помощь» открыли (кнопкой «Помощь» или слева в «Настройках») -
  // проверка «Я не робот» и адрес поддержки.
  if(e.target.closest('.site-settings-nav-item[data-section="help"]')) renderSiteHelp();
  // На телефоне меню разделов нет - все разделы друг под другом, «Помощь»
  // видна сразу: адрес поддержки загружается при открытии окна «Настройки».
  if(e.target.closest('#siteSettingsBtn')) requestAnimationFrame(() => {
    const help = document.getElementById('siteHelpEmail');
    if(help && help.offsetParent && !help.innerHTML) renderSiteHelp();
  });
});
// Окно открыли - сразу последние известные данные, затем свежие с сервера.
// Адрес с #account или #subscription (раздел «Аккаунт») (например, со старой страницы
// account.html) - окно открывается сразу на этом разделе.
function initSettingsAccount(){
  const btn = document.getElementById('siteSettingsBtn');
  if(!btn) return;
  const render = u => { renderSiteAccount(u); renderSiteSub(u); };
  btn.addEventListener('click', () => {
    if(accountUserCache !== undefined) render(accountUserCache);
    fetchAccountUser().then(render);
  });
  // #subscription - прежний раздел «Подписка», теперь часть «Аккаунта».
  const section = location.hash.replace('#', '').replace(/^subscription$/, 'account');
  if(section === 'account' || section === 'help'){
    openSettingsSection(section);
    history.replaceState(null, '', location.pathname + location.search);
  }
}
// Открыть окно «Настройки» сразу на разделе. На главной разделов аккаунта
// нет (только тема) - переход на страницу выбора ГОСТа с этим разделом.
function openSettingsSection(section){
  if(sitePageMode() === 'landing' && section !== 'help'){ location.href = 'gosts.html#' + section; return; }
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
// Следующая подписка для предложения: пробная -> Base -> Pro -> Team, у Team - нет.
function nextPlanId(plan){ return { free: 'base', base: 'pro', pro: 'team' }[plan] || null; }
function calcWord(n){ return plural(n, 'расчёт', 'расчёта', 'расчётов'); }

// Расчёты закончились (по указанию пользователя: не красной ошибкой и без
// счётчика). После последнего успешного расчёта - тёплая плашка под кнопками
// «Рассчитать» (showQuotaHint); при нажатии без расчётов или без входа -
// окно (showLimitDialog): дата новых расчётов и подписка больше.
const LIMIT_ICONS = {
  clock: '<svg viewBox="0 0 28 28" aria-hidden="true"><circle class="limit-draw" cx="14" cy="14" r="11" style="--len:70"/><path d="M14 8v6l4 2.5"/></svg>',
  user: '<svg viewBox="0 0 28 28" aria-hidden="true"><circle class="limit-draw" cx="14" cy="10" r="5" style="--len:32"/><path class="limit-draw" d="M5 24c1.5-5 5-7 9-7s7.5 2 9 7" style="--len:30"/></svg>',
};
const fmtLimitDate = iso => new Date(iso).toLocaleDateString('ru-RU');
function showQuotaHint(q){
  const err = document.getElementById('err');
  if(!err) return;
  let hint = document.getElementById('quotaHint');
  if(!hint){
    hint = document.createElement('div');
    hint.id = 'quotaHint';
    hint.className = 'quota-banner';
    hint.setAttribute('role', 'status');
    err.insertAdjacentElement('afterend', hint);
  }
  hint.hidden = true;
  if(!q || q.left > 0) return;
  const next = nextPlanId(q.plan);
  loadPlans().then(plans => {
    const np = next && plans[next];
    hint.innerHTML = `${LIMIT_ICONS.clock}<span>${q.monthly
      ? `Вы использовали все расчёты этого месяца. Новые появятся ${fmtLimitDate(q.periodEnd)}.`
      : 'Вы использовали все пробные расчёты.'}${np ? ` Больше расчётов - в <a href="plans.html">${escHtml(np.name)}</a>.` : ''}</span>`;
    hint.hidden = false;
  });
}

// Окно: не вошли (kind 'guest'), закончились месячные ('month') или пробные
// ('trial') - данные приходят с сервера (calc-quota.js, limit).
function showLimitDialog(limit){
  document.querySelectorAll('.limit-dialog').forEach(o => o.remove());
  const page = encodeURIComponent(location.pathname.replace(/^\//, ''));
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay limit-dialog';
  const btn = (cls, text, attrs) => `<${attrs ? 'a' : 'button type="button"'} class="${cls}"${attrs || ''}>${text}</${attrs ? 'a' : 'button'}>`;
  let icon = LIMIT_ICONS.clock, title, text, extra = '', actions;
  if(limit.kind === 'guest'){
    icon = LIMIT_ICONS.user;
    title = 'Войдите, чтобы посчитать';
    text = `Расчёты доступны после входа. При регистрации - ${limit.welcome} ${calcWord(limit.welcome)} бесплатно.`;
    actions = btn('btn-secondary', 'Войти', ` href="login.html?next=${page}"`) + btn('limit-main', 'Зарегистрироваться', ` href="login.html?mode=register&amp;next=${page}"`);
  } else if(limit.kind === 'trial'){
    title = 'Пробные расчёты закончились';
    text = `Вы сделали все ${limit.welcome} бесплатных ${calcWord(limit.welcome)}. Чтобы продолжить, выберите подписку.`;
    extra = '<div class="limit-plans" id="limitPlans"></div>';
    actions = btn('btn-secondary limit-close', 'Позже') + btn('limit-main', 'Выбрать подписку', ' href="plans.html"');
  } else {
    const days = Math.max(1, Math.ceil((new Date(limit.periodEnd) - Date.now()) / 86400000));
    title = 'Расчёты на этот месяц закончились';
    text = `Новые ${limit.monthly.toLocaleString('ru-RU')} ${calcWord(limit.monthly)} начислятся <b>${fmtLimitDate(limit.periodEnd)}</b>, через ${days} ${plural(days, 'день', 'дня', 'дней')}. Введённые размеры останутся на странице.`;
    if(limit.next){
      // Все подписки больше текущей (по указанию пользователя) - карточками.
      extra = '<div class="limit-plans" id="limitPlans"></div>';
      actions = btn('btn-secondary limit-close', 'Понятно') + btn('limit-main', 'Выбрать подписку', ' href="plans.html"');
    } else {
      text += ' Нужно больше уже сейчас - напишите нам, обсудим дополнительные расчёты.';
      actions = btn('btn-secondary limit-close', 'Понятно') + btn('limit-main limit-support', 'Написать в поддержку');
    }
  }
  overlay.innerHTML = `<div class="modal-box limit-box" role="dialog" aria-modal="true" aria-labelledby="limitTitle">
      <div class="limit-icon">${icon}</div>
      <h3 id="limitTitle">${title}</h3>
      <p class="limit-text">${text}</p>
      ${extra}
      <div class="limit-actions">${actions}</div>
    </div>`;
  const close = () => { document.removeEventListener('keydown', onKey, true); overlay.remove(); };
  const onKey = e => { if(e.key === 'Escape'){ e.preventDefault(); close(); } };
  overlay.addEventListener('click', e => {
    if(e.target === overlay || e.target.closest('.limit-close')) return close();
    if(e.target.closest('.limit-support')){ close(); openSettingsSection('help'); }
  });
  document.addEventListener('keydown', onKey, true);
  document.body.appendChild(overlay);
  overlay.querySelector('.limit-main').focus();
  // Карточки подписок: у пробной - все платные (выделена Pro), у
  // закончившейся платной - все подписки больше текущей (выделена следующая).
  if(document.getElementById('limitPlans')) loadPlans().then(plans => {
    const box = document.getElementById('limitPlans');
    if(!box) return;
    const ids = Object.keys(plans);
    const from = limit.kind === 'trial' ? ids.indexOf('free') : ids.indexOf(limit.plan);
    const higher = ids.slice(from + 1);
    const hot = limit.kind === 'trial' ? 'pro' : higher[0];
    box.style.setProperty('--n', higher.length);
    box.innerHTML = higher.map(id => {
      const p = plans[id];
      return `<div class="limit-plan${id === hot ? ' limit-next' : ''}"><b>${escHtml(p.name)}</b>`
        + `<span class="limit-price">${p.price ? p.price.toLocaleString('ru-RU') + ' ₽ в месяц' : ''}</span>`
        + `<span>${p.monthly.toLocaleString('ru-RU')} ${calcWord(p.monthly)} в месяц</span>`
        + `<span>${p.devices} ${plural(p.devices, 'устройство', 'устройства', 'устройств')}</span></div>`;
    }).join('');
  });
}

// Ошибка расчёта от сервера: не вошли или закончились расчёты (limit) -
// окно вместо красной ошибки; иначе ссылка после текста ошибки (#err).
function appendCalcErrorLink(link, limit){
  const hint = document.getElementById('quotaHint');
  if(hint) hint.hidden = true;
  const err = document.getElementById('err');
  if(limit && limit.kind){
    if(err) err.textContent = '';
    if(typeof setCalcStatus === 'function') setCalcStatus(null);
    showLimitDialog(limit);
    return;
  }
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

// Кнопки «Помощь» (на всех страницах) и «Сообщить об ошибке» (кроме главной
// и входа) - js/account/feedback.js.
function loadFeedbackButtons(){
  if(document.getElementById('siteFeedbackJs')) return;
  // Сначала списки в стиле сайта (ui-select.js, нужны форме сообщения об
  // ошибке), потом кнопки - по порядку.
  const add = (id, src) => { const s = document.createElement('script'); s.id = id; s.src = src; s.async = false; document.body.appendChild(s); };
  if(sitePageMode() === 'full' && typeof uiSelect !== 'function') add('siteUiSelectJs', '/js/account/ui-select.js');
  add('siteFeedbackJs', '/js/account/feedback.js');
}
// Вид страницы для общих частей сайта (по классу <body>):
//   'landing' - главная (index.html): в «Настройках» только тема (по указанию
//               пользователя), кнопка аккаунта ведёт к разделу на gosts.html;
//   'auth'    - вход и регистрация (login.html): в «Настройках» только тема,
//               без кнопки аккаунта и нижней строки (ссылки - под формой);
//   'full'    - остальные страницы.
function sitePageMode(){
  const cl = document.body.classList;
  return cl.contains('landing') ? 'landing' : cl.contains('auth-page') ? 'auth' : 'full';
}
function initAccountPage(){
  const mode = sitePageMode();
  if(mode !== 'full'){ // только «Оформление» и «Помощь»
    const keep = SITE_SETTINGS_SECTIONS.filter(s => s.id === 'appearance' || s.id === 'help');
    SITE_SETTINGS_SECTIONS.splice(0, SITE_SETTINGS_SECTIONS.length, ...keep);
  }
  if(mode !== 'auth'){ initAccountButton(); initLegalFooter(); }
  loadFeedbackButtons();
}
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initAccountPage);
else initAccountPage();
