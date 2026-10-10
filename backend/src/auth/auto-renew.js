// Автопродление платной подписки (по указанию пользователя). Всё готово, но
// включается только переменной окружения AUTO_RENEW_ENABLED=1 - когда на
// сайте подключат онлайн-оплату (сохранение карты и повторные списания делает
// платёжный сервис, сам сайт деньги не списывает). Пока выключено -
// пользователю ничего не показывается, маршруты отвечают 404, письма не
// отправляются.
//
// Правила (п. 6.6-6.9 Пользовательского соглашения):
//   - включить - только с отдельным согласием пользователя (незаполненная
//     галочка в разделе «Подписка» окна «Настройки»); согласие записывается:
//     дата, IP, версия документов (LEGAL_VERSION);
//   - отключить - в любой момент одной кнопкой там же;
//   - подписка закончилась (стала пробной) - автопродление выключается
//     (syncUser в plans.js, выдача пробной в админке).
// Сумма продления - цена подписки × срок последнего подключения (planMonths,
// записывает админка); само продление (списание и новый срок) подключается
// вместе с оплатой.
const express = require('express');
const store = require('./store');
const { PLANS, syncUser } = require('./plans');
const { LEGAL_VERSION } = require('./legal');

const enabled = () => process.env.AUTO_RENEW_ENABLED === '1';

// Сумма продления, ₽ (цена в месяц × срок последнего подключения).
function renewAmount(user) {
  const p = PLANS[user.plan];
  if (!p || !p.price) return 0;
  return p.price * (Number.isInteger(user.planMonths) && user.planMonths > 0 ? user.planMonths : 1);
}

// Состояние для страницы (publicUser): null - функция выключена.
function publicAutoRenew(user) {
  if (!enabled()) return null;
  const ar = user.autoRenew || {};
  return {
    paid: user.plan !== 'free',
    on: !!ar.on && user.plan !== 'free',
    since: ar.on && ar.since ? new Date(ar.since).toISOString() : null,
    amount: renewAmount(user),
  };
}

const router = express.Router();
router.use((req, res, next) => {
  if (!enabled()) return res.status(404).json({ error: 'Автопродление пока недоступно.' });
  if (!req.user) return res.status(401).json({ error: 'Войдите в аккаунт.' });
  next();
});
// { on: true, consent: true } - включить (только с согласием), { on: false } - отключить.
router.post('/', (req, res) => {
  const user = req.user, now = Date.now();
  if (syncUser(user, now)) store.updateUser(user);
  if (req.body.on === true) {
    if (user.plan === 'free') return res.status(400).json({ error: 'Автопродление доступно только для платной подписки.' });
    if (req.body.consent !== true) return res.status(400).json({ error: 'Отметьте согласие на автоматическое продление.' });
    store.updateUser(user, { autoRenew: { on: true, since: now, ip: req.ip, version: LEGAL_VERSION } });
  } else {
    store.updateUser(user, { autoRenew: { ...(user.autoRenew || {}), on: false, offAt: now, offReason: 'отключил пользователь' } });
  }
  res.json({ ok: true, autoRenew: publicAutoRenew(user) });
});

module.exports = { router, publicAutoRenew, renewAmount };
