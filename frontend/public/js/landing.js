// Главная страница (index.html) для новых посетителей: ролик с примером
// расчёта, галерея типов, подписки. Вошедшие сразу попадают к выбору ГОСТ
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

// ---------- Ролик «как это работает» ----------
// По указанию пользователя на первом экране - «видео»: макет страницы
// расчёта, курсор вводит размеры, отмечает толщины и галочки, нажимает
// «Рассчитать», появляются итог, чертёж и таблица, затем печать или PDF.
// Два примера по кругу. Числа и чертежи - из настоящих расчётов этих
// ящиков (чертежи сняты со страниц расчёта в images/landing). При
// «уменьшении движения» в системе - сразу готовый результат, без анимации.
const LPD_SCENES = [
  {
    type: 'I-1', short: 'I-1', dims: [1000, 800, 600], mass: 300,
    thick: [22, 25],
    opts: [['Полоз нужен', true, false], ['Округлить ширину досок', false, false], ['Добавить раскосины', false, true], ['X-образные раскосины', false, false]],
    sum: ['1088 × 888 × 716', '0.130', '90.8', '2.2'],
    image: '/images/box_i1.jpg', node: 'Дно', drawing: '/images/landing/demo-i1-dno.png',
    rows: [['Полоз', 50, 100, 844, 2], ['Доска дна', 22, 100, 1088, 6], ['Доска дна (дополнительная) 1', 22, 81, 1088, 2], ['Доска дна (дополнительная) 2', 22, 82, 1088, 1], ['Раскосина', 22, 100, 993, 1]],
    finish: 'print',
  },
  {
    type: 'II-1', short: 'II-1', dims: [1600, 1000, 900], mass: 800,
    thick: [25, 40, 50, 100],
    opts: [['Округлить ширину досок', false, true], ['Добавить раскосины', false, false], ['Погрузка авто/электропогрузчиком', false, true], ['Добавить пергамин', false, false]],
    sum: ['1700 × 1100 × 1115', '0.343', '240.4', '5.8'],
    image: '/images/box_ii1.png', node: 'Дно', drawing: '/images/landing/demo-ii1-dno.png',
    rows: [['Полоз', 75, 100, 1700, 2], ['Подполозная доска', 50, 100, 1300, 2], ['Торцовый брус дна', 50, 100, 1000, 2], ['Доска дна', 25, 100, 1000, 14]],
    finish: 'pdf',
  },
];
const LPD_THICK = [16, 19, 22, 25, 32, 40, 50, 60, 75, 100];
const LPD_W = 560, LPD_H = 400; // размер макета; на экране - масштаб по ширине

