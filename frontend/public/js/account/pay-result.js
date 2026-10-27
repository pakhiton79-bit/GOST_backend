// Страница после оплаты (pay-success.html): платёжный сервис возвращает сюда с
// InvId. Подписка подключается по уведомлению платёжного сервиса, оно
// может прийти чуть позже - состояние счёта проверяется несколько раз.
(function(){
  const inv = new URLSearchParams(location.search).get('InvId');
  const title = document.getElementById('payTitle'), text = document.getElementById('payText');
  const done = (h, t) => { title.textContent = h; text.textContent = t; };
  if(!inv) return done('Оплата', 'Номер счёта не найден. Состояние подписки - на странице аккаунта.');
  let tries = 0;
  const check = () => fetch('/api/pay/status?inv=' + encodeURIComponent(inv), { credentials: 'same-origin' })
    .then(r => r.json().then(d => ({ ok: r.ok, status: r.status, d })))
    .then(({ ok, status, d }) => {
      if(status === 401) return done('Оплата', 'Войдите в аккаунт, чтобы увидеть состояние подписки.');
      if(!ok) return done('Оплата', d.error || 'Счёт не найден.');
      if(d.status === 'paid') return done('Оплата прошла', `Подписка ${d.plan} на ${d.months === 1 ? '1 месяц' : d.months + ' месяца'} оплачена. Чек придёт на почту.`);
      if(++tries < 20) return setTimeout(check, 3000);
      done('Оплата обрабатывается', 'Подтверждение оплаты ещё не пришло. Подписка подключится сама, как только оно придёт. Проверьте страницу аккаунта чуть позже.');
    })
    .catch(() => { if(++tries < 20) setTimeout(check, 3000); else done('Оплата', 'Нет связи с сервером. Состояние подписки - на странице аккаунта.'); });
  check();
})();
