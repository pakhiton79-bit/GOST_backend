// Страница подписок (plans.html): подписки - расчёты, устройства, цена;
// текущая подписка вошедшего отмечена. Оплата - через Робокассу
// (backend/src/auth/payments.js), когда она подключена (payEnabled): у
// платных подписок выбор срока (1 или 3 месяца, цена × срок) и кнопка
// «Оформить» («Продлить» у текущей); перед переходом к оплате - окно с
// суммой и тем, что произойдёт (продление, замена с зачётом, после текущей).
// Без оплаты - кнопки «Скоро» (платные подписки подключает администратор).
const PLAN_DEVICES = n => n === 1 ? '1 устройство' : n + ' устройства';
// Для кого подписка - одна строка под названием.
const PLAN_FOR = {
  free: 'Попробовать',
  base: 'Для небольшого объёма',
  pro: 'Для постоянной работы',
  team: 'Для команды',
};

const PAY_TERMS = [1, 3];
const fmtRub = n => n.toLocaleString('ru-RU') + ' ₽';
const fmtDay = iso => new Date(iso).toLocaleDateString('ru-RU');

function planCard(p, current, pay){
  const price = p.price ? `${p.price.toLocaleString('ru-RU')} ₽ <small>в месяц</small>` : (p.id === 'free' ? 'Бесплатно' : 'Цена уточняется');
  const features = [
    ...(p.monthly ? [`${p.monthly.toLocaleString('ru-RU')} расчётов в месяц`] : []),
    ...(p.welcome ? [`${p.welcome} расчётов на ${p.welcomeHours} часов пробного доступа`] : []),
    PLAN_DEVICES(p.devices),
    ...(p.customStandards ? ['Внутренние стандарты вашего завода'] : []),
    ...(p.prioritySupport ? ['Приоритетное обслуживание'] : []),
  ];
  let btn;
  if(pay && p.price){
    // Выбор срока - радиокнопки (по умолчанию 1 месяц), сумма - цена × срок.
    const terms = PAY_TERMS.map((m, i) => `<label class="plan-term"><input type="radio" name="term-${p.id}" value="${m}"${i ? '' : ' checked'}><span>${m === 1 ? '1 месяц' : m + ' месяца'}<b>${fmtRub(p.price * m)}</b></span></label>`).join('');
    btn = `<div class="plan-terms" role="radiogroup" aria-label="Срок подписки ${p.name}">${terms}</div>`
      + `<button type="button" class="plan-btn" data-pay="${p.id}">${current ? 'Продлить' : 'Оформить'}</button>`;
  } else {
    btn = current ? '<button type="button" class="btn-secondary plan-btn" disabled>Ваша подписка</button>'
      : p.id === 'free' ? '' : '<button type="button" class="plan-btn" disabled>Скоро</button>';
  }
  return `<div class="plan-card${current ? ' plan-card-current' : ''}${p.id === 'pro' ? ' plan-card-accent' : ''}">
      <div class="plan-name">${p.name}</div>
      <div class="plan-for">${PLAN_FOR[p.id] || ''}</div>
      <div class="plan-price">${price}</div>
      <ul class="plan-features">${features.map(f => `<li>${f}</li>`).join('')}</ul>
      ${btn}
    </div>`;
}

let plansById = {};
Promise.all([fetch('/api/plans').then(r => r.json()), fetchAccountUser()]).then(([d, user]) => {
  const current = user ? user.quota.plan : null;
  d.plans.forEach(p => { plansById[p.id] = p; });
  document.getElementById('plansGrid').innerHTML = d.plans.map(p => planCard(p, p.id === current, d.payEnabled)).join('');
  if(d.payEnabled) document.getElementById('plansNote').textContent = 'Оплата картой или через СБП на странице Робокассы. Чек придёт на почту аккаунта.';
  else showPlansContact();
});

