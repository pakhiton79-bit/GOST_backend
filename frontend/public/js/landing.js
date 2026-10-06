// Главная страница (index.html) для новых посетителей: анимация сборки ящика,
// галерея типов, подписки. Вошедшие сразу попадают к выбору ГОСТ
// (gosts.html); с ?about («О сервисе») страница показывается и им - с
// кнопкой «Перейти к расчётам» вместо регистрации.

// ---------- Вошедшие ----------
(function(){
  const about = new URLSearchParams(location.search).has('about');
  fetchAccountUser().then(user => {
    if(!user) return;
    if(!about){ location.replace('gosts.html'); return; }
    const go = '<a class="lp-btn lp-btn-main" href="gosts.html">Перейти к расчётам</a>';
    document.getElementById('lpHeroCta').innerHTML = go;
    document.getElementById('lpFinalCta').innerHTML = go;
    document.getElementById('lpHeroNote').hidden = true;
  });
})();

// ---------- Сборка ящика (изометрия, SVG) ----------
// Ящик из деталей: дно (полозья и настил), торцевые и боковые щиты, крышка.
// Детали прилетают по очереди (шаги 1-4 подписаны под рисунком), ящик
// стоит собранным, разлетается и собирается снова. При «уменьшении
// движения» в системе - сразу собранный, без анимации.
const LP_C = Math.cos(Math.PI / 6), LP_S = Math.sin(Math.PI / 6);
const lpProj = (x, y, z) => [(x - y) * LP_C, -(x + y) * LP_S - z];

function lpBuildBox(svg){
  const L = 1.5, W = 1, H = 0.82, t = 0.06, pl = 0.07, pt = 0.035;
  const NS = 'http://www.w3.org/2000/svg';
  const groups = [];
  // Деталь - группа кубоидов; off - куда она отлетает при разборке.
  const part = (step, off, cuboids) => groups.push({ step, off, cuboids });
  const cub = (x0, x1, y0, y1, z0, z1, cls, seams) => ({ b: [x0, x1, y0, y1, z0, z1], cls: cls || '', seams: seams || null });

  // Дно: полозья и настил.
  part(1, [0, 0, -0.45], [
    cub(0, L, 0.1, 0.1 + pl * 1.6, -0.12, 0, 'wood'),
    cub(0, L, W - 0.1 - pl * 1.6, W - 0.1, -0.12, 0, 'wood'),
    cub(0, L, 0, W, 0, 0.05, '', { face: 'top', dir: 'y', n: 5 }),
  ]);
  // Торцевые щиты (дальний и ближний).
  part(2, [0.6, 0, 0], [cub(L - t, L, t, W - t, 0.05, H, '')]);
  part(2, [-0.6, 0, 0], [
    cub(0, t, t, W - t, 0.05, H, '', { face: 'x0', dir: 'z', n: 4 }),
    cub(-pt, 0, 0.12, 0.12 + pl, 0.05, H, 'wood'),
    cub(-pt, 0, W - 0.12 - pl, W - 0.12, 0.05, H, 'wood'),
  ]);
  // Боковые щиты (дальний и ближний), на ближнем - планки и раскосина.
  part(3, [0, 0.55, 0], [cub(0, L, W - t, W, 0.05, H, '')]);
  part(3, [0, -0.55, 0], [
    cub(0, L, 0, t, 0.05, H, '', { face: 'y0', dir: 'z', n: 4 }),
    cub(0.18, 0.18 + pl, -pt, 0, 0.05, H, 'wood'),
    cub(L / 2 - pl / 2, L / 2 + pl / 2, -pt, 0, 0.05, H, 'wood'),
    cub(L - 0.18 - pl, L - 0.18, -pt, 0, 0.05, H, 'wood'),
  ]);
  // Крышка с поясами планок.
  part(4, [0, 0, 0.6], [
    cub(0, L, 0, W, H, H + 0.05, '', { face: 'top', dir: 'y', n: 5 }),
    cub(0.18, 0.18 + pl, -pt, W + pt, H + 0.05, H + 0.05 + pt, 'wood'),
    cub(L / 2 - pl / 2, L / 2 + pl / 2, -pt, W + pt, H + 0.05, H + 0.05 + pt, 'wood'),
    cub(L - 0.18 - pl, L - 0.18, -pt, W + pt, H + 0.05, H + 0.05 + pt, 'wood'),
  ]);

  // Границы рисунка - с учётом разлёта.
  const pts = [];
  groups.forEach(g => g.cuboids.forEach(({ b }) => {
    for(const ox of [0, g.off[0]]) for(const oy of [0, g.off[1]]) for(const oz of [0, g.off[2]])
      [b[0], b[1]].forEach(x => [b[2], b[3]].forEach(y => [b[4], b[5]].forEach(z => pts.push(lpProj(x + ox, y + oy, z + oz)))));
  }));
  const minX = Math.min(...pts.map(p => p[0])), maxX = Math.max(...pts.map(p => p[0]));
  const minY = Math.min(...pts.map(p => p[1])), maxY = Math.max(...pts.map(p => p[1]));
  const K = 300, pad = 8;
  const VW = (maxX - minX) * K + 2 * pad, VH = (maxY - minY) * K + 2 * pad;
  svg.setAttribute('viewBox', `0 0 ${VW.toFixed(0)} ${VH.toFixed(0)}`);
  const P = (x, y, z) => { const p = lpProj(x, y, z); return [pad + (p[0] - minX) * K, pad + (p[1] - minY) * K]; };
  const f = v => v.toFixed(1);
  const poly = ps => ps.map(p => f(p[0]) + ',' + f(p[1])).join(' ');

  // Порядок отрисовки - от дальних к ближним: дно, дальние щиты (бок,
  // торец), ближние (торец, бок), крышка.
  const order = [0, 3, 1, 2, 4, 5].map(i => groups[i]);
  const els = [];
  order.forEach(g => {
    const el = document.createElementNS(NS, 'g');
    el.setAttribute('class', 'lp-part');
    el.dataset.step = g.step;
    const o0 = P(0, 0, 0), o1 = P(g.off[0], g.off[1], g.off[2]);
    el.dataset.dx = (o1[0] - o0[0]).toFixed(1);
    el.dataset.dy = (o1[1] - o0[1]).toFixed(1);
    let html = '';
    g.cuboids.forEach(({ b: [x0, x1, y0, y1, z0, z1], cls, seams }) => {
      const c = cls ? ` class="${cls}"` : '';
      html += `<polygon${c} points="${poly([P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)])}"/>`;
      html += `<polygon${c} points="${poly([P(x0, y0, z0), P(x0, y1, z0), P(x0, y1, z1), P(x0, y0, z1)])}"/>`;
      html += `<polygon${c} points="${poly([P(x0, y0, z0), P(x1, y0, z0), P(x1, y0, z1), P(x0, y0, z1)])}"/>`;
      // Стыки досок на видимой грани.
      if(seams){
        for(let i = 1; i < seams.n; i++){
          const k = i / seams.n;
          let a, bb;
          if(seams.face === 'top'){ const y = y0 + (y1 - y0) * k; a = P(x0, y, z1); bb = P(x1, y, z1); }
          else if(seams.face === 'y0'){ const z = z0 + (z1 - z0) * k; a = P(x0, y0, z); bb = P(x1, y0, z); }
          else { const z = z0 + (z1 - z0) * k; a = P(x0, y0, z); bb = P(x0, y1, z); }
          html += `<line class="seam" x1="${f(a[0])}" y1="${f(a[1])}" x2="${f(bb[0])}" y2="${f(bb[1])}"/>`;
        }
      }
    });
    el.innerHTML = html;
    svg.appendChild(el);
    els.push(el);
  });
  return els;
}

