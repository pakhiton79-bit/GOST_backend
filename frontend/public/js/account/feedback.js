// Кнопки «Сообщить об ошибке» и «Помощь» в верхней панели (по указанию
// пользователя). Подключается из common-account.js на всех страницах, кроме
// главной и входа (там в панели только тема).
//   «Сообщить об ошибке» - окно: ГОСТ и тип ящика (по умолчанию - по
//     странице), описание, по желанию - введённые размеры и масса;
//     POST /api/feedback/error (backend/src/auth/feedback.js).
//   «Помощь» - окно «Настройки» на разделе «Помощь» (почта поддержки, см.
//     common-account.js).
const FB_ICONS = {
  bug: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 9v4M12 16.5v.01"/><path d="M10.3 3.9 2.6 17.2a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>',
  help: '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.4v.3M12 16.5v.01"/></svg>',
};
const FB_GOSTS = { 'ГОСТ 10198-91': ['I-1', 'I-2', 'I-3', 'I-4', 'II-1', 'II-2', 'III-1'] };
const FB_NO_GOST = 'Не относится к ГОСТ / не знаю';
const FB_NO_TYPE = 'Не относится к типу ящика';
// Страница - ГОСТ и тип по умолчанию.
const FB_PAGES = {
  'i1.html': 'I-1', 'i2.html': 'I-2', 'i3-skid.html': 'I-3', 'i4.html': 'I-4',
  'ii1.html': 'II-1', 'ii2.html': 'II-2', 'iii1.html': 'III-1',
};
function fbPage(){ return location.pathname.replace(/^\//, '') || 'index.html'; }
function fbDefaults(){
  const page = fbPage();
  if(FB_PAGES[page]) return { gost: 'ГОСТ 10198-91', type: FB_PAGES[page] };
  if(page === 'gost-10198-91.html') return { gost: 'ГОСТ 10198-91', type: FB_NO_TYPE };
  return { gost: FB_NO_GOST, type: FB_NO_TYPE };
}
// Введённые размеры и масса (только на странице расчёта).
function fbInputs(){
  const out = {};
  ['L', 'W', 'H', 'M'].forEach(k => { const el = document.getElementById(k); const n = el ? parseFloat(el.value) : NaN; if(n > 0) out[k] = n; });
  return Object.keys(out).length ? out : null;
}
// Списки ГОСТа и типа - uiSelect (js/account/ui-select.js), как везде на сайте.
function fbTypeSelect(gost, value){
  const opts = [...(FB_GOSTS[gost] || []).map(t => ({ id: t, name: `Тип ${t}` })), { id: FB_NO_TYPE, name: FB_NO_TYPE }];
  return uiSelect(opts, value, 'Тип ящика');
}

function fbFormHtml(user){
  const d = fbDefaults(), inputs = fbInputs();
  const gosts = [...Object.keys(FB_GOSTS), FB_NO_GOST];
  const inputsText = inputs ? `${inputs.L || '-'} × ${inputs.W || '-'} × ${inputs.H || '-'} мм, ${inputs.M || '-'} кг` : '';
  return `<form id="fbForm" novalidate>
      <div class="std-row">
        <div class="std-field"><label>ГОСТ</label><div id="fbGost">${uiSelect(gosts.map(g => ({ id: g, name: g })), d.gost, 'ГОСТ')}</div></div>
        <div class="std-field"><label>Тип ящика</label><div id="fbType">${fbTypeSelect(d.gost, d.type)}</div></div>
      </div>
      <div class="std-field"><label for="fbText">Что не так <span class="auth-req">*</span></label>
        <textarea id="fbText" rows="5" maxlength="3000" placeholder="Например: на чертеже бокового щита размер не совпадает с таблицей; ожидал ..., получил ..."></textarea></div>
      ${inputs ? `<label class="fb-check"><input type="checkbox" id="fbInputs" checked> Приложить введённые размеры и массу: ${escHtml(inputsText)}</label>` : ''}
      <p class="std-note">Если понадобится уточнить, ответим на почту аккаунта <b>${escHtml(user.email)}</b>.</p>
      <div class="std-msg" id="fbMsg" hidden></div>
      <div class="std-actions"><button type="submit" class="site-sub-btn site-sub-btn-main" id="fbSubmit">Отправить</button></div>
    </form>`;
}

function fbButton(id, cls, icon, title){
  const b = document.createElement('button');
  b.type = 'button'; b.id = id; b.className = 'site-settings-btn site-fb-btn ' + cls;
  b.title = title; b.setAttribute('aria-label', title);
  b.innerHTML = icon;
  return b;
}

let fbOverlay = null;
function openErrorReport(){
  const settings = document.getElementById('siteSettingsOverlay');
  if(settings) settings.hidden = true;
  if(!fbOverlay){
    fbOverlay = document.createElement('div');
    fbOverlay.className = 'std-overlay';
    fbOverlay.hidden = true;
    fbOverlay.innerHTML = `<div class="std-dialog" role="dialog" aria-modal="true" aria-labelledby="fbTitle">
        <div class="std-head"><h2 id="fbTitle">Сообщить об ошибке</h2>
          <button type="button" class="site-settings-close std-close" aria-label="Закрыть">${SITE_ICONS.close}</button></div>
        <div class="std-body" id="fbBody"></div>
      </div>`;
    document.body.appendChild(fbOverlay);
    const close = () => { closeSelects(); fbOverlay.hidden = true; };
    fbOverlay.addEventListener('click', e => { if(e.target === fbOverlay) close(); });
    fbOverlay.querySelector('.std-close').addEventListener('click', close);
    document.addEventListener('keydown', e => { if(e.key === 'Escape' && !fbOverlay.hidden) close(); });
    const body = fbOverlay.querySelector('#fbBody');
    // Сменили ГОСТ - список типов этого ГОСТа.
    body.addEventListener('ui-select-change', e => {
      if(e.target.closest('#fbGost')) body.querySelector('#fbType').innerHTML = fbTypeSelect(e.target.dataset.value, FB_NO_TYPE);
    });
    body.addEventListener('submit', async e => {
      e.preventDefault();
      const $ = id => body.querySelector('#' + id);
      const msg = $('fbMsg'), submit = $('fbSubmit');
      const show = text => { msg.hidden = false; msg.textContent = text; msg.className = 'std-msg auth-msg-error'; };
      const description = $('fbText').value.trim();
      if(!description) return show('Опишите, что не так.');
      const withInputs = $('fbInputs') && $('fbInputs').checked;
      submit.disabled = true;
      try{
        const r = await fetch('/api/feedback/error', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gost: $('fbGost').querySelector('.ui-select').dataset.value, type: $('fbType').querySelector('.ui-select').dataset.value, description, page: fbPage(), inputs: withInputs ? fbInputs() : null }) });
        const d = await r.json().catch(() => ({}));
        if(!r.ok) throw new Error(d.error || 'Ошибка сервера. Попробуйте ещё раз.');
        body.innerHTML = '<p class="std-text"><b>Спасибо, сообщение отправлено.</b> Мы проверим расчёт и исправим ошибку.</p>'
          + '<div class="std-actions"><button type="button" class="btn-secondary site-sub-btn fb-done">Закрыть</button></div>';
        body.querySelector('.fb-done').addEventListener('click', close);
      }catch(err){ show(err.message); submit.disabled = false; }
    });
  }
  const body = fbOverlay.querySelector('#fbBody');
  body.innerHTML = '<p class="std-text">Загрузка...</p>';
  fbOverlay.hidden = false;
  // Сообщить об ошибке можно только из аккаунта (по указанию пользователя:
  // обращения к администрации - только после входа, без входа - «Помощь»).
  fetchAccountUser().then(user => {
    if(!user){
      body.innerHTML = `<p class="std-text">${sessionEndedText()}Сообщить об ошибке можно после входа в аккаунт.</p><div class="std-actions">`
        + `<a class="site-sub-btn site-sub-btn-main" href="${authHref('login')}">Войти</a><a class="btn-secondary site-sub-btn" href="${authHref('register')}">Регистрация</a></div>`;
      return;
    }
    body.innerHTML = fbFormHtml(user);
    body.querySelector('#fbText').focus();
  });
}

function initFeedbackButtons(){
  const settingsBtn = document.getElementById('siteSettingsBtn');
  if(!settingsBtn || document.getElementById('siteBugBtn')) return;
  const bug = fbButton('siteBugBtn', 'site-bug-btn', FB_ICONS.bug, 'Сообщить об ошибке');
  const help = fbButton('siteHelpBtn', 'site-help-btn', FB_ICONS.help, 'Помощь');
  const before = settingsBtn.parentNode.querySelector('#siteAccountBtn') || settingsBtn;
  settingsBtn.parentNode.insertBefore(bug, before);
  settingsBtn.parentNode.insertBefore(help, before);
  bug.addEventListener('click', openErrorReport);
  help.addEventListener('click', () => openSettingsSection('help'));
}

if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initFeedbackButtons);
else initFeedbackButtons();
