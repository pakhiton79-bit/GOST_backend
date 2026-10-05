// Страница входа (login.html): вход, регистрация, подтверждение почты кодом,
// восстановление пароля - одна форма, поля и кнопки меняются по режиму.
// После входа - переход на ?next= (только страницы этого же сайта) или на
// главную.
const AUTH_MODES = {
  login:    { title: 'Вход', submit: 'Войти', fields: ['email', 'password'], pwLabel: 'Пароль', pwAuto: 'current-password' },
  register: { title: 'Регистрация', submit: 'Зарегистрироваться', fields: ['email', 'password', 'password2'], pwLabel: 'Пароль (не короче 8 символов)', pwAuto: 'new-password' },
  verify:   { title: 'Подтверждение почты', submit: 'Подтвердить', fields: ['code'] },
  forgot:   { title: 'Восстановление пароля', submit: 'Получить код', fields: ['email'] },
  reset:    { title: 'Новый пароль', submit: 'Сохранить пароль', fields: ['code', 'password', 'password2'], pwLabel: 'Новый пароль (не короче 8 символов)', pwAuto: 'new-password' },
};

const $ = id => document.getElementById(id);
let authMode = 'login';
let authEmail = '';

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

function link(text, mode){ return `<a data-mode="${mode}">${text}</a>`; }

function setMode(mode, msg, ok){
  authMode = mode;
  const m = AUTH_MODES[mode];
  $('authTitle').textContent = m.title;
  document.title = m.title + ' - Тара+';
  $('authSubmit').textContent = m.submit;
  document.querySelectorAll('.auth-field').forEach(f => { f.hidden = !m.fields.includes(f.dataset.field); });
  if(m.pwLabel){ $('authPasswordLabel').textContent = m.pwLabel; $('authPassword').autocomplete = m.pwAuto; }
  $('authCode').value = ''; $('authPassword').value = ''; $('authPassword2').value = '';
  const text = $('authText');
  text.hidden = !(mode === 'verify' || mode === 'reset');
  if(mode === 'verify') text.innerHTML = `Мы отправили 6-значный код на <b></b>. Введите его, чтобы подтвердить почту. Код действует 15 минут.`;
  if(mode === 'reset') text.innerHTML = `Если аккаунт с почтой <b></b> есть, на неё отправлен 6-значный код. Введите его и новый пароль.`;
  if(!text.hidden) text.querySelector('b').textContent = authEmail;
  const links = {
    login: link('Регистрация', 'register') + link('Забыли пароль?', 'forgot'),
    register: link('Уже есть аккаунт? Войти', 'login'),
    verify: `<a data-resend="register">Отправить код ещё раз</a>` + link('Назад ко входу', 'login'),
    forgot: link('Назад ко входу', 'login'),
    reset: `<a data-resend="reset">Отправить код ещё раз</a>` + link('Назад ко входу', 'login'),
  };
  $('authLinks').innerHTML = links[mode];
  showMsg(msg, ok);
  const first = m.fields.find(f => f !== 'email' || !authEmail) || m.fields[0];
  const input = { email: 'authEmail', code: 'authCode', password: 'authPassword', password2: 'authPassword2' }[first];
  $(input).focus();
}

async function api(path, body){
  const r = await fetch('/api/auth/' + path, {
    method: 'POST', credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body || {}),
  });
  let data = {};
  try{ data = await r.json(); }catch(e){}
  if(!r.ok) throw new Error(data.error || 'Ошибка сервера. Попробуйте ещё раз.');
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
      location.href = nextUrl();
    } else if(authMode === 'register'){
      const d = await api('register', { email, password: pw });
      authEmail = email;
      setMode('verify', d.notice, false);
    } else if(authMode === 'verify'){
      await api('verify', { email: authEmail, code });
      location.href = nextUrl();
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
$('authLinks').addEventListener('click', async e => {
  const a = e.target.closest('a');
  if(!a) return;
  if(a.dataset.mode) return setMode(a.dataset.mode);
  if(a.dataset.resend){
    try{
      await api('resend', { email: authEmail, purpose: a.dataset.resend });
      showMsg('Новый код отправлен.', true);
    }catch(err){ showMsg(err.message); }
  }
});

// Уже вошли - сразу дальше.
fetchAccountUser().then(user => { if(user) location.replace(nextUrl()); });
setMode(new URLSearchParams(location.search).get('mode') === 'register' ? 'register' : 'login');
