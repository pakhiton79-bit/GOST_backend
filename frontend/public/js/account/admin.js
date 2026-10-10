// Администрирование (admin.html): статистика (плитки, расчёты и регистрации
// по дням, расчёты по типам ящиков, таблица по дням) и аккаунты (смена
// подписки, удаление). Доступ проверяет сервер (ADMIN_EMAILS).
const $ = id => document.getElementById(id);
const fmtDate = iso => new Date(iso).toLocaleDateString('ru-RU');
const fmtNum = n => Number(n).toLocaleString('ru-RU');
const dayLabel = key => key.slice(8, 10) + '.' + key.slice(5, 7);           // 2026-10-05 -> 05.10
let adminData = null, statsData = null, reqData = null, repData = null;

function showMsg(text, ok){
  const m = $('adminMsg');
  m.hidden = !text;
  m.textContent = text || '';
  m.className = 'auth-msg ' + (ok ? 'auth-msg-ok' : 'auth-msg-error');
}
function el(tag, cls, text){
  const e = document.createElement(tag);
  if(cls) e.className = cls;
  if(text !== undefined) e.textContent = text;
  return e;
}

// ---------- Статистика ----------
function renderTiles(t){
  const tiles = [
    ['Аккаунтов', t.users, t.unverified ? `не подтвердили почту: ${t.unverified}` : 'все подтвердили почту'],
    ['Платных подписок', (t.byPlan.base || 0) + t.byPlan.pro + t.byPlan.team, `Пробная ${t.byPlan.free} · Base ${t.byPlan.base || 0} · Pro ${t.byPlan.pro} · Team ${t.byPlan.team}`],
    ['Расчётов сегодня', t.calcsToday, `за 7 дней: ${fmtNum(t.calcs7)}`],
    ['Расчётов за 30 дней', t.calcs30, `всего: ${fmtNum(t.calcsAll)}`],
    ['Считали за 7 дней', t.active7, `за 30 дней: ${t.active30}`],
    ['Регистраций за 7 дней', t.regs7, `за 30 дней: ${t.regs30}`],
  ];
  const box = $('adminTiles');
  box.innerHTML = '';
  tiles.forEach(([label, value, sub]) => {
    const tile = el('div', 'admin-tile');
    tile.append(el('div', 'admin-tile-label', label), el('div', 'admin-tile-value', fmtNum(value)), el('div', 'admin-tile-sub', sub));
    box.appendChild(tile);
  });
}

// «Круглая» верхняя граница оси и шаг делений (1, 2, 5 × 10^n).
function niceScale(max){
  const m = Math.max(max, 4);
  const raw = m / 4, pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 5, 10].map(k => k * pow).find(s => s >= raw);
  return { top: Math.ceil(m / step) * step, step };
}

// Столбчатая диаграмма по дням: одна величина, столбцы не толще 24px со
// скруглённым верхом, тонкая сетка, подпись только у максимума; при
// наведении и фокусе - подсказка с датой и значением.
function columnChart(box, rows, key, unit){
  const W = Math.max(280, box.clientWidth), H = box.classList.contains('admin-chart-small') ? 180 : 240;
  const m = { l: 36, r: 8, t: 22, b: 26 };
  const pw = W - m.l - m.r, ph = H - m.t - m.b;
  const { top, step } = niceScale(Math.max(...rows.map(r => r[key])));
  const slot = pw / rows.length, bw = Math.max(2, Math.min(24, slot - 2));
  const y = v => m.t + ph - v / top * ph;
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H);
  svg.setAttribute('class', 'admin-svg'); svg.setAttribute('role', 'img');
  const mk = (tag, attrs, text) => { const e = document.createElementNS(NS, tag); Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v)); if(text !== undefined) e.textContent = text; svg.appendChild(e); return e; };
  for(let v = 0; v <= top; v += step){
    mk('line', { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), class: 'admin-grid' });
    mk('text', { x: m.l - 6, y: y(v) + 4, 'text-anchor': 'end', class: 'admin-axis' }, fmtNum(v));
  }
  const maxV = Math.max(...rows.map(r => r[key]));
  const maxI = maxV > 0 ? rows.map(r => r[key]).lastIndexOf(maxV) : -1;
  const labelEvery = Math.ceil(rows.length / Math.max(1, Math.floor(pw / 46)));
  rows.forEach((r, i) => {
    const cx = m.l + slot * i + slot / 2, v = r[key];
    if((rows.length - 1 - i) % labelEvery === 0){
      const edge = cx + 16 > W;                                      // крайняя справа - прижать к краю
      mk('text', { x: edge ? W - 1 : cx, y: H - 8, 'text-anchor': edge ? 'end' : 'middle', class: 'admin-axis' }, dayLabel(r.date));
    }
    if(v > 0){
      const x0 = cx - bw / 2, y0 = y(v), yb = y(0), rad = Math.min(4, bw / 2, yb - y0);
      mk('path', { class: 'admin-bar', 'data-i': i, d: `M${x0},${yb} V${y0 + rad} Q${x0},${y0} ${x0 + rad},${y0} H${x0 + bw - rad} Q${x0 + bw},${y0} ${x0 + bw},${y0 + rad} V${yb} Z` });
    }
    if(i === maxI) mk('text', { x: cx, y: y(v) - 6, 'text-anchor': 'middle', class: 'admin-value' }, fmtNum(v));
    const hit = mk('rect', { x: m.l + slot * i, y: m.t, width: slot, height: ph, class: 'admin-hit', tabindex: 0, 'aria-label': `${fmtDate(r.date)}: ${v} ${unit}` });
    const show = () => { svg.querySelectorAll('.admin-bar').forEach(b => b.classList.toggle('admin-bar-dim', b.dataset.i != i)); showTip(hit, fmtNum(v), `${unit}, ${fmtDate(r.date)}`); };
    hit.addEventListener('pointerenter', show); hit.addEventListener('focus', show);
    const hide = () => { svg.querySelectorAll('.admin-bar').forEach(b => b.classList.remove('admin-bar-dim')); $('chartTip').hidden = true; };
    hit.addEventListener('pointerleave', hide); hit.addEventListener('blur', hide);
  });
  mk('line', { x1: m.l, x2: W - m.r, y1: y(0), y2: y(0), class: 'admin-baseline' });
  box.innerHTML = '';
  box.appendChild(svg);
}

