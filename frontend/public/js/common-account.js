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
    ? `<p class="site-sub-text">Включено. ${until ? until + ' ' : ''}подписка ${escHtml(q.planName)} продлится на тот же срок, сумма ${sum}.</p>
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
  const showState = state => {
    el.innerHTML = `<div class="auth-pow" data-state="${state}"><span class="auth-pow-icon" aria-hidden="true"></span><span role="status">${HELP_POW_TEXT[state]}</span></div>`;
  };
  if(!helpEmailPromise){
    helpEmailPromise = loadPow()
      .then(() => powSolve(state => { if(document.getElementById('siteHelpEmail') === el) showState(state); }))
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
});
// Окно открыли - сразу последние известные данные, затем свежие с сервера.
// Адрес с #account или #subscription (например, со старой страницы
// account.html) - окно открывается сразу на этом разделе.
function initSettingsAccount(){
  const btn = document.getElementById('siteSettingsBtn');
  if(!btn) return;
  const render = u => { renderSiteAccount(u); renderSiteSub(u); };
  btn.addEventListener('click', () => {
    if(accountUserCache !== undefined) render(accountUserCache);
    fetchAccountUser().then(render);
  });
  const section = location.hash.replace('#', '');
  if(section === 'account' || section === 'subscription' || section === 'help'){
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
    hint.textContent = q.left === 0 ? (q.monthly ? `Расчёты закончились до ${reset}.` : 'Пробные расчёты закончились.') : `Осталось ${q.left} ${calcWord(q.left)}.`;
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
