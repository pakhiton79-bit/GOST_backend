// Страница входа (login.html): вход, регистрация, подтверждение почты кодом,
// восстановление пароля - одна форма, поля и надписи меняются по режиму.
// После входа - переход на ?next= (только страницы этого же сайта) или на
// главную.
const AUTH_MODES = {
  login: {
    title: 'Вход в аккаунт', sub: 'Войдите, чтобы продолжить.', submit: 'Войти',
    fields: ['email', 'password'], pwLabel: 'Пароль', pwAuto: 'current-password', forgot: true,
    switchHtml: 'Нет аккаунта? <a data-mode="register">Зарегистрироваться</a>',
  },
  register: {
    title: 'Создайте аккаунт', sub: '', submit: 'Создать аккаунт',
    fields: ['email', 'password', 'password2'], pwLabel: 'Пароль (не короче 8 символов)', pwAuto: 'new-password',
    switchHtml: 'Уже есть аккаунт? <a data-mode="login">Войти</a>',
  },
  verify: {
    title: 'Подтвердите почту', sub: '', submit: 'Подтвердить', fields: ['code'],
    linksHtml: '<a data-resend="register">Отправить код ещё раз</a>',
    switchHtml: '<a data-mode="login">Назад ко входу</a>',
  },
  forgot: {
    title: 'Восстановление пароля', sub: 'Пришлём на почту код, чтобы задать новый пароль.', submit: 'Получить код',
    fields: ['email'],
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
    linksHtml: '<a data-resend="reset">Отправить код ещё раз</a>',
    switchHtml: '<a data-mode="login">Назад ко входу</a>',
  },
};

const EYE_OPEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_CLOSED = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18M10.6 5.1A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17.6 17.6 0 0 1-3.2 4.2M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a10 10 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';

const $ = id => document.getElementById(id);
let authMode = 'login';
let authEmail = '';
let deviceTicket = '';

function nextUrl(){
  const n = new URLSearchParams(location.search).get('next') || '';
  return /^[a-z0-9-]+\.html(\?[^#]*)?$/i.test(n) ? n : 'index.html';
}

function showMsg(text, ok){
  const m = $('authMsg');
  m.hidden = !text;
  m.textContent = text || '';
  m.className = 'auth-msg ' + (ok ? 'auth-msg-ok' : 'auth-msg-error');
}

// Пароль скрыт / показан - значок «глаз» в поле.
function setEye(btn, shown){
  $(btn.dataset.eye).type = shown ? 'text' : 'password';
  btn.innerHTML = shown ? EYE_CLOSED : EYE_OPEN;
  btn.setAttribute('aria-label', shown ? 'Скрыть пароль' : 'Показать пароль');
}

function setMode(mode, msg, ok){
  authMode = mode;
  const m = AUTH_MODES[mode];
  $('authTitle').textContent = m.title;
  $('authSub').textContent = m.sub;
  document.title = m.title + ' - Тара+';
  $('authSubmit').textContent = m.submit;
  document.querySelectorAll('.auth-field').forEach(f => { f.hidden = !m.fields.includes(f.dataset.field); });
  if(m.pwLabel){ $('authPasswordLabel').textContent = m.pwLabel; $('authPassword').autocomplete = m.pwAuto; }
  $('authForgot').hidden = !m.forgot;
  $('authCode').value = ''; $('authPassword').value = ''; $('authPassword2').value = '';
  document.querySelectorAll('.auth-eye').forEach(b => setEye(b, false));
  const text = $('authText');
  text.hidden = !(mode === 'verify' || mode === 'reset');
  if(mode === 'verify') text.innerHTML = 'Мы отправили 6-значный код на <b></b>. Введите его, чтобы подтвердить почту. Код действует 15 минут.';
  if(mode === 'reset') text.innerHTML = 'Если аккаунт с почтой <b></b> есть, на неё отправлен 6-значный код. Введите его и новый пароль.';
  if(!text.hidden) text.querySelector('b').textContent = authEmail;
  $('authSubmit').hidden = !m.submit;
  $('authDevices').hidden = mode !== 'devices';
  $('authLinks').innerHTML = m.linksHtml || '';
  $('authSwitch').innerHTML = m.switchHtml || '';
  showMsg(msg, ok);
  const first = m.fields.find(f => f !== 'email' || !$('authEmail').value) || m.fields[0];
  const input = { email: 'authEmail', code: 'authCode', password: 'authPassword', password2: 'authPassword2' }[first];
  if(input) $(input).focus();
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
  if(!d.needDevice){ location.href = nextUrl(); return; }
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
  if(m.fields.includes('password2') && pw !== pw2){ showMsg('Пароли не совпадают.'); return; }
  btn.disabled = true;
  try{
    if(authMode === 'login'){
      const d = await api('login', { email, password: pw });
      authEmail = email;
      if(d.needVerify) return setMode('verify', d.notice || 'Почта ещё не подтверждена: мы отправили код.', !d.notice);
      afterLogin(d);
    } else if(authMode === 'register'){
      const d = await api('register', { email, password: pw });
      authEmail = email;
      setMode('verify', d.notice, false);
    } else if(authMode === 'verify'){
      afterLogin(await api('verify', { email: authEmail, code }));
    } else if(authMode === 'forgot'){
      await api('forgot', { email });
      authEmail = email;
      setMode('reset');
    } else if(authMode === 'reset'){
      await api('reset', { email: authEmail, code, password: pw });
      location.href = nextUrl();
    }
  }catch(err){
    showMsg(err.message);
  }finally{
    btn.disabled = false;
  }
}

$('authForm').addEventListener('submit', onSubmit);
// Ссылки режимов и «Отправить код ещё раз» - в нескольких местах формы.
document.querySelector('.auth-box').addEventListener('click', async e => {
  const eye = e.target.closest('.auth-eye');
  if(eye) return setEye(eye, $(eye.dataset.eye).type === 'password');
  const a = e.target.closest('a[data-mode], a[data-resend]');
  if(!a) return;
  if(a.dataset.mode) return setMode(a.dataset.mode);
  try{
    await api('resend', { email: authEmail, purpose: a.dataset.resend });
    showMsg('Новый код отправлен.', true);
  }catch(err){ showMsg(err.message); }
});

// Уже вошли - сразу дальше.
fetchAccountUser().then(user => { if(user) location.replace(nextUrl()); });
setMode(new URLSearchParams(location.search).get('mode') === 'register' ? 'register' : 'login');
