// Страница выбора ГОСТа (gosts.html): список ГОСТов.
const GOSTS = [
  {
    gost: 'ГОСТ 10198-91',
    title: 'Ящики дощатые неразборные для грузов массой до 3000 кг',
    file: 'gost-10198-91.html'
  },
  {
    gost: 'ГОСТ 2991-85',
    title: 'Ящики дощатые неразборные для грузов массой до 500 кг',
    file: 'gost-2991-85.html'
  }
];

(function(){
  const root = document.getElementById('gosts');
  if(!GOSTS.length){
    root.innerHTML = '<div class="card"><span class="empty-note">ГОСТы ещё не добавлены.</span></div>';
    return;
  }
  let html = '<div class="gost-list">';
  GOSTS.forEach(g => {
    const badge = g.badge ? `<span class="gost-badge">${g.badge}</span>` : '';
    // Без file - ГОСТ в работе: карточка не ссылка.
    if(!g.file){
      html += `<div class="gost-link gost-link-off" aria-disabled="true">${badge}<div class="gost-name">${g.gost}</div></div>`;
      return;
    }
    html += `<a class="gost-link" href="${g.file}">
      ${badge}<div class="gost-name">${g.gost}</div>
      <span class="arrow">→</span>
    </a>`;
  });
  html += '</div>';
  root.innerHTML = html;
})();
