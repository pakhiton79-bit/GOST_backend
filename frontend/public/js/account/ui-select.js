// Выпадающий список в стиле сайта (по указанию пользователя: раскрытый список
// браузерного <select> оформить нельзя, поэтому на сайте только этот список -
// в админке, в окне «Сообщить об ошибке» и во всех новых формах). Кнопка +
// список вариантов; значение - в data-value, при выборе - событие
// «ui-select-change» на .ui-select. Клавиатура: стрелки, Enter, Esc.
// Оформление - .ui-select* в account.css.
const uiEsc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function uiSelect(options, value, label){
  const cur = options.find(o => o.id === value) || options[0];
  return `<div class="ui-select" data-value="${uiEsc(cur.id)}">
      <button type="button" class="ui-select-btn" aria-haspopup="listbox" aria-expanded="false" aria-label="${uiEsc(label)}"><span>${uiEsc(cur.name)}</span></button>
      <ul class="ui-select-list" role="listbox" hidden>${options.map(o => `<li role="option" tabindex="-1" data-value="${uiEsc(o.id)}" aria-selected="${o.id === cur.id}">${uiEsc(o.name)}</li>`).join('')}</ul>
    </div>`;
}
function closeSelects(except){
  document.querySelectorAll('.ui-select-list:not([hidden])').forEach(l => {
    if(l.parentNode === except) return;
    l.hidden = true;
    l.parentNode.querySelector('.ui-select-btn').setAttribute('aria-expanded', 'false');
  });
}
function openSelect(sel){
  closeSelects(sel);
  const btn = sel.querySelector('.ui-select-btn'), list = sel.querySelector('.ui-select-list');
  const r = btn.getBoundingClientRect();
  list.hidden = false;
  list.style.minWidth = r.width + 'px';
  list.style.left = r.left + 'px';
  // Не помещается снизу - открыть вверх.
  const below = window.innerHeight - r.bottom;
  list.style.top = (below < list.offsetHeight + 8 ? r.top - list.offsetHeight - 4 : r.bottom + 4) + 'px';
  btn.setAttribute('aria-expanded', 'true');
  (list.querySelector('[aria-selected="true"]') || list.firstElementChild).focus({ preventScroll: true });
}
function chooseOption(li){
  const sel = li.closest('.ui-select');
  sel.dataset.value = li.dataset.value;
  sel.querySelector('.ui-select-btn span').textContent = li.textContent;
  sel.querySelectorAll('li').forEach(x => x.setAttribute('aria-selected', String(x === li)));
  closeSelects();
  sel.querySelector('.ui-select-btn').focus();
  sel.dispatchEvent(new CustomEvent('ui-select-change', { bubbles: true }));
}
document.addEventListener('click', e => {
  const btn = e.target.closest('.ui-select-btn');
  const li = e.target.closest('.ui-select-list li');
  if(li) return chooseOption(li);
  if(btn){
    const sel = btn.closest('.ui-select');
    return sel.querySelector('.ui-select-list').hidden ? openSelect(sel) : closeSelects();
  }
  closeSelects();
});
document.addEventListener('keydown', e => {
  const btn = e.target.closest && e.target.closest('.ui-select-btn');
  if(btn && (e.key === 'ArrowDown' || e.key === 'ArrowUp')){ e.preventDefault(); openSelect(btn.closest('.ui-select')); return; }
  const li = e.target.closest && e.target.closest('.ui-select-list li');
  if(!li) return;
  if(e.key === 'ArrowDown' || e.key === 'ArrowUp'){
    e.preventDefault();
    const items = [...li.parentNode.children], i = items.indexOf(li);
    items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length].focus({ preventScroll: true });
  } else if(e.key === 'Enter' || e.key === ' '){
    e.preventDefault(); chooseOption(li);
  } else if(e.key === 'Escape' || e.key === 'Tab'){
    closeSelects(); li.closest('.ui-select').querySelector('.ui-select-btn').focus();
  }
});
// Прокрутили страницу или таблицу - список закрывается (он привязан к месту кнопки).
window.addEventListener('scroll', e => { if(!(e.target.closest && e.target.closest('.ui-select-list'))) closeSelects(); }, { passive: true, capture: true });
