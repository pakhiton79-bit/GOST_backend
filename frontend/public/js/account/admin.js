// Администрирование (admin.html): аккаунты, их подписки и счётчики; смена
// подписки вручную (пока нет оплаты). Доступ проверяет сервер (ADMIN_EMAILS).
const $ = id => document.getElementById(id);
const fmtDate = iso => new Date(iso).toLocaleDateString('ru-RU');
let adminData = null;

function showMsg(text, ok){
  const m = $('adminMsg');
  m.hidden = !text;
  m.textContent = text || '';
  m.className = 'auth-msg ' + (ok ? 'auth-msg-ok' : 'auth-msg-error');
}

function esc(s){ return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

function render(){
  const q = $('adminSearch').value.trim().toLowerCase();
  const rows = adminData.users.filter(u => !q || u.email.includes(q));
  $('adminRows').innerHTML = rows.map(u => {
    const opts = adminData.plans.map(p => `<option value="${p.id}"${p.id === u.quota.plan ? ' selected' : ''}>${p.name}</option>`).join('');
    return `<tr data-email="${esc(u.email)}">
      <td>${esc(u.email)}${u.verified ? '' : ' <span class="admin-tag">не подтверждена</span>'}</td>
      <td>${fmtDate(u.createdAt)}</td>
      <td><select class="admin-plan">${opts}</select><div class="admin-sub">с ${fmtDate(u.planSince)}</div></td>
      <td>${u.quota.used} из ${u.quota.monthly}${u.quota.welcomeLeft > 0 ? `<div class="admin-sub">бонус ${u.quota.welcomeLeft}</div>` : ''}<div class="admin-sub">до ${fmtDate(u.quota.periodEnd)}</div></td>
      <td>${u.devices} из ${u.quota.devices}</td>
      <td><button type="button" class="btn-secondary admin-save">Сохранить</button></td>
    </tr>`;
  }).join('') || '<tr><td colspan="6" class="admin-empty">Аккаунтов нет</td></tr>';
}

function load(){
  return fetch('/api/admin/users', { credentials: 'same-origin' }).then(async r => {
    const d = await r.json();
    if(!r.ok){
      if(r.status === 403 && !(await fetchAccountUser())) return location.replace('login.html?next=admin.html');
      showMsg(d.error || 'Ошибка сервера.');
      return;
    }
    adminData = d;
    $('adminCard').hidden = false;
    render();
  });
}

$('adminSearch').addEventListener('input', render);
$('adminRows').addEventListener('click', e => {
  const btn = e.target.closest('.admin-save');
  if(!btn) return;
  const tr = btn.closest('tr');
  const email = tr.dataset.email, plan = tr.querySelector('.admin-plan').value;
  btn.disabled = true;
  fetch('/api/admin/plan', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, plan }) })
    .then(async r => {
      const d = await r.json();
      if(!r.ok) throw new Error(d.error || 'Ошибка сервера.');
      showMsg(`${email}: подписка ${d.quota.planName} с этого момента.`, true);
      return load();
    })
    .catch(err => showMsg(err.message))
    .finally(() => { btn.disabled = false; });
});

load();
