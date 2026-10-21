// Страница входа (login.html): вход (пароль, затем код из письма - по
// указанию пользователя), регистрация, подтверждение почты кодом,
// восстановление пароля - одна форма, поля и надписи меняются по режиму.
// После входа - переход на ?next= (только страницы этого же сайта) или на
// главную.
// Кнопка «Отправить код ещё раз» с кольцом обратного отсчёта (startResendTimer).
function resendHtml(purpose){
  return `<button type="button" class="auth-resend" data-resend="${purpose}"><svg viewBox="0 0 20 20" aria-hidden="true"><circle class="ring-bg" cx="10" cy="10" r="8"/><circle class="ring-fg" cx="10" cy="10" r="8" transform="rotate(-90 10 10)"/></svg><span class="auth-resend-text">Отправить код ещё раз</span></button>`;
}
const AUTH_MODES = {
  login: {
    title: 'Вход в аккаунт', sub: 'Войдите, чтобы продолжить.', submit: 'Войти',
    fields: ['email', 'password'], pwLabel: 'Пароль', pwAuto: 'current-password', forgot: true,
    switchHtml: 'Нет аккаунта? <a data-mode="register">Зарегистрироваться</a>',
  },
  register: {
    title: 'Создайте аккаунт', sub: '', submit: 'Создать аккаунт',
    fields: ['email', 'password', 'password2', 'consents', 'captcha'], pwLabel: 'Пароль (не короче 8 символов)', pwAuto: 'new-password',
    switchHtml: 'Уже есть аккаунт? <a data-mode="login">Войти</a>',
  },
  // Код из письма после верного пароля (вход завершает /login-verify).
  loginCode: {
    title: 'Код для входа', sub: '', submit: 'Войти', fields: ['code'],
    linksHtml: resendHtml('login'),
    switchHtml: '<a data-mode="login">Назад ко входу</a>',
  },
  verify: {
    title: 'Подтвердите почту', sub: '', submit: 'Подтвердить', fields: ['code'],
    linksHtml: resendHtml('register'),
    switchHtml: '<a data-mode="login">Назад ко входу</a>',
  },
  forgot: {
    title: 'Восстановление пароля', sub: 'Пришлём на почту код, чтобы задать новый пароль.', submit: 'Получить код',
    fields: ['email', 'captcha'],
    switchHtml: 'Вспомнили пароль? <a data-mode="login">Войти</a>',
  },
  // Вход сверх лимита устройств подписки: список устройств, где выйти.
  devices: {
    title: 'Выберите, где выйти', sub: '', submit: '', fields: [],
    switchHtml: '<a data-mode="login">Назад ко входу</a>',
  },
  reset: {
    title: 'Новый пароль', sub: '', submit: 'Сохранить пароль',
    fields: ['code', 'password', 'password2'], pwLabel: 'Новый пароль (не короче 8 символов)', pwAuto: 'new-password',
    linksHtml: resendHtml('reset'),
    switchHtml: '<a data-mode="login">Назад ко входу</a>',
  },
};

const EYE_OPEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_CLOSED = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18M10.6 5.1A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a10 10 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';

const $ = id => document.getElementById(id);
// Микроанимации (по указанию пользователя; стили - конец account.css): при
// «уменьшить движение» в системе - без них.
const motionOK = () => !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
const CODE_MODES = ['verify', 'loginCode', 'reset'];
// Перезапуск CSS-анимации класса cls у элемента.
function replayClass(el, cls){
  if(!el) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}
let authMode = 'login';
let authEmail = '';
let deviceTicket = '';
let loginTicket = ''; // пропуск после верного пароля (для кода входа)