function showTip(target, value, label){
  const tip = $('chartTip');
  tip.innerHTML = '';
  tip.append(el('b', '', value), el('span', '', label));
  tip.hidden = false;
  const r = target.getBoundingClientRect();
  tip.style.left = Math.min(window.innerWidth - tip.offsetWidth - 8, Math.max(8, r.left + r.width / 2 - tip.offsetWidth / 2)) + 'px';
  tip.style.top = Math.max(8, r.top - tip.offsetHeight - 6) + 'px';
}

function renderTypeBars(list){
  const box = $('typeBars');
  box.innerHTML = '';
  const max = Math.max(1, ...list.map(t => t.calcs));
  list.forEach(t => {
    const row = el('div', 'admin-hbar');
    const track = el('div', 'admin-hbar-track');
    const fill = el('div', 'admin-hbar-fill');
    fill.style.width = (t.calcs / max * 100) + '%';
    track.appendChild(fill);
    row.append(el('div', 'admin-hbar-name', t.name), track, el('div', 'admin-hbar-val', fmtNum(t.calcs)));
    box.appendChild(row);
  });
}

function renderStats(){
  if(!statsData) return;
  renderTiles(statsData.totals);
  columnChart($('chartCalcs'), statsData.daily, 'calcs', 'расчётов');
  columnChart($('chartRegs'), statsData.daily, 'regs', 'регистраций');
  renderTypeBars(statsData.byType);
  const tb = $('dailyRows');
  tb.innerHTML = '';
  statsData.daily.slice().reverse().forEach(r => {
    const tr = el('tr');
    tr.append(el('td', '', fmtDate(r.date)), el('td', '', fmtNum(r.calcs)), el('td', '', fmtNum(r.regs)));
    tb.appendChild(tr);
  });
}