document.addEventListener('click', e => {
  const b = e.target.closest && e.target.closest('[data-pay]');
  if(!b) return;
  const id = b.dataset.pay;
  const months = Number((document.querySelector(`input[name="term-${id}"]:checked`) || {}).value || 1);
  if(!accountUserCache){ location.href = 'login.html?mode=register&next=plans.html'; return; }
  b.disabled = true;
  fetch(`/api/pay/quote?plan=${encodeURIComponent(id)}&months=${months}`, { credentials: 'same-origin' })
    .then(r => r.json().then(d => ({ ok: r.ok, d })))
    .then(({ ok, d }) => showPayDialog(plansById[id], months, ok ? d : null, ok ? '' : d.error))
    .catch(() => showPayDialog(plansById[id], months, null, 'Нет связи с сервером. Попробуйте ещё раз.'))
    .finally(() => { b.disabled = false; });
});

// Окно перед оплатой: что произойдёт и сколько к оплате.
function showPayDialog(p, months, q, err){
  document.querySelectorAll('.limit-dialog').forEach(o => o.remove());
  const term = months === 1 ? '1 месяц' : months + ' месяца';
  let what = '';
  if(q){
    what = {
      new: `Подписка ${p.name} на ${term} начнётся сразу после оплаты и будет действовать до ${fmtDay(q.until)}.`,
      extend: `Подписка ${p.name} продлится на ${term}, до ${fmtDay(q.until)}.`,
      upgrade: `Подписка ${p.name} включится сразу после оплаты вместо текущей и будет действовать до ${fmtDay(q.until)}. Неиспользованные дни текущей подписки зачтены: ${fmtRub(q.credit)}.`,
      queue: `Подписка ${p.name} начнётся после окончания текущей, ${fmtDay(q.startsAt)}, и будет действовать до ${fmtDay(q.until)}.`,
    }[q.kind] || '';
  }
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay limit-dialog';
  overlay.innerHTML = `<div class="modal-box limit-box" role="dialog" aria-modal="true" aria-labelledby="payTitle">
      <h3 id="payTitle">Подписка ${escHtml(p.name)}, ${term}</h3>
      ${q ? `<p class="limit-text">${escHtml(what)}</p>
      <div class="pay-sum"><span>К оплате</span><b>${fmtRub(q.amount)}</b></div>
      <p class="limit-text pay-legal">Оплата картой или через СБП на странице Робокассы, чек придёт на почту. Нажимая «Перейти к оплате», вы принимаете условия <a href="terms.html" target="_blank">Пользовательского соглашения (публичной оферты)</a>.</p>` : ''}
      <div class="auth-msg" id="payMsg"${err ? '' : ' hidden'}>${escHtml(err || '')}</div>
      <div class="limit-actions"><button type="button" class="btn-secondary limit-close">${q ? 'Отмена' : 'Понятно'}</button>${q ? '<button type="button" class="limit-main" id="payGo">Перейти к оплате</button>' : ''}</div>
    </div>`;
  const close = () => { document.removeEventListener('keydown', onKey, true); overlay.remove(); };
  const onKey = e => { if(e.key === 'Escape'){ e.preventDefault(); close(); } };
  overlay.addEventListener('click', e => {
    if(e.target === overlay || e.target.closest('.limit-close')) return close();
    const go = e.target.closest('#payGo');
    if(!go || go.disabled) return;
    go.disabled = true;
    fetch('/api/pay/create', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan: p.id, months }) })
      .then(r => r.json().then(d => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if(ok && d.url){ location.href = d.url; return; }
        throw new Error(d.error || 'Не удалось создать счёт. Попробуйте ещё раз.');
      })
      .catch(err => {
        const m = overlay.querySelector('#payMsg');
        m.hidden = false; m.textContent = err.message === 'Failed to fetch' ? 'Нет связи с сервером. Попробуйте ещё раз.' : err.message;
        go.disabled = false;
      });
  });
  document.addEventListener('keydown', onKey, true);
  document.body.appendChild(overlay);
  const box = overlay.querySelector('.limit-box');
  box.tabIndex = -1; box.style.outline = 'none'; box.focus();
}

// Оплаты на сайте нет, но есть почта для обращений (legal-config.js) -
// можно написать и подключить подписку уже сейчас.
function showPlansContact(){
  if(typeof LEGAL === 'undefined' || !LEGAL.email) return;
  const note = document.getElementById('plansNote');
  note.textContent = 'Оплата на сайте скоро появится. Подключить Pro или Team сейчас: ';
  const a = document.createElement('a');
  a.href = 'mailto:' + LEGAL.email;
  a.textContent = LEGAL.email;
  note.append(a, '.');
}
