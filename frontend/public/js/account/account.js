// Страница аккаунта (account.html): почта, подписка, дата регистрации,
// выход. Не вошли - на страницу входа.
const PLAN_NAMES = { free: 'Бесплатная' };

fetchAccountUser().then(user => {
  if(!user){ location.replace('login.html?next=account.html'); return; }
  document.getElementById('accountEmail').textContent = user.email;
  document.getElementById('accountPlan').textContent = PLAN_NAMES[user.plan] || user.plan;
  document.getElementById('accountCreated').textContent = new Date(user.createdAt).toLocaleDateString('ru-RU');
  document.getElementById('accountCard').hidden = false;
});

document.getElementById('accountLogout').addEventListener('click', () => {
  fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
    .finally(() => { location.href = 'index.html'; });
});
