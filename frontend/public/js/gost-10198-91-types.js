// Страница ГОСТ 10198-91 (gost-10198-91.html): карточки типов ящиков.
const TYPES = [
  {
    name: 'Тип I-1',
    file: 'i1.html',
    image: '/images/box_i1.jpg'
  },
  {
    name: 'Тип I-2',
    file: 'i2.html',
    image: '/images/box_i2.png'
  },
  {
    name: 'Тип I-3',
    file: 'i3-skid.html',
    image: '/images/box.png'
  },
  {
    name: 'Тип I-4',
    file: 'i4.html',
    image: '/images/box_i4.png'
  },
  {
    name: 'Тип II-1',
    versions: { key: 'gost10198-ii1-version', gost: 'ii1.html', opt: 'ii1n.html' },
    image: '/images/box_ii1.png'
  },
  {
    name: 'Тип II-2',
    versions: { key: 'gost10198-ii2-version', gost: 'ii2.html', opt: 'ii2n.html' },
    image: '/images/box_ii2.png'
  },
  {
    name: 'Тип III-1',
    versions: { key: 'gost10198-iii1-version', gost: 'iii1.html', opt: 'iii1-opt.html' },
    image: '/images/box_iii1.png'
  }
];

(function(){
  const root = document.getElementById('types');
  let html = '';
  // У типа с двумя версиями (versions: по ГОСТ / оптимальная, переключатель
  // на странице расчёта) карточка ведёт на последнюю выбранную, по
  // умолчанию - на оптимальную (по указанию пользователя).
  const versionFile = v => { let saved = null; try{ saved = localStorage.getItem(v.key); }catch(e){} return saved === 'gost' ? v.gost : v.opt; };
  TYPES.forEach(t => {
    if(t.versions) t.file = versionFile(t.versions);
    const badgeClass = 'type-badge' + (t.badgeDanger ? ' type-badge-danger' : t.badgeOk ? ' type-badge-ok' : '');
    const badge = t.badge ? `<span class="${badgeClass}">${t.badge}</span>` : '';
    html += `<a class="type-card" href="${t.file}">
      ${badge}
      <div class="type-info"><h3>${t.name}</h3></div>
      <div class="type-image"><img src="${t.image}" alt="${t.name}"></div>
    </a>`;
  });
  root.innerHTML = html;
})();
