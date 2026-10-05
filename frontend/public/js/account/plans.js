// Страница подписок (plans.html): три подписки - расчёты, устройства, цена;
// текущая подписка вошедшего отмечена. Оплаты пока нет (Pro и Team
// подключает администратор).
const PLAN_DEVICES = n => n === 1 ? '1 устройство' : n + ' устройства';

function planCard(p, current){
  const price = p.price ? `${p.price.toLocaleString('ru-RU')} ₽ <small>в месяц</small>` : (p.id === 'free' ? 'Бесплатно' : 'Цена уточняется');
  const features = [
    `${p.monthly.toLocaleString('ru-RU')} расчётов в месяц`,
    ...(p.welcome ? [`+${p.welcome} расчётов при регистрации`] : []),
    PLAN_DEVICES(p.devices),
  ];
  const btn = current ? '<button type="button" class="btn-secondary plan-btn" disabled>Ваша подписка</button>'
    : p.id === 'free' ? '' : '<button type="button" class="plan-btn" disabled>Скоро</button>';
  return `<div class="plan-card${current ? ' plan-card-current' : ''}${p.id === 'pro' ? ' plan-card-accent' : ''}">
      <div class="plan-name">${p.name}</div>
      <div class="plan-price">${price}</div>
      <ul class="plan-features">${features.map(f => `<li>${f}</li>`).join('')}</ul>
      ${btn}
    </div>`;
}

Promise.all([fetch('/api/plans').then(r => r.json()), fetchAccountUser()]).then(([d, user]) => {
  const current = user ? user.quota.plan : null;
  document.getElementById('plansGrid').innerHTML = d.plans.map(p => planCard(p, p.id === current)).join('');
});
