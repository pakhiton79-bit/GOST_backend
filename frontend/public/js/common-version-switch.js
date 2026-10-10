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
})();
