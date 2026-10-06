// Администратор (по указанию пользователя: пока без оплаты Pro и Team выдаются
// вручную). Доступ - только почтам из ADMIN_EMAILS (переменная окружения,
// через запятую; задаётся в Render → сервис → Environment).
//
//   GET  /api/admin/users                 - аккаунты, подписки, счётчики
//   POST /api/admin/plan { email, plan }  - сменить подписку (месяц - с этого момента)
//   POST /api/admin/delete { email }      - удалить аккаунт (себя - нельзя)
//   POST /api/admin/block { email, reason } - заблокировать (себя - нельзя): вход и
//                                           расчёты запрещены, входы на всех устройствах завершаются
//   POST /api/admin/unblock { email }     - разблокировать
//   GET  /api/admin/stats                 - статистика (stats.js)
//   GET  /api/admin/requests              - заявки на внутренние стандарты (standards.js), новые сверху
const express = require('express');
const store = require('./store');
const { PLANS, planOf, quotaInfo, syncUser } = require('./plans');
const { isAdmin } = require('./routes');
const stats = require('./stats');

const router = express.Router();
router.use((req, res, next) => {
  if (!isAdmin(req.user)) return res.status(403).json({ error: 'Нет доступа.' });
  next();
});

router.get('/users', (req, res) => {
  const now = Date.now();
  const users = store.listUsers().map(u => {
    if (syncUser(u, now)) store.updateUser(u);
    const sessions = store.listUserSessions(u.id);
    return {
      email: u.email, verified: !!u.verified, createdAt: u.createdAt,
      planSince: new Date(u.planSince).toISOString(),
      quota: quotaInfo(u, now), devices: sessions.length,
      totalCalcs: u.totalCalcs || 0,
      marketing: !!(u.consents && u.consents.marketing),
      lastCalcAt: u.lastCalcAt ? new Date(u.lastCalcAt).toISOString() : null,
      lastSeen: sessions.length ? new Date(sessions[0].lastSeen || sessions[0].createdAt).toISOString() : null,
      self: u.id === req.user.id,
      blocked: u.blocked ? { at: new Date(u.blocked.at).toISOString(), reason: u.blocked.reason || '' } : null,
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

router.post('/delete', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const user = store.findUserByEmail(email);
  if (!user) return res.status(404).json({ error: 'Аккаунт не найден.' });
  if (user.id === req.user.id) return res.status(400).json({ error: 'Свой аккаунт удалить нельзя.' });
  store.deleteUser(user);
  res.json({ ok: true });
});

// Блокировка (по указанию пользователя - «забанить / разбанить»). Аккаунт и
// его данные остаются (Пользовательское соглашение, раздел 10), но войти и
// считать нельзя; причина показывается пользователю при попытке входа.
router.post('/block', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const user = store.findUserByEmail(email);
  if (!user) return res.status(404).json({ error: 'Аккаунт не найден.' });
  if (user.id === req.user.id) return res.status(400).json({ error: 'Свой аккаунт заблокировать нельзя.' });
  const reason = String(req.body.reason || '').trim().slice(0, 300);
  store.updateUser(user, { blocked: { at: Date.now(), reason } });
  store.deleteUserSessions(user.id);
  res.json({ ok: true });
});

router.post('/unblock', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const user = store.findUserByEmail(email);
  if (!user) return res.status(404).json({ error: 'Аккаунт не найден.' });
  store.updateUser(user, { blocked: null });
  res.json({ ok: true });
});

router.get('/requests', (req, res) => {
  res.json({ requests: store.listRequests().reverse() });
});

router.get('/stats', (req, res) => {
  res.json(stats.summary(Date.now(), 30));
});

module.exports = router;