function lpdTable(sc){
  return `<table class="lpd-table"><thead><tr><th>Деталь</th><th>Толщина</th><th>Ширина</th><th>Длина</th><th>Кол-во</th></tr></thead><tbody>`
    + sc.rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('') + '</tbody></table>';
}
function lpdPageHtml(sc){
  const f = (id, label) => `<div class="lpd-field"><label>${label}</label><div class="lpd-input" data-f="${id}"><span></span></div></div>`;
  return `<div class="lpd-h1">ГОСТ 10198-91 тип ${sc.type}</div>
    <div class="lpd-card"><div class="lpd-card-title">Внутренние размеры груза, мм</div>
      <div class="lpd-fields">${f('L', 'Длина')}${f('W', 'Ширина')}${f('H', 'Высота')}${f('M', 'Масса груза, кг')}</div></div>
    <div class="lpd-card"><div class="lpd-card-title">Толщины пиломатериала в наличии</div>
      <div class="lpd-select" data-sel><span>Толщины не выбраны - расчёт строго по ГОСТ</span><i>▾</i></div>
      <div class="lpd-chips" data-chips>${LPD_THICK.map(t => `<span class="lpd-chip" data-t="${t}"><b></b>${t} мм</span>`).join('')}</div></div>
    <div class="lpd-card"><div class="lpd-card-title">Дополнительные опции</div>
      ${sc.opts.map(([name, on], i) => `<div class="lpd-opt${on ? ' on' : ''}" data-o="${i}"><b></b>${name}</div>`).join('')}</div>
    <div class="lpd-card lpd-actions"><span class="lpd-btn lpd-btn-main" data-calc>Рассчитать</span><span class="lpd-status" data-status><b></b>Расчёт выполнен</span>
      <span class="lpd-btn" data-print>Печать</span><span class="lpd-btn" data-pdf>Скачать PDF</span></div>
    <div class="lpd-card lpd-result" data-sum><div class="lpd-card-title">Итог</div>
      <div class="lpd-sum"><div class="lpd-sum-img"><img src="${sc.image}" alt=""></div><div class="lpd-tiles">
        <div><label>Наружные размеры</label><b>${sc.sum[0]} <small>мм</small></b></div>
        <div><label>Расход пиломатериала</label><b>${sc.sum[1]} <small>м³</small></b></div>
        <div><label>Масса ящика</label><b>${sc.sum[2]} <small>кг</small></b></div>
        <div><label>Норма времени</label><b>${sc.sum[3]} <small>ч</small></b></div></div></div></div>
    <div class="lpd-card lpd-result" data-spec><div class="lpd-card-title">Спецификация досок</div>
      <div class="lpd-node">${sc.node}</div>
      <div class="lpd-spec"><div class="lpd-drawing"><img src="${sc.drawing}" alt=""></div>${lpdTable(sc)}</div></div>`;
}
function lpdSheetHtml(sc){
  return `<div class="lpd-sheet"><div class="lpd-sheet-h">ГОСТ 10198-91 тип ${sc.type} · груз ${sc.dims.join(' × ')} мм, ${sc.mass} кг</div>
    <div class="lpd-sheet-sum">Наружные ${sc.sum[0]} мм · ${sc.sum[1]} м³ · ${sc.sum[2]} кг · ${sc.sum[3]} ч</div>
    <div class="lpd-sheet-node">${sc.node}</div><div class="lpd-sheet-spec"><img src="${sc.drawing}" alt="">${lpdTable(sc)}</div>
    <div class="lpd-sheet-node">Крышка</div><div class="lpd-sheet-lines"><i></i><i></i><i></i><i></i></div>
    <div class="lpd-sheet-node">Щит торцевой</div><div class="lpd-sheet-lines"><i></i><i></i><i></i></div></div>
    <div class="lpd-sheet-bar"><span>Печать · 2 листа</span><span class="lpd-btn lpd-btn-main" data-go>Печать</span></div>`;
}

