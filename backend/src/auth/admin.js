// Администратор (по указанию пользователя: пока без оплаты Pro и Team выдаются
// вручную). Доступ - только почтам из ADMIN_EMAILS (переменная окружения,
// через запятую; задаётся в Render → сервис → Environment).
//
//   GET  /api/admin/users                 - аккаунты, подписки, счётчики
//   POST /api/admin/plan { email, plan }  - сменить подписку (месяц - с этого момента)
const express = require('express');
const store = require('./store');
const { PLANS, planOf, quotaInfo, syncUser } = require('./plans');
const { isAdmin } = require('./routes');

const router = express.Router();
router.use((req, res, next) => {
  if (!isAdmin(req.user)) return res.status(403).json({ error: 'Нет доступа.' });
  next();
});

router.get('/users', (req, res) => {
  const now = Date.now();
  const users = store.listUsers().map(u => {
    if (syncUser(u, now)) store.updateUser(u);
    return {
      email: u.email, verified: !!u.verified, createdAt: u.createdAt,
      planSince: new Date(u.planSince).toISOString(),
      quota: quotaInfo(u, now), devices: store.listUserSessions(u.id).length,
    };
  });
  res.json({ users, plans: Object.keys(PLANS).map(id => ({ id, name: PLANS[id].name })) });
});

router.post('/plan', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const plan = String(req.body.plan || '');
  const user = store.findUserByEmail(email);
  if (!user) return res.status(404).json({ error: 'Аккаунт не найден.' });
  if (!PLANS[plan]) return res.status(400).json({ error: 'Нет такой подписки.' });
  // Новая подписка: месяц и счётчик - с этого момента. Устройств больше,
  // чем разрешает новая подписка, - выход на самых давних.
  const now = Date.now();
  store.updateUser(user, { plan, planSince: now, periodStart: now, used: 0 });
  store.listUserSessions(user.id).slice(planOf(user).devices).forEach(s => store.deleteSessionById(user.id, s.id));
  res.json({ ok: true, quota: quotaInfo(user, now) });
});

module.exports = router;