// Капча «Я не робот» на регистрации и восстановлении пароля (js/account/pow.js):
// задача решается сразу, как только форма показана; ответ одноразовый -
// после каждой отправки формы решается новая.
let powPromise = null;
const POW_TEXT = { work: 'Проверяем, что вы не робот...', ok: 'Проверка «Я не робот» пройдена', fail: 'Проверка «Я не робот» не удалась. Попробуйте ещё раз.' };
function setPowState(state){
  $('authPow').dataset.state = state;
  $('authPowText').textContent = POW_TEXT[state];
  if(state === 'ok') setPowProgress(1);
}
// Кольцо у надписи: доля перебранных чисел (pow.js).
function setPowProgress(p){
  $('authPowRing').style.strokeDashoffset = (56.55 * (1 - p)).toFixed(2);
}
function startPow(){
  powPromise = powSolve(setPowState, setPowProgress);
  powPromise.catch(() => {});
}

function nextUrl(){
  const n = new URLSearchParams(location.search).get('next') || '';
  return /^[a-z0-9-]+\.html(\?[^#]*)?$/i.test(n) ? n : 'gosts.html'; // по умолчанию - к выбору ГОСТ
}

// Сообщение над формой; linkMode - ссылка после текста (например,
// «Зарегистрироваться», когда аккаунта с такой почтой нет).
function showMsg(text, ok, linkMode, linkText){
  const m = $('authMsg');
  m.hidden = !text;
  // Адрес почты в тексте (например, почта поддержки в сообщении о
  // блокировке) - ссылкой mailto.
  m.replaceChildren(...String(text || '').split(/([^\s@]+@[^\s@]+\.[a-z]{2,})/i).map((part, i) => {
    if(i % 2 === 0) return document.createTextNode(part);
    const a = document.createElement('a');
    a.href = 'mailto:' + part;
    a.textContent = part;
    return a;
  }));
  m.className = 'auth-msg ' + (ok ? 'auth-msg-ok' : 'auth-msg-error');
  if(text && motionOK()) replayClass(m, 'auth-msg-in');
  if(text && linkMode){
    const a = document.createElement('a');
    a.dataset.mode = linkMode;
    a.className = 'auth-msg-link';
    a.textContent = linkText;
    m.append(' ', a);
  }
}

// Пароль скрыт / показан - значок «глаз» в поле.
function setEye(btn, shown){
  $(btn.dataset.eye).type = shown ? 'text' : 'password';
  btn.innerHTML = shown ? EYE_CLOSED : EYE_OPEN;
  btn.setAttribute('aria-label', shown ? 'Скрыть пароль' : 'Показать пароль');
}

// Вход <-> регистрация: поля раскрываются и сворачиваются по высоте.
function showFields(fields, animate){
  document.querySelectorAll('.auth-field').forEach(f => {
    if(f.motionAnim){ f.motionAnim.cancel(); f.motionAnim = null; }
    const want = fields.includes(f.dataset.field);
    if(want === !f.hidden) return;
    if(!animate || !motionOK() || !f.animate){ f.hidden = !want; return; }
    if(want) f.hidden = false;
    const cs = getComputedStyle(f);
    const open = { height: f.offsetHeight + 'px', opacity: 1, marginTop: cs.marginTop, marginBottom: cs.marginBottom };
    const shut = { height: '0px', opacity: 0, marginTop: '0px', marginBottom: '0px' };
    f.style.overflow = 'hidden';
    const a = f.motionAnim = f.animate(want ? [shut, open] : [open, shut], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
    a.oncancel = () => { f.style.overflow = ''; };
    a.onfinish = () => { f.style.overflow = ''; f.motionAnim = null; if(!want) f.hidden = true; };
  });
}
// Новый экран формы выезжает справа (назад ко входу - слева).
function slideScreen(back){
  const el = $('authScreen');
  if(!motionOK() || !el.animate) return;
  el.animate([{ opacity: 0, transform: `translateX(${back ? -28 : 28}px)` }, { opacity: 1, transform: 'none' }],
    { duration: 360, easing: 'cubic-bezier(.2,.8,.2,1)' });
}
let modeShown = false;
function setMode(mode, msg, ok){
  const prev = authMode, first = !modeShown;
  modeShown = true;
  authMode = mode;
  const m = AUTH_MODES[mode];
  const pair = ['login', 'register'];
  const swap = !first && prev !== mode && pair.includes(prev) && pair.includes(mode);
  $('authTitle').textContent = m.title;
  $('authSub').textContent = m.sub;
  document.title = m.title + ' - Тара+';
  $('authSubmit').textContent = m.submit;
  showFields(m.fields, swap);
  const tabs = $('authTabs');
  tabs.hidden = !pair.includes(mode);
  tabs.dataset.mode = mode;
  tabs.querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.mode === mode)));
  document.querySelectorAll('.auth-bad').forEach(el => el.classList.remove('auth-bad'));
  if(m.fields.includes('captcha') && !powPromise) startPow();
  if(m.pwLabel){ $('authPasswordLabel').textContent = m.pwLabel; $('authPassword').autocomplete = m.pwAuto; }
  $('authForgot').hidden = !m.forgot;
  $('authCode').value = ''; $('authPassword').value = ''; $('authPassword2').value = '';
  codePrev = '';
  $('authCells').className = 'auth-cells';
  renderCells();
  ['consentTerms', 'consentPd', 'consentMarketing'].forEach(id => { $(id).checked = false; });
  document.querySelectorAll('.auth-eye').forEach(b => setEye(b, false));
  const text = $('authText');
  text.hidden = !(mode === 'verify' || mode === 'reset' || mode === 'loginCode');
  if(mode === 'verify') text.innerHTML = 'Мы отправили 6-значный код на <b></b>. Введите его, чтобы подтвердить почту. Код действует 15 минут.';
  if(mode === 'loginCode') text.innerHTML = 'Мы отправили 6-значный код для входа на <b></b>. Код действует 15 минут.';
  if(mode === 'reset') text.innerHTML = 'Если аккаунт с почтой <b></b> есть, на неё отправлен 6-значный код. Введите его и новый пароль.';
  if(!text.hidden) text.querySelector('b').textContent = authEmail;
  $('authSubmit').hidden = !m.submit;
  $('authDevices').hidden = mode !== 'devices';
  $('authLinks').innerHTML = m.linksHtml || '';
  $('authSwitch').innerHTML = m.switchHtml || '';
  showMsg(msg, ok);
  // Код только что отправлен - повторно через минуту (или через сколько
  // сказал сервер); код не отправлен по другой причине - сразу.
  clearInterval(resendTimer);
  if(CODE_MODES.includes(mode)){
    const wait = String(msg || '').match(/через (\d+) с/);
    startResendTimer(wait ? Number(wait[1]) : msg && !ok ? 0 : RESEND_S);
  }
  if(!first && prev !== mode && !swap) slideScreen(pair.includes(mode));
  const firstField = m.fields.find(f => f !== 'email' || !$('authEmail').value) || m.fields[0];
  // Галочки согласий в фокус не ставятся: у галочки в фокусе коричневая
  // обводка (по замечанию пользователя - галочки без обводки).
  const input = { email: 'authEmail', code: 'authCode', password: 'authPassword', password2: 'authPassword2' }[firstField];
  if(input) $(input).focus();
}

