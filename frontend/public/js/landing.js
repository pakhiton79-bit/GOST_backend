// Главная страница (index.html) для новых посетителей: витрина общих
// чертежей, галерея типов, подписки. Вошедшие сразу попадают к выбору ГОСТ
// (gosts.html); с ?about («О сервисе») страница показывается и им - с
// кнопкой «Перейти к расчётам» вместо регистрации.

// ---------- Настройки ----------
// По указанию пользователя на главной в «Настройках» - только тема. Окно
// строится по DOMContentLoaded, этот скрипт выполняется раньше. Кнопка
// аккаунта (вошедшим) ведёт к разделу «Аккаунт» на странице выбора ГОСТ.
SITE_SETTINGS_SECTIONS.splice(1);
openSettingsSection = section => { location.href = 'gosts.html#' + section; };

// ---------- Вошедшие ----------
(function(){
  const about = new URLSearchParams(location.search).has('about');
  fetchAccountUser().then(user => {
    if(!user) return;
    if(!about){ location.replace('gosts.html'); return; }
    const go = '<a class="lp-btn lp-btn-main" href="gosts.html">Перейти к расчётам</a>';
    document.getElementById('lpHeroCta').innerHTML = go;
    document.getElementById('lpFinalCta').innerHTML = go;
  });
})();

// ---------- Витрина общих чертежей ----------
// По указанию пользователя вместо нарисованной модели - наши общие чертежи
// ящиков: сменяются по очереди с плавным переходом, снизу миниатюры
// (нажатием - выбрать тип). При «уменьшении движения» в системе - без
// автосмены.
function lpShowcase(){
  const stage = document.getElementById('lpShowStage');
  const name = document.getElementById('lpShowName');
  const thumbs = document.getElementById('lpShowThumbs');
  if(!stage) return;
  stage.innerHTML = LP_TYPES.map((t, i) => `<img src="${t.image}" alt="${t.name}"${i ? ' loading="lazy"' : ''} class="${i ? '' : 'on'}">`).join('');
  thumbs.innerHTML = LP_TYPES.map((t, i) => `<button type="button" role="tab" aria-label="${t.name}" aria-selected="${i === 0}" class="${i ? '' : 'on'}"><img src="${t.image}" alt=""></button>`).join('');
  const imgs = [...stage.children], btns = [...thumbs.children];
  let cur = 0, timer = null;
  const show = i => {
    cur = (i + LP_TYPES.length) % LP_TYPES.length;
    imgs.forEach((im, k) => im.classList.toggle('on', k === cur));
    btns.forEach((b, k) => { b.classList.toggle('on', k === cur); b.setAttribute('aria-selected', String(k === cur)); });
    name.textContent = LP_TYPES[cur].name + ' по ГОСТ 10198-91';
  };
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const start = () => { clearInterval(timer); if(!reduce) timer = setInterval(() => { if(!document.hidden) show(cur + 1); }, 3200); };
  btns.forEach((b, k) => b.addEventListener('click', () => { show(k); start(); }));
  show(0);
  start();
}

// ---------- Галерея типов ----------
const LP_TYPES = [
  { name: 'Тип I-1', image: '/images/box_i1.jpg' },
  { name: 'Тип I-2', image: '/images/box_i2.png' },
  { name: 'Тип I-3', image: '/images/box.png' },
  { name: 'Тип I-4', image: '/images/box_i4.png' },
  { name: 'Тип II-1', image: '/images/box_ii1.png' },
  { name: 'Тип II-2', image: '/images/box_ii2.png' },
  { name: 'Тип III-1', image: '/images/box_iii1.png' },
];
function lpRenderTypes(){
  const box = document.getElementById('lpTypes');
  box.innerHTML = LP_TYPES.map(t => `<a class="lp-type" href="gost-10198-91.html"><div class="lp-type-img"><img src="${t.image}" alt="${t.name}" loading="lazy"></div><span>${t.name}</span></a>`).join('')
    + '<div class="lp-type lp-type-soon"><div class="lp-type-img"><span>ГОСТ 2991-85<br>и другие</span></div><span>В работе</span></div>';
}

// ---------- Подписки ----------
function lpRenderPlans(){
  fetch('/api/plans').then(r => r.json()).then(d => {
    const word = n => n % 10 === 1 && n % 100 !== 11 ? 'устройство' : 'устройства';
    document.getElementById('lpPlans').innerHTML = (d.plans || []).map(p => `<div class="lp-plan${p.id === 'pro' ? ' lp-plan-accent' : ''}">
        <div class="lp-plan-name">${p.name}</div>
        <div class="lp-plan-price">${p.price ? p.price.toLocaleString('ru-RU') + ' ₽ в месяц' : (p.id === 'free' ? 'Бесплатно' : 'Цена уточняется')}</div>
        <ul><li>${p.monthly.toLocaleString('ru-RU')} расчётов в месяц</li>${p.welcome ? `<li>+${p.welcome} при регистрации</li>` : ''}<li>${p.devices} ${word(p.devices)}</li></ul>
      </div>`).join('');
  }).catch(() => {});
}

lpShowcase();
lpRenderTypes();
lpRenderPlans();
