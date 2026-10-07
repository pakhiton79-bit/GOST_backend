// Внутренние стандарты заводов (по указанию пользователя): на странице выбора
// ГОСТа в верхней панели - кнопка «Свой стандарт» рядом с аккаунтом и
// настройками. Окно: в подписках Base, Pro и Team - форма заявки
// (POST /api/standards/request, см. backend/src/auth/standards.js), иначе -
// в каких подписках это доступно. По указанию пользователя (меньше
// персональных данных) - без телефона и контактного лица: ответ - на почту
// аккаунта. Пока почта в тестовом режиме, заявка
// сохраняется на сервере; письмо - когда подключим почту.
const STD_ICON = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M12 11v6M9 14h6"/></svg>';

function stdFormHtml(user){
  const field = (id, label, req, input) => `<div class="std-field"><label for="${id}">${label}${req ? ' <span class="auth-req">*</span>' : ''}</label>${input}</div>`;
  return `<form id="stdForm" novalidate>
      ${field('stdCompany', 'Предприятие', true, '<input id="stdCompany" maxlength="200" autocomplete="organization">')}
      ${field('stdStandard', 'Обозначение и название стандарта', true, '<input id="stdStandard" maxlength="300" placeholder="Например: СТО 12345-001-2024 «Ящики для оборудования»">')}
      ${field('stdDetails', 'Что нужно рассчитывать', true, '<textarea id="stdDetails" rows="4" maxlength="3000" placeholder="Типы ящиков, диапазон размеров и масс, чем стандарт отличается от ГОСТ"></textarea>')}
      <p class="std-note">Ответим на почту аккаунта <b>${escHtml(user.email)}</b> и там же запросим сам документ (PDF, таблицы, чертежи).</p>
      <div class="std-msg" id="stdMsg" hidden></div>
      <div class="std-actions"><button type="submit" class="site-sub-btn site-sub-btn-main" id="stdSubmit">Отправить заявку</button></div>
    </form>`;
}

function stdBodyHtml(user){
  const intro = '<p class="std-text">Работаете по стандарту своего предприятия (СТО, ТУ, внутренние таблицы)? Пришлите заявку, и мы добавим его расчёт в ваш аккаунт.</p>';
  if(!user) return intro + `<p class="std-text">${sessionEndedText()}Отправить заявку можно после входа в аккаунт. Доступно в подписках Base, Pro и Team.</p><div class="std-actions">`
    + `<a class="site-sub-btn site-sub-btn-main" href="${authHref('login')}">Войти</a><a class="btn-secondary site-sub-btn" href="${authHref('register')}">Регистрация</a></div>`;
  if(['free'].includes(user.quota.plan)) return intro + `<p class="std-text">Доступно в подписках Base, Pro и Team. Сейчас у вас подписка ${escHtml(user.quota.planName)}.</p>`
    + '<div class="std-actions"><a class="site-sub-btn site-sub-btn-main" href="plans.html">Подписки</a></div>';
  return intro + stdFormHtml(user);
}

function initStandardsButton(){
  const settingsBtn = document.getElementById('siteSettingsBtn');
  if(!settingsBtn || document.getElementById('siteStdBtn')) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'siteStdBtn';
  btn.className = 'site-settings-btn site-std-btn';
  btn.title = 'Внутренний стандарт завода';
  btn.innerHTML = STD_ICON + '<span>Свой стандарт</span>';
  settingsBtn.parentNode.insertBefore(btn, settingsBtn.parentNode.querySelector('#siteAccountBtn') || settingsBtn);

  const overlay = document.createElement('div');
  overlay.className = 'std-overlay';
  overlay.hidden = true;
  overlay.innerHTML = `<div class="std-dialog" role="dialog" aria-modal="true" aria-labelledby="stdTitle">
      <div class="std-head"><h2 id="stdTitle">Внутренний стандарт завода</h2>
        <button type="button" class="site-settings-close std-close" aria-label="Закрыть">${SITE_ICONS.close}</button></div>
      <div class="std-body" id="stdBody"></div>
    </div>`;
  document.body.appendChild(overlay);
  const body = overlay.querySelector('#stdBody');
  const close = () => { overlay.hidden = true; btn.focus(); };
  overlay.addEventListener('click', e => { if(e.target === overlay) close(); });
  overlay.querySelector('.std-close').addEventListener('click', close);
  document.addEventListener('keydown', e => { if(e.key === 'Escape' && !overlay.hidden) close(); });

  btn.addEventListener('click', async () => {
    body.innerHTML = '<p class="std-text">Загрузка...</p>';
    overlay.hidden = false;
    const user = await fetchAccountUser();
    body.innerHTML = stdBodyHtml(user);
    const first = body.querySelector('input, a');
    if(first) first.focus();
  });

  body.addEventListener('submit', async e => {
    e.preventDefault();
    const $ = id => body.querySelector('#' + id);
    const msg = $('stdMsg'), submit = $('stdSubmit');
    const show = (text, ok) => { msg.hidden = false; msg.textContent = text; msg.className = 'std-msg ' + (ok ? 'auth-msg-ok' : 'auth-msg-error'); };
    const data = { company: $('stdCompany').value, standard: $('stdStandard').value, details: $('stdDetails').value };
    if(['company', 'standard', 'details'].some(k => !data[k].trim())) return show('Заполните обязательные поля.');
    submit.disabled = true;
    try{
      const r = await fetch('/api/standards/request', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const d = await r.json().catch(() => ({}));
      if(!r.ok) throw new Error(d.error || 'Ошибка сервера. Попробуйте ещё раз.');
      body.innerHTML = `<p class="std-text"><b>Заявка отправлена.</b> Мы ответим на почту аккаунта, запросим документ стандарта и сообщим сроки.</p>`
        + '<div class="std-actions"><button type="button" class="btn-secondary site-sub-btn std-done">Закрыть</button></div>';
      body.querySelector('.std-done').addEventListener('click', close);
    }catch(err){ show(err.message); submit.disabled = false; }
  });
}

// Панель сайта строится по DOMContentLoaded (common-settings.js) - кнопка после неё.
if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initStandardsButton);
else initStandardsButton();