// ===== Поле кода: 6 клеток =====
// Клетки - только вид; ввод - в прозрачном поле #authCode поверх них. Новая
// цифра «впрыгивает», вставленный код встаёт лесенкой; в текущей клетке -
// мигающий курсор.
let codePrev = '';
function renderCells(){
  const input = $('authCode'), v = input.value;
  const focused = document.activeElement === input;
  const added = v.length - codePrev.length;
  [...$('authCells').children].forEach((c, i) => {
    const d = v[i] || '';
    if(c.textContent !== d){
      c.textContent = d;
      if(d && added > 0 && motionOK()){
        c.style.animationDelay = added > 1 ? (i - codePrev.length) * 40 + 'ms' : '';
        replayClass(c, 'pop');
      }
    }
    c.classList.toggle('cur', focused && i === v.length);
  });
  codePrev = v;
}
function onCodeInput(){
  const input = $('authCode');
  const v = input.value.replace(/\D/g, '').slice(0, 6);
  if(v !== input.value) input.value = v;
  $('authCells').classList.remove('bad');
  renderCells();
  // Код из одного поля (вход, подтверждение почты) - отправка сама, как
  // только введены все 6 цифр.
  if(v.length === 6 && (authMode === 'verify' || authMode === 'loginCode') && !$('authSubmit').disabled){
    $('authForm').requestSubmit ? $('authForm').requestSubmit() : $('authSubmit').click();
  }
}
// Курсор всегда в конце: цифры вводятся по порядку.
function codeCaretToEnd(){
  const input = $('authCode'), n = input.value.length;
  if(input.selectionStart !== n || input.selectionEnd !== n) input.setSelectionRange(n, n);
}
// Неверный код: клетки краснеют и трясутся, затем очищаются справа налево.
function codeWrong(){
  const cells = $('authCells'), input = $('authCode');
  cells.classList.add('bad');
  if(!motionOK()){ input.value = ''; codePrev = ''; renderCells(); input.focus(); return; }
  replayClass(cells, 'auth-shake');
  setTimeout(() => {
    const step = setInterval(() => {
      input.value = input.value.slice(0, -1);
      codePrev = input.value;
      renderCells();
      if(!input.value){ clearInterval(step); cells.classList.remove('bad'); input.focus(); renderCells(); }
    }, 60);
  }, 600);
}