function lpAnimateBox(){
  const svg = document.getElementById('lpBox');
  if(!svg) return;
  const els = lpBuildBox(svg);
  const legend = [...document.querySelectorAll('#lpLegend li')];
  const setStep = (el, assembled) => {
    el.style.transform = assembled ? 'translate(0px, 0px)' : `translate(${el.dataset.dx}px, ${el.dataset.dy}px)`;
    el.style.opacity = assembled ? '1' : '0';
  };
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(reduce){ els.forEach(el => setStep(el, true)); return; }
  let timer = null;
  const run = () => {
    els.forEach(el => { el.classList.add('lp-instant'); setStep(el, false); });
    legend.forEach(li => li.classList.remove('active', 'done'));
    void svg.getBoundingClientRect();
    els.forEach(el => el.classList.remove('lp-instant'));
    let step = 0;
    const next = () => {
      step += 1;
      if(step > 4){ timer = setTimeout(explode, 2600); return; }
      els.filter(el => +el.dataset.step === step).forEach(el => { setStep(el, true); el.classList.add('lp-hl'); });
      legend.forEach(li => { const s = +li.dataset.step; li.classList.toggle('active', s === step); li.classList.toggle('done', s < step); });
      setTimeout(() => els.forEach(el => el.classList.remove('lp-hl')), 700);
      timer = setTimeout(next, 900);
    };
    timer = setTimeout(next, 500);
  };
  const explode = () => {
    legend.forEach(li => { li.classList.remove('active'); li.classList.add('done'); });
    els.forEach(el => setStep(el, false));
    timer = setTimeout(run, 900);
  };
  run();
  // Вкладка скрыта - анимация не крутится зря.
  document.addEventListener('visibilitychange', () => {
    if(document.hidden){ clearTimeout(timer); }
    else { clearTimeout(timer); run(); }
  });
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
    + '<div class="lp-type lp-type-soon"><div class="lp-type-img"><span>ГОСТ 2991-85</span></div><span>В работе</span></div>';
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

lpAnimateBox();
lpRenderTypes();
lpRenderPlans();
