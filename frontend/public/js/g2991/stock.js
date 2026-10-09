// ГОСТ 2991-85: выпадающие списки «в наличии» (толщины, ширины) на
// страницах типов. Свой выбор у типа (storageKey в localStorage), а пока его
// не меняли - общий из окна «Настройки», раздел «ГОСТ 2991-85»
// (siteStockList в common-settings.js). Разметка списка:
//   <div class="dropdown-wrap"><button id="<id>Btn"><span id="<id>Label">
//   ...</button><div class="thickness-dropdown-panel" id="<id>Panel"></div>
//   </div><div class="note" id="<id>Note"></div>
// makeStockPicker({ id, storageKey, options, siteList, what, onChange }) ->
// { get() } - выбранные значения по возрастанию.
function makeStockPicker(cfg){
  const $ = s => document.getElementById(cfg.id + s);
  let fromSite = false;
  const load = () => {
    try{
      const raw = localStorage.getItem(cfg.storageKey);
      fromSite = !raw;
      const arr = raw ? JSON.parse(raw) : siteStockList(cfg.siteList);
      return arr.filter(v => cfg.options.includes(v)).sort((a, b) => a - b);
    }catch(e){ return []; }
  };
  let selected = load();
  const save = () => {
    try{ localStorage.setItem(cfg.storageKey, JSON.stringify(selected)); }catch(e){}
    fromSite = false;
  };
  const changed = () => { updateLabel(); if(cfg.onChange) cfg.onChange(); };
  function buildList(){
    $('Panel').innerHTML = `<div class="thickness-dropdown-actions">
        <button type="button" class="btn-secondary" data-all="1">Выбрать все</button>
        <button type="button" class="btn-secondary" data-all="0">Снять все</button>
      </div>
      <div class="thickness-checkbox-list">${cfg.options.map(v =>
        `<label><input type="checkbox" value="${v}"${selected.includes(v) ? ' checked' : ''}> ${v} мм</label>`).join('')}</div>`;
  }
  function updateLabel(){
    const label = $('Label'), note = $('Note'), total = cfg.options.length;
    if(!selected.length){
      label.textContent = `${cfg.what} не выбраны - расчёт строго по ГОСТ`;
      note.innerHTML = `⚠ ${cfg.what} «в наличии» не выбраны - расчёт по ГОСТ 2991-85 без округления.`;
      note.style.display = 'block';
    } else {
      label.textContent = selected.length === total
        ? `Выбраны все (${cfg.options[0]}-${cfg.options[total - 1]} мм)`
        : `Выбрано (${selected.length}): ${selected.slice(0, 8).join(', ')} мм${selected.length > 8 ? `, ещё ${selected.length - 8} знач.` : ''}`;
      note.style.display = 'none';
    }
    if(fromSite) label.textContent += ' (общие настройки)';
  }
  $('Btn').addEventListener('click', () => $('Panel').classList.toggle('open'));
  $('Panel').addEventListener('click', e => {
    const b = e.target.closest('[data-all]');
    if(!b) return;
    selected = b.dataset.all === '1' ? cfg.options.slice() : [];
    save(); buildList(); changed();
  });
  $('Panel').addEventListener('change', e => {
    if(e.target.type !== 'checkbox') return;
    selected = Array.from($('Panel').querySelectorAll('input:checked')).map(i => parseInt(i.value, 10)).sort((a, b) => a - b);
    save(); changed();
  });
  // Общий выбор поменяли в «Настройках» - тип, который берёт его, обновляется.
  window.addEventListener('site-thickness-change', e => {
    if(!fromSite || (e.detail && e.detail.list !== cfg.siteList)) return;
    selected = load(); buildList(); changed();
  });
  buildList(); updateLabel();
  return { get: () => selected.slice() };
}
// Клик мимо выпадающего списка закрывает его.
document.addEventListener('click', e => {
  document.querySelectorAll('.dropdown-wrap').forEach(wrap => {
    if(!wrap.contains(e.target)){
      const p = wrap.querySelector('.thickness-dropdown-panel');
      if(p) p.classList.remove('open');
    }
  });
});
// Разметка выпадающего списка «в наличии» (карточка с заголовком).
function stockPickerCardHtml(id, title){
  return `<h2>${title}</h2>
    <div class="thickness-filter dropdown-wrap">
      <button type="button" class="thickness-dropdown-btn" id="${id}Btn"><span id="${id}Label">-</span><span class="thickness-dropdown-arrow">▾</span></button>
      <div class="thickness-dropdown-panel" id="${id}Panel"></div>
    </div>
    <div class="note" id="${id}Note" style="display:none;margin-top:14px;"></div>`;
}