// ===== «Отправить код ещё раз»: кольцо обратного отсчёта =====
// Сервер даёт новый код не чаще раза в минуту (CODE_RESEND_MS в routes.js).
// Кольцо убывает по часовой стрелке, остаток - до отметки «12 часов».
const RESEND_S = 60, RING_L = 50.27;
let resendTimer = null, resendLeft = 0;
function startResendTimer(sec){
  clearInterval(resendTimer);
  const btn = document.querySelector('.auth-resend');
  if(!btn) return;
  resendLeft = Math.max(0, Math.round(sec));
  const total = Math.max(RESEND_S, resendLeft);
  const fg = btn.querySelector('.ring-fg');
  if(fg.getAnimations) fg.getAnimations().forEach(a => a.cancel());
  if(resendLeft > 0){
    const from = -RING_L * (1 - resendLeft / total);
    fg.style.strokeDashoffset = String(from);
    if(fg.animate) fg.animate([{ strokeDashoffset: String(from) }, { strokeDashoffset: String(-RING_L) }],
      { duration: resendLeft * 1000, easing: 'linear', fill: 'forwards' });
  }
  tickResend(btn);
  if(resendLeft > 0) resendTimer = setInterval(() => {
    resendLeft--;
    tickResend(btn);
    if(resendLeft <= 0){ clearInterval(resendTimer); if(motionOK()) replayClass(btn, 'flash'); }
  }, 1000);
}
function tickResend(btn){
  btn.disabled = resendLeft > 0;
  btn.querySelector('.auth-resend-text').textContent = resendLeft > 0
    ? `Отправить код ещё раз через ${Math.floor(resendLeft / 60)}:${String(resendLeft % 60).padStart(2, '0')}`
    : 'Отправить код ещё раз';
}

// Уведомление сверху («Новый код отправлен»), уезжает через 2,5 с.
let toastTimer = null;
function showToast(text){
  const t = $('authToast');
  t.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10.5l4 4 8-9"/></svg><span></span>';
  t.querySelector('span').textContent = text;
  t.classList.remove('out');
  t.hidden = false;
  t.style.animation = 'none';
  void t.offsetWidth;
  t.style.animation = '';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.classList.add('out');
    toastTimer = setTimeout(() => { t.hidden = true; t.classList.remove('out'); }, 320);
  }, 2500);
}

