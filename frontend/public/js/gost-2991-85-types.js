// Страница ГОСТ 2991-85 (gost-2991-85.html): карточки типов ящиков.
const TYPES = [
  // Тип I пока закрыт (по указанию пользователя): страница g2991-i.html
  // остаётся, карточка не нажимается.
  {
    name: 'Тип I',
    image: '/images/box_g2991_i.png',
    badge: 'Появится позже',
    badgeSoon: true
  },
  {
    name: 'Тип II-1',
    file: 'g2991-ii1.html',
    image: '/images/box_g2991_ii1.png',
    badge: 'Возможны неточности'
  },
  { name: 'Тип II-2', badge: 'Появится позже', badgeSoon: true },
  { name: 'Тип III-1', badge: 'Появится позже', badgeSoon: true },
  { name: 'Тип III-2', badge: 'Появится позже', badgeSoon: true },
  { name: 'Тип V-1', badge: 'Появится позже', badgeSoon: true },
  { name: 'Тип V-2', badge: 'Появится позже', badgeSoon: true },
  { name: 'Тип VI-1', badge: 'Появится позже', badgeSoon: true },
  { name: 'Тип VI-2', badge: 'Появится позже', badgeSoon: true }
  // Тип IV (лотки) не делается (по указанию пользователя).
];

(function(){
  const root = document.getElementById('types');
  let html = '';
  TYPES.forEach(t => {
    const badgeClass = 'type-badge' + (t.badgeDanger ? ' type-badge-danger' : t.badgeOk ? ' type-badge-ok' : t.badgeSoon ? ' type-badge-soon' : '');
    const badge = t.badge ? `<span class="${badgeClass}">${t.badge}</span>` : '';
    const inner = `${badge}
      <div class="type-info"><h3>${t.name}</h3></div>
      ${t.image ? `<div class="type-image"><img src="${t.image}" alt="${t.name}"></div>` : ''}`;
    // Без file - типа ещё нет: карточка не нажимается.
    html += t.file ? `<a class="type-card" href="${t.file}">${inner}</a>`
      : `<div class="type-card type-card-off" aria-disabled="true">${inner}</div>`;
  });
  root.innerHTML = html;
})();