// ---------- Аккаунты ----------
function esc(s){ return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

// Выпадающий список в стиле сайта - uiSelect (js/account/ui-select.js).

// Срок платной подписки (1 или 3 месяца по 30 дней). Пробная - бессрочная:
// вместо списка срока - «бессрочно» (переключается при выборе подписки).
// В строке выбран срок текущей подписки (planMonths с сервера).
function termOptions(){
  return (adminData.terms || [1, 3]).map(m => ({ id: String(m), name: m + ' мес.' }));
}

function renderUsers(){
  const q = $('adminSearch').value.trim().toLowerCase();
  const rows = adminData.users.filter(u => !q || u.email.includes(q));
  $('adminRows').innerHTML = rows.map(u => {
    const seen = u.lastSeen ? 'вход ' + fmtDate(u.lastSeen) : 'входов нет';
    return `<tr data-email="${esc(u.email)}">
      <td>${esc(u.email)}${u.self ? ' <span class="admin-tag admin-tag-you">вы</span>' : ''}${u.verified ? '' : ' <span class="admin-tag">не подтверждена</span>'}${u.marketing ? ' <span class="admin-tag admin-tag-ok">рассылки</span>' : ''}${u.autoRenew ? ' <span class="admin-tag admin-tag-ok">автопродление</span>' : ''}${u.blocked ? ' <span class="admin-tag admin-tag-blocked">заблокирован</span>' : ''}<div class="admin-sub">с ${fmtDate(u.createdAt)}</div>${u.blocked ? `<div class="admin-sub">заблокирован ${fmtDate(u.blocked.at)}${u.blocked.reason ? ': ' + esc(u.blocked.reason) : ''}</div>` : ''}</td>
      <td><div class="admin-plan-pick">${uiSelect(adminData.plans, u.quota.plan, 'Подписка ' + u.email)}<span class="admin-term"${u.quota.plan === 'free' ? ' hidden' : ''}>${uiSelect(termOptions(), String(u.planMonths || (adminData.terms || [1])[0]), 'Срок подписки ' + u.email)}</span><span class="admin-term-none"${u.quota.plan === 'free' ? '' : ' hidden'}>бессрочно</span></div><div class="admin-sub">с ${fmtDate(u.planSince)}${u.quota.planUntil ? ' до ' + fmtDate(u.quota.planUntil) : ''}</div></td>
      <td>${u.quota.monthly ? `${u.quota.used} из ${fmtNum(u.quota.monthly)}` : 'без месячных'}${u.quota.welcomeLeft > 0 ? `<div class="admin-sub">бонус ${u.quota.welcomeLeft}</div>` : ''}${u.quota.extraLeft > 0 ? `<div class="admin-sub">выдано, осталось ${fmtNum(u.quota.extraLeft)}</div>` : ''}<div class="admin-sub">всего ${fmtNum(u.totalCalcs)}</div><div class="admin-grant"><input type="number" class="admin-grant-count" min="1" max="100000" step="1" placeholder="0" aria-label="Сколько расчётов выдать ${esc(u.email)}"><button type="button" class="btn-secondary admin-grant-btn">Выдать</button></div></td>
      <td>${u.lastCalcAt ? 'расчёт ' + fmtDate(u.lastCalcAt) : 'расчётов нет'}<div class="admin-sub">${seen}</div></td>
      <td>${u.devices} из ${u.quota.devices}</td>
      <td><div class="admin-actions"><button type="button" class="btn-secondary admin-save">Сохранить</button>${u.blocked ? '<button type="button" class="btn-secondary admin-unblock">Разблокировать</button>' : `<button type="button" class="btn-secondary admin-block"${u.self ? ' disabled title="Свой аккаунт заблокировать нельзя"' : ''}>Заблокировать</button>`}<button type="button" class="btn-secondary admin-delete"${u.self ? ' disabled title="Свой аккаунт удалить нельзя"' : ''}>Удалить</button></div></td>
    </tr>`;
  }).join('') || '<tr><td colspan="6" class="admin-empty">Аккаунтов нет</td></tr>';
}

// Заявки на внутренние стандарты (форма «Свой стандарт», standards.js).
function renderRequests(){
  const list = reqData.requests || [];
  $('reqCount').textContent = list.length ? `(${list.length})` : '';
  const planName = id => (adminData.plans.find(p => p.id === id) || {}).name || id;
  $('reqRows').innerHTML = list.map(r => `<tr>
      <td>${fmtDate(r.at)}</td>
      <td><a href="mailto:${esc(r.userEmail)}">${esc(r.userEmail)}</a>${r.priority ? ' <span class="admin-tag admin-tag-priority">приоритет</span>' : ''}<div class="admin-sub">${esc(planName(r.plan))}</div></td>
      <td>${esc(r.company)}<div class="admin-sub">${esc(r.standard)}</div></td>
      <td class="admin-req-details">${esc(r.details)}</td>
    </tr>`).join('') || '<tr><td colspan="4" class="admin-empty">Заявок пока нет</td></tr>';
}

const planNameOf = id => ((adminData && adminData.plans.find(p => p.id === id)) || {}).name || id;
// Сообщения об ошибках (кнопка «Сообщить об ошибке», feedback.js). Pro и
// Team (приоритетное обслуживание) - первыми, с пометкой.
function renderReports(){
  const list = repData.reports || [];
  $('repCount').textContent = list.length ? `(${list.length})` : '';
  const dims = i => i ? `${i.L || '-'} × ${i.W || '-'} × ${i.H || '-'} мм<div class="admin-sub">${i.M ? i.M + ' кг' : ''}</div>` : '<span class="admin-sub">не приложены</span>';
  $('repRows').innerHTML = list.map(r => `<tr>
      <td>${fmtDate(r.at)}</td>
      <td>${r.userEmail ? `<a href="mailto:${esc(r.userEmail)}">${esc(r.userEmail)}</a>` : '<span class="admin-sub">гость</span>'}${r.priority ? ' <span class="admin-tag admin-tag-priority">приоритет</span>' : ''}${r.plan ? `<div class="admin-sub">${esc(planNameOf(r.plan))}</div>` : ''}</td>
      <td>${esc(r.gost)}<div class="admin-sub">${esc(r.type)}</div><div class="admin-sub">${esc(r.page)}</div></td>
      <td>${dims(r.inputs)}</td>
      <td class="admin-req-details">${esc(r.description)}</td>
    </tr>`).join('') || '<tr><td colspan="5" class="admin-empty">Сообщений пока нет</td></tr>';
}

async function api(path, body){
  const r = await fetch('/api/admin/' + path, body ? { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { credentials: 'same-origin' });
  const d = await r.json();
  if(!r.ok){ const e = new Error(d.error || 'Ошибка сервера.'); e.status = r.status; throw e; }
  return d;
}

async function load(){
  try{
    [adminData, statsData, reqData, repData] = await Promise.all([api('users'), api('stats'), api('requests'), api('reports')]);
  }catch(e){
    if(e.status === 403 && !(await fetchAccountUser())) return location.replace('login.html?next=admin.html');
    return showMsg(e.message);
  }
  $('adminBox').hidden = false;
  renderStats();
  renderReports();
  renderRequests();
  renderUsers();
}

$('adminSearch').addEventListener('input', renderUsers);
$('adminRows').addEventListener('ui-select-change', e => {
  const pick = e.target.closest('.admin-plan-pick');
  if(!pick || e.target !== pick.querySelector('.ui-select')) return;
  const free = e.target.dataset.value === 'free';
  pick.querySelector('.admin-term').hidden = free;
  pick.querySelector('.admin-term-none').hidden = !free;
});
$('adminRows').addEventListener('keydown', e => {
  if(e.key === 'Enter' && e.target.classList.contains('admin-grant-count')) e.target.closest('tr').querySelector('.admin-grant-btn').click();
});
$('adminRows').addEventListener('click', async e => {
  const btn = e.target.closest('.admin-save, .admin-delete, .admin-block, .admin-unblock, .admin-grant-btn');
  if(!btn || btn.disabled) return;
  const tr = btn.closest('tr'), email = tr.dataset.email;
  if(btn.classList.contains('admin-delete') && !window.confirm(`Удалить аккаунт ${email}? Его подписка, счётчики и входы будут удалены без возможности восстановления.`)) return;
  // Блокировка: причина (можно пустую) - её увидит пользователь при попытке войти.
  let reason = '';
  if(btn.classList.contains('admin-block')){
    reason = window.prompt(`Заблокировать ${email}? Вход и расчёты будут запрещены, входы на всех устройствах завершатся.\n\nПричина (её увидит пользователь при входе, можно оставить пустой):`, '');
    if(reason === null) return;
  }
  if(btn.classList.contains('admin-unblock') && !window.confirm(`Разблокировать ${email}?`)) return;
  let count = 0;
  if(btn.classList.contains('admin-grant-btn')){
    count = Number(tr.querySelector('.admin-grant-count').value);
    if(!Number.isInteger(count) || count < 1) return showMsg('Укажите, сколько расчётов выдать (целое число от 1).');
    if(!window.confirm(`Выдать ${email} ${fmtNum(count)} расч. сверх подписки? Они не сгорают.`)) return;
  }
  btn.disabled = true;
  try{
    if(btn.classList.contains('admin-grant-btn')){
      const d = await api('calcs', { email, count });
      showMsg(`${email}: выдано ${fmtNum(count)}, дополнительных расчётов теперь ${fmtNum(d.quota.extraLeft)}.`, true);
    } else if(btn.classList.contains('admin-block')){
      await api('block', { email, reason });
      showMsg(`Аккаунт ${email} заблокирован.`, true);
    } else if(btn.classList.contains('admin-unblock')){
      await api('unblock', { email });
      showMsg(`Аккаунт ${email} разблокирован.`, true);
    } else if(btn.classList.contains('admin-save')){
      const [planSel, termSel] = tr.querySelectorAll('.ui-select');
      const plan = planSel.dataset.value;
      const d = await api('plan', plan === 'free' ? { email, plan } : { email, plan, months: Number(termSel.dataset.value) });
      showMsg(`${email}: подписка ${d.quota.planName} с этого момента${d.quota.planUntil ? ' до ' + fmtDate(d.quota.planUntil) : ''}.`, true);
    } else {
      await api('delete', { email });
      showMsg(`Аккаунт ${email} удалён.`, true);
    }
    await load();
  }catch(err){ showMsg(err.message); btn.disabled = false; }
});
let resizeTimer = null;
window.addEventListener('resize', () => { closeSelects(); clearTimeout(resizeTimer); resizeTimer = setTimeout(renderStats, 150); });
window.addEventListener('scroll', () => { $('chartTip').hidden = true; }, { passive: true });

load();
