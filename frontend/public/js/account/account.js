// Страница аккаунта (account.html): почта и подписка, сколько расчётов
// осталось, устройства (выйти на любом другом), выход. Не вошли - на
// страницу входа.
const $ = id => document.getElementById(id);
const fmtDate = iso => new Date(iso).toLocaleDateString('ru-RU');
const fmtDateTime = iso => fmtDate(iso) + ' ' + new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

function renderQuota(q){
  $('accountPlan').textContent = q.planName;
  $('quotaLeft').textContent = q.left;
  $('quotaOf').textContent = q.welcomeLeft > 0 ? ' расчётов осталось' : ` из ${q.monthly} осталось`;
  $('quotaBar').style.width = Math.max(0, Math.min(100, q.monthlyLeft / q.monthly * 100)) + '%';
  $('quotaMonthly').textContent = `${q.monthlyLeft} из ${q.monthly}`;
  $('quotaWelcomeRow').hidden = !(q.welcomeLeft > 0);
  $('quotaWelcome').textContent = q.welcomeLeft;
  $('quotaReset').textContent = fmtDate(q.periodEnd);
}

function renderDevices(list, limit, planName){
  $('devicesNote').textContent = `По подписке ${planName} можно быть в аккаунте на ${limit === 1 ? '1 устройстве' : limit + ' устройствах'}. Сейчас: ${list.length}.`;
  const box = $('devicesList');
  box.innerHTML = '';
  list.forEach(dev => {
    const row = document.createElement('div');
    row.className = 'auth-device';
    row.innerHTML = '<div><div class="auth-device-name"></div><div class="auth-device-seen"></div></div>';
    row.querySelector('.auth-device-name').textContent = dev.label + (dev.current ? ' (это устройство)' : '');
    row.querySelector('.auth-device-seen').textContent = 'Последний раз: ' + fmtDateTime(dev.lastSeen);
    if(!dev.current){
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'btn-secondary'; b.textContent = 'Выйти';
      b.addEventListener('click', () => {
        b.disabled = true;
        fetch('/api/auth/devices/logout', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: dev.id }) })
          .then(r => r.json()).then(d => { if(d.devices) renderDevices(d.devices, limit, planName); else b.disabled = false; })
          .catch(() => { b.disabled = false; });
      });
      row.appendChild(b);
    }
    box.appendChild(row);
  });
}

fetchAccountUser().then(user => {
  if(!user){ location.replace('login.html?next=account.html'); return; }
  $('accountEmail').textContent = user.email;
  $('accountCreated').textContent = fmtDate(user.createdAt);
  $('accountAdmin').hidden = !user.isAdmin;
  renderQuota(user.quota);
  fetch('/api/auth/devices', { credentials: 'same-origin' }).then(r => r.json())
    .then(d => renderDevices(d.devices || [], user.quota.devices, user.quota.planName));
  $('accountBox').hidden = false;
});

$('accountLogout').addEventListener('click', () => {
  fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
    .finally(() => { location.href = 'index.html'; });
});