// Поле, из-за которого форма не прошла: красная рамка (до ввода) и «качание».
function flagField(el){
  if(!el) return;
  el.classList.add('auth-bad');
  if(motionOK()) replayClass(el.closest('.auth-pw') || el, 'auth-shake');
}

function fmtDateTime(iso){
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU') + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}
function devicesWord(n){
  return n === 1 ? '1 устройстве' : n + ' устройствах';
}

// Ответ входа: вошли - дальше; устройств уже сколько можно - выбор, где выйти.
function afterLogin(d){
  if(!d.needDevice){
    // Верный код: клетки зеленеют волной, «Готово, входим…», затем переход.
    if((authMode === 'verify' || authMode === 'loginCode') && motionOK()){
      [...$('authCells').children].forEach((c, i) => { c.classList.remove('pop'); c.style.animationDelay = i * 60 + 'ms'; });
      $('authCells').classList.add('good');
      showMsg('Готово, входим…', true);
      setTimeout(() => { location.href = nextUrl(); }, 700);
      return;
    }
    location.href = nextUrl();
    return;
  }
  deviceTicket = d.ticket;
  setMode('devices');
  $('authText').hidden = false;
  $('authText').textContent = `По подписке ${d.planName} в аккаунт можно войти на ${devicesWord(d.limit)}. Выберите, на каком выйти, чтобы войти здесь.`;
  renderDevices(d.devices);
}
function renderDevices(list){
  const box = $('authDevices');
  box.innerHTML = '';
  (list || []).forEach(dev => {
    const row = document.createElement('div');
    row.className = 'auth-device';
    row.innerHTML = '<div><div class="auth-device-name"></div><div class="auth-device-seen"></div></div><button type="button" class="btn-secondary">Выйти здесь</button>';
    row.querySelector('.auth-device-name').textContent = dev.label;
    row.querySelector('.auth-device-seen').textContent = 'Последний раз: ' + fmtDateTime(dev.lastSeen);
    row.querySelector('button').addEventListener('click', async e => {
      e.target.disabled = true;
      try{
        afterLogin(await api('device-replace', { ticket: deviceTicket, id: dev.id }));
      }catch(err){
        showMsg(err.message);
        if(err.devices) renderDevices(err.devices);
        e.target.disabled = false;
      }
    });
    box.appendChild(row);
  });
}

async function api(path, body){
  const r = await fetch('/api/auth/' + path, {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  let data = {};
  try{ data = await r.json(); }catch(e){}
  if(!r.ok){
    const err = new Error(data.error || 'Ошибка сервера. Попробуйте ещё раз.');
    err.devices = data.devices;
    err.noAccount = !!data.noAccount;
    err.exists = !!data.exists;
    throw err;
  }
  return data;
}

async function onSubmit(e){
  e.preventDefault();
  const btn = $('authSubmit');
  if(btn.disabled) return;
  const email = $('authEmail').value.trim();
  const code = $('authCode').value.trim();
  const pw = $('authPassword').value, pw2 = $('authPassword2').value;
  const m = AUTH_MODES[authMode];
  if(m.fields.includes('password2') && pw !== pw2){ showMsg('Пароли не совпадают.'); flagField($('authPassword2')); return; }
  if(m.fields.includes('consents') && !($('consentTerms').checked && $('consentPd').checked)){
    showMsg('Чтобы зарегистрироваться, примите Пользовательское соглашение и дайте согласие на обработку персональных данных.');
    if(motionOK()) replayClass(document.querySelector('.auth-consents'), 'auth-shake');
    return;
  }
  const withCaptcha = m.fields.includes('captcha');
  btn.disabled = true;
  let captchaToken = '';
  if(withCaptcha){
    try{ captchaToken = await powPromise; }
    catch(err){ showMsg(POW_TEXT.fail); btn.disabled = false; startPow(); return; } // новая задача - для следующей попытки
  }
  const bot = { trap: $('authTrap').value, captchaToken };
  try{
    if(authMode === 'login'){
      const d = await api('login', { email, password: pw });
      authEmail = email;
      if(d.needVerify) return setMode('verify', d.notice || 'Почта ещё не подтверждена: мы отправили код.', !d.notice);
      if(d.needLoginCode){ loginTicket = d.ticket; return setMode('loginCode', d.notice, false); }
      afterLogin(d);
    } else if(authMode === 'register'){
      const d = await api('register', { email, password: pw, ...bot, consents: {
        terms: $('consentTerms').checked, pd: $('consentPd').checked, marketing: $('consentMarketing').checked,
      } });
      authEmail = email;
      setMode('verify', d.notice, false);
    } else if(authMode === 'loginCode'){
      afterLogin(await api('login-verify', { ticket: loginTicket, code }));
    } else if(authMode === 'verify'){
      afterLogin(await api('verify', { email: authEmail, code }));
    } else if(authMode === 'forgot'){
      await api('forgot', { email, ...bot });
      authEmail = email;
      setMode('reset');
    } else if(authMode === 'reset'){
      await api('reset', { email: authEmail, code, password: pw });
      location.href = nextUrl();
    }
  }catch(err){
    if(err.noAccount) showMsg(err.message, false, 'register', 'Зарегистрироваться');
    else if(err.exists) showMsg(err.message, false, 'login', 'Войти');
    else showMsg(err.message);
    // Что подсветить: код, пароль или почту - по тексту ошибки.
    if(m.fields.includes('code') && /код/i.test(err.message)) codeWrong();
    else if(/парол/i.test(err.message)) flagField($('authPassword'));
    else if(/почт/i.test(err.message) && m.fields.includes('email')) flagField($('authEmail'));
  }finally{
    btn.disabled = false;
    if(withCaptcha){
      powPromise = null;
      if(AUTH_MODES[authMode].fields.includes('captcha')) startPow();
    }
  }
}

$('authForm').addEventListener('submit', onSubmit);
// Ссылки режимов и «Отправить код ещё раз» - в нескольких местах формы
// (в том числе в сообщении над формой).
document.querySelector('.auth-box').addEventListener('click', async e => {
  const eye = e.target.closest('.auth-eye');
  if(eye) return setEye(eye, $(eye.dataset.eye).type === 'password');
  const a = e.target.closest('[data-mode], [data-resend]');
  if(!a || a.disabled) return;
  if(a.dataset.mode){ if(a.dataset.mode !== authMode) setMode(a.dataset.mode); return; }
  a.disabled = true;
  try{
    await api('resend', { email: authEmail, purpose: a.dataset.resend, ticket: loginTicket });
    showMsg('');
    showToast('Новый код отправлен на ' + authEmail);
    startResendTimer(RESEND_S);
  }catch(err){
    showMsg(err.message);
    const wait = err.message.match(/через (\d+) с/);
    startResendTimer(wait ? Number(wait[1]) : 0);
  }
});
const codeInput = $('authCode');
codeInput.addEventListener('input', onCodeInput);
['focus', 'blur'].forEach(ev => codeInput.addEventListener(ev, renderCells));
['click', 'keyup', 'select'].forEach(ev => codeInput.addEventListener(ev, codeCaretToEnd));
// Ввод в поле с ошибкой - красная рамка снимается.
$('authForm').addEventListener('input', e => { if(e.target.classList) e.target.classList.remove('auth-bad'); });

// Уже вошли - сразу дальше.
fetchAccountUser().then(user => { if(user) location.replace(nextUrl()); });
setMode(new URLSearchParams(location.search).get('mode') === 'register' ? 'register' : 'login');
