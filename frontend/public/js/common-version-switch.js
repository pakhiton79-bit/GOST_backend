// Переключатель версий типа (II-1, II-2, III-1; по указанию пользователя): на
// странице расчёта - две кнопки-ссылки «Оптимальный» / «По ГОСТ»
// (#versionSwitch, data-key - ключ localStorage, у ссылок data-version).
// Текущая - по имени файла страницы; открытая версия запоминается, и
// карточка типа в списке ведёт на последнюю выбранную (по умолчанию -
// оптимальную). Введённые данные между версиями не переносятся.
(function(){
  const el = document.getElementById('versionSwitch');
  if(!el) return;
  const key = el.getAttribute('data-key');
  const page = decodeURIComponent(location.pathname.split('/').pop() || '');
  const save = v => { try{ localStorage.setItem(key, v); }catch(e){} };
  // «?» у оптимальной версии (пояснение в data-tip): нажатие не открывает
  // версию, а показывает/скрывает пояснение; нажатие мимо - скрывает.
  el.addEventListener('click', e => {
    const info = e.target.closest('.version-info');
    el.querySelectorAll('.version-info.open').forEach(i => { if(i !== info) i.classList.remove('open'); });
    if(!info) return;
    e.preventDefault();
    e.stopPropagation();
    info.classList.toggle('open');
  }, true);
  document.addEventListener('click', e => {
    if(!e.target.closest('.version-info')) el.querySelectorAll('.version-info.open').forEach(i => i.classList.remove('open'));
  });
  el.querySelectorAll('a[data-version]').forEach(a => {
    if(a.getAttribute('href') === page){
      a.classList.add('active');
      a.setAttribute('aria-current', 'page');
      save(a.getAttribute('data-version'));
    }
    a.addEventListener('click', () => save(a.getAttribute('data-version')));
  });
  // Подложка выбранной версии переезжает к нажатой кнопке, потом переход
  // (микроанимация, стили - .version-pill в style.css).
  el.addEventListener('click', e => {
    const a = e.target.closest('a[data-version]');
    const cur = el.querySelector('a.active');
    if(!a || !cur || a === cur || e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    if(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    e.preventDefault();
    const box = el.getBoundingClientRect(), r0 = cur.getBoundingClientRect(), r1 = a.getBoundingClientRect();
    const pill = document.createElement('span');
    pill.className = 'version-pill';
    const place = r => { pill.style.transform = `translate(${r.left - box.left - el.clientLeft}px,${r.top - box.top - el.clientTop}px)`; pill.style.width = r.width + 'px'; pill.style.height = r.height + 'px'; };
    place(r0);
    el.prepend(pill);
    el.classList.add('version-moving');
    cur.classList.remove('active');
    void pill.offsetWidth;
    a.classList.add('active');
    place(r1);
    setTimeout(() => { location.href = a.href; }, 260);
  });
  // Возврат кнопкой «Назад» (страница из кэша браузера) - подложку убрать.
  window.addEventListener('pageshow', e => {
    if(!e.persisted) return;
    el.classList.remove('version-moving');
    el.querySelectorAll('.version-pill').forEach(p => p.remove());
    el.querySelectorAll('a[data-version]').forEach(x => x.classList.toggle('active', x.getAttribute('href') === page));
  });
})();