function lpDemo(){
  const root = document.getElementById('lpDemo');
  if(!root) return;
  const box = document.getElementById('lpdBox'), view = document.getElementById('lpdView');
  const page = document.getElementById('lpdPage'), sheet = document.getElementById('lpdSheet');
  const toast = document.getElementById('lpdToast'), cursor = document.getElementById('lpdCursor');
  const tab = document.getElementById('lpdTab'), scenes = document.getElementById('lpdScenes');
  let scale = 1;
  const fit = () => { scale = box.clientWidth / LPD_W; view.style.transform = `scale(${scale})`; box.style.height = (LPD_H * scale) + 'px'; };
  fit();
  if(window.ResizeObserver) new ResizeObserver(fit).observe(box); else addEventListener('resize', fit);

  scenes.innerHTML = LPD_SCENES.map((sc, i) => `<button type="button" role="tab" data-i="${i}"><span>Тип ${sc.short} · ${sc.dims.join('×')} мм · ${sc.mass} кг</span><i><u></u></i></button>`).join('');
  const sceneBtns = [...scenes.children];

  // Прерывание: смена примера кнопкой - текущий сценарий останавливается.
  let token = 0;
  const STOP = {};
  const sleep = (ms, tk) => new Promise((res, rej) => {
    let left = ms;
    const tick = () => {
      if(tk !== token) return rej(STOP);
      if(document.hidden){ setTimeout(tick, 300); return; } // вкладка скрыта - пауза
      if(left <= 0) return res();
      const step = Math.min(left, 100); left -= step; setTimeout(tick, step);
    };
    tick();
  });
  let scrollY = 0;
  const q = sel => page.querySelector(sel);
  const center = el => {
    const r = el.getBoundingClientRect(), v = view.getBoundingClientRect();
    return [(r.left - v.left) / scale + Math.min(r.width / scale / 2, 40), (r.top - v.top) / scale + r.height / scale / 2];
  };
  const move = async (el, tk, ms = 650) => {
    const [x, y] = center(el);
    cursor.style.transition = `transform ${ms}ms cubic-bezier(.45,0,.2,1)`;
    cursor.style.transform = `translate(${x}px, ${y}px)`;
    await sleep(ms, tk);
  };
  const click = async (tk, el) => {
    cursor.classList.add('press'); if(el) el.classList.add('pressed');
    await sleep(160, tk);
    cursor.classList.remove('press'); if(el) el.classList.remove('pressed');
  };
  const scrollTo = async (el, tk, ms = 700, off = 12) => {
    const y = Math.max(0, Math.min(el.offsetTop - off, page.offsetHeight - LPD_H));
    const dy = y - scrollY; scrollY = y;
    page.style.transition = `transform ${ms}ms cubic-bezier(.45,0,.2,1)`;
    page.style.transform = `translateY(${-y}px)`;
    // Курсор остаётся на месте экрана, как при прокрутке колесом.
    await sleep(ms, tk);
    return dy;
  };
  const type = async (el, text, tk) => {
    el.classList.add('focus');
    const span = el.querySelector('span');
    for(const ch of String(text)){ span.textContent += ch; await sleep(85, tk); }
    el.classList.remove('focus');
  };
  const progress = (i, p) => sceneBtns.forEach((b, k) => {
    b.classList.toggle('on', k === i);
    b.querySelector('u').style.width = (k === i ? p : k < i ? 100 : 0) + '%';
  });
  const showToast = (html) => { toast.innerHTML = html; toast.classList.add('on'); };

  const setup = (i) => {
    const sc = LPD_SCENES[i];
    tab.textContent = 'Тара+ · ГОСТ 10198-91 тип ' + sc.type;
    page.innerHTML = lpdPageHtml(sc);
    page.style.transition = 'none'; page.style.transform = 'none'; scrollY = 0;
    sheet.innerHTML = lpdSheetHtml(sc); sheet.className = 'lpd-sheet-wrap';
    toast.className = 'lpd-toast';
    cursor.style.transition = 'none'; cursor.style.transform = `translate(${LPD_W * 0.7}px, ${LPD_H * 0.8}px)`;
    view.classList.remove('lpd-fade');
    return sc;
  };
  // Готовый результат без анимации (уменьшение движения).
  const still = (i) => {
    const sc = setup(i);
    ['L', 'W', 'H', 'M'].forEach((k, n) => { q(`[data-f="${k}"] span`).textContent = n < 3 ? sc.dims[n] : sc.mass; });
    page.querySelectorAll('.lpd-chip').forEach(c => c.classList.toggle('on', sc.thick.includes(+c.dataset.t)));
    q('[data-sel] span').textContent = `Выбрано (${sc.thick.length}): ${sc.thick.join(', ')} мм`;
    sc.opts.forEach(([, , tick], n) => { if(tick) q(`[data-o="${n}"]`).classList.add('on'); });
    q('[data-status]').classList.add('on');
    page.querySelectorAll('.lpd-result').forEach(r => r.classList.add('on'));
    page.querySelectorAll('.lpd-table tr').forEach(r => r.classList.add('on'));
    page.style.transform = `translateY(${-Math.min(q('[data-sum]').offsetTop - 12, page.offsetHeight - LPD_H)}px)`;
    cursor.style.display = 'none';
    progress(i, 100);
  };

  const play = async (i, tk) => {
    const sc = setup(i);
    progress(i, 0);
    await sleep(500, tk);
    // 1. Размеры и масса.
    const vals = [...sc.dims, sc.mass];
    for(const [n, k] of ['L', 'W', 'H', 'M'].entries()){
      const el = q(`[data-f="${k}"]`);
      await move(el, tk, n ? 380 : 700); await click(tk);
      await type(el, vals[n], tk);
    }
    progress(i, 18);
    // 2. Толщины в наличии.
    const sel = q('[data-sel]');
    await move(sel, tk); await click(tk, sel);
    q('[data-chips]').classList.add('open');
    await sleep(250, tk);
    for(const t of sc.thick){
      const chip = q(`.lpd-chip[data-t="${t}"]`);
      await move(chip, tk, 380); await click(tk); chip.classList.add('on');
      q('[data-sel] span').textContent = `Выбрано (${sc.thick.indexOf(t) + 1}): ${sc.thick.slice(0, sc.thick.indexOf(t) + 1).join(', ')} мм`;
    }
    await sleep(250, tk);
    q('[data-chips]').classList.remove('open');
    progress(i, 34);
    // 3. Опции.
    await scrollTo(q('[data-o="0"]').parentNode, tk);
    for(const [n, [, , tick]] of sc.opts.entries()){
      if(!tick) continue;
      const o = q(`[data-o="${n}"]`);
      await move(o, tk, 500); await click(tk); o.classList.add('on');
      await sleep(200, tk);
    }
    progress(i, 48);
    // 4. Расчёт.
    const calc = q('[data-calc]');
    await move(calc, tk); await click(tk, calc);
    calc.classList.add('busy');
    await sleep(700, tk);
    calc.classList.remove('busy');
    q('[data-status]').classList.add('on');
    page.querySelectorAll('.lpd-result').forEach(r => r.classList.add('on'));
    await sleep(500, tk);
    progress(i, 62);
    // 5. Итог, чертёж и таблица деталей.
    await scrollTo(q('[data-sum]'), tk, 900);
    await sleep(1500, tk);
    await scrollTo(q('[data-spec]'), tk, 900);
    for(const r of page.querySelectorAll('.lpd-table tbody tr')){ r.classList.add('on'); await sleep(140, tk); }
    await sleep(1800, tk);
    progress(i, 80);
    // 6. Печать или PDF.
    await scrollTo(q('.lpd-actions'), tk, 900, 120);
    if(sc.finish === 'print'){
      const pr = q('[data-print]');
      await move(pr, tk); await click(tk, pr);
      sheet.classList.add('on');
      await sleep(1300, tk);
      const go = sheet.querySelector('[data-go]');
      await move(go, tk); await click(tk, go);
      sheet.classList.add('sent');
      await sleep(500, tk);
      showToast('<b class="lpd-ic">✓</b>Отправлено на печать: 2 листа');
    } else {
      const pdf = q('[data-pdf]');
      await move(pdf, tk); await click(tk, pdf);
      showToast(`<b class="lpd-ic">↓</b><span>Ящик ${sc.type} ${sc.dims.join('×')}.pdf<i class="lpd-bar-fill"></i></span>`);
      await sleep(1200, tk);
      toast.classList.add('done');
    }
    progress(i, 100);
    await sleep(2600, tk);
    view.classList.add('lpd-fade');
    await sleep(500, tk);
  };

  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const run = async (i) => {
    const tk = ++token;
    if(reduce){ still(i); return; }
    try{
      for(;;){ await play(i, tk); i = (i + 1) % LPD_SCENES.length; }
    }catch(e){ if(e !== STOP) throw e; }
  };
  sceneBtns.forEach(b => b.addEventListener('click', () => run(+b.dataset.i)));
  run(0);
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

lpDemo();
lpRenderTypes();
lpRenderPlans();
