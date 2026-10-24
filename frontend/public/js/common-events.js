// Обработчики событий из разметки без встроенного JavaScript (по указанию
// пользователя, после аудита безопасности: заголовок CSP запрещает
// встроенные скрипты - атрибуты onclick/onchange/oninput браузер не
// выполняет). Вместо data-onclick="f(a, b)" в разметке - data-onclick="f(a, b)"
// (так же data-onchange, data-oninput): вызывается глобальная функция f с
// аргументами-литералами (true, false, null, числа, 'строки') и this
// (элемент) / event. Произвольный код из разметки не выполняется.
// Обработчик срабатывает в фазе перехвата - раньше остальных обработчиков
// элемента, как и встроенный атрибут.
// data-history-back у ссылки «Назад»: пришли с другой страницы этого сайта -
// шаг назад по истории, иначе переход по href.
(function(){
  const ARG = /^(?:true|false|null|this|event|-?\d+(?:\.\d+)?|'[^']*')$/;
  const cache = new Map();
  function parse(src){
    if(cache.has(src)) return cache.get(src);
    const m = /^\s*([A-Za-z_$][\w$]*)\((.*)\)\s*;?\s*$/.exec(src);
    const args = m && m[2].trim() ? m[2].split(',').map(s => s.trim()) : [];
    const p = m && args.every(a => ARG.test(a)) ? { fn: m[1], args } : null;
    cache.set(src, p);
    return p;
  }
  function value(a, el, e){
    if(a === 'this') return el;
    if(a === 'event') return e;
    if(a === 'true') return true;
    if(a === 'false') return false;
    if(a === 'null') return null;
    return a[0] === "'" ? a.slice(1, -1) : Number(a);
  }
  function run(el, attr, e){
    const src = el.getAttribute(attr), p = parse(src);
    const f = p && window[p.fn];
    if(typeof f !== 'function'){ console.error(`[события] не выполнено ${attr}="${src}"`); return; }
    f.apply(el, p.args.map(a => value(a, el, e)));
  }
  ['click', 'change', 'input'].forEach(type => {
    const attr = 'data-on' + type;
    document.addEventListener(type, e => {
      for(const n of e.composedPath()){
        if(n === document) break;
        if(n.nodeType === 1 && n.hasAttribute(attr)) run(n, attr, e);
      }
    }, true);
  });
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[data-history-back]');
    if(a && document.referrer.indexOf(location.origin + '/') === 0 && history.length > 1){ e.preventDefault(); history.back(); }
  });
})();
