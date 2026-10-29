// Администратор (по указанию пользователя: пока без оплаты Pro и Team выдаются
// вручную). Доступ - только почтам из ADMIN_EMAILS (переменная окружения,
// через запятую; задаётся в Render → сервис → Environment).
//
//   GET  /api/admin/users                 - аккаунты, подписки, счётчики
//   POST /api/admin/plan { email, plan, months } - сменить подписку с этого
//                                           момента; платная - на months (1 или 3) месяцев по 30 дней
//   POST /api/admin/calcs { email, count, take } - выдать расчёты сверх подписки
//                                           (не сгорают, plans.js); take - забрать
//                                           из выданных (бонус и месячные не трогаются)
//   POST /api/admin/delete { email }      - удалить аккаунт (себя - нельзя)
//   POST /api/admin/block { email, reason } - заблокировать (себя - нельзя): вход и
//                                           расчёты запрещены, входы на всех устройствах завершаются
//   POST /api/admin/unblock { email }     - разблокировать
//   POST /api/admin/verify { email }      - подтвердить почту вручную (код не
//                                           дошёл): аккаунт подтверждён, бонус за
//                                           регистрацию - без лимита по IP
//   POST /api/admin/login-code { email, skip } - вход без кода из письма (только
//                                           пароль) для этого пользователя: вкл/выкл
//   GET  /api/admin/stats                 - статистика (stats.js)
//   GET  /api/admin/requests              - заявки на внутренние стандарты (standards.js)
//   /api/admin/mail/...                   - почта поддержки (support-mail.js)
//   GET  /api/admin/reports               - сообщения об ошибках (feedback.js)
//                                           (Pro и Team - первыми с пометкой priority, дальше новые сверху)
//   POST /api/admin/reports/delete { id } - удалить сообщение об ошибке
const express = require('express');
const store = require('./store');
const { PLANS, PERIOD_MS, PLAN_TERMS, WELCOME_CALCS, planOf, quotaInfo, syncUser } = require('./plans');
// Приоритетное обслуживание (Pro и Team): такие заявки и сообщения - первыми,
// внутри групп - новые сверху.
const withPriority = list => list.map(r => ({ ...r, priority: !!(PLANS[r.plan] && PLANS[r.plan].prioritySupport) }))
  .reverse().sort((a, b) => b.priority - a.priority);
const { isAdmin } = require('./routes');
const stats = require('./stats');

const router = express.Router();
router.use((req, res, next) => {
  if (!isAdmin(req.user)) return res.status(403).json({ error: 'Нет доступа.' });
  next();
});

// Срок текущей платной подписки, мес. (для списка срока в админке): записан
// при выдаче (planMonths), если не записан - по датам начала и окончания.
function planMonthsOf(u) {
  if (u.plan === 'free') return null;
  if (PLAN_TERMS.includes(u.planMonths)) return u.planMonths;
  const m = Math.round((u.planUntil - u.planSince) / PERIOD_MS);
  return PLAN_TERMS.includes(m) ? m : PLAN_TERMS[0];
}

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
      autoRenew: !!(u.autoRenew && u.autoRenew.on),
      planMonths: planMonthsOf(u),
      lastCalcAt: u.lastCalcAt ? new Date(u.lastCalcAt).toISOString() : null,
      lastSeen: sessions.length ? new Date(sessions[0].lastSeen || sessions[0].createdAt).toISOString() : null,
      self: u.id === req.user.id,
      blocked: u.blocked ? { at: new Date(u.blocked.at).toISOString(), reason: u.blocked.reason || '' } : null,
      skipLoginCode: !!u.skipLoginCode,
      // Возврат денег, который сайт не снял сам (payments.js, handleRefund) -
      // пометка до следующего сохранения подписки здесь.
      refundNote: u.refundNote || null,
    };
  });
  res.json({ users, plans: Object.keys(PLANS).map(id => ({ id, name: PLANS[id].name })), terms: PLAN_TERMS });
});

router.post('/plan', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const plan = String(req.body.plan || '');
  const user = store.findUserByEmail(email);
  if (!user) return res.status(404).json({ error: 'Аккаунт не найден.' });
  if (!PLANS[plan]) return res.status(400).json({ error: 'Нет такой подписки.' });
  const months = Number(req.body.months);
  if (plan !== 'free' && !PLAN_TERMS.includes(months)) return res.status(400).json({ error: 'Выберите срок подписки.' });
  // Новая подписка: месяц и счётчик - с этого момента, платная - на срок
  // months. Устройств больше, чем разрешает новая подписка, - выход на самых
  // давних.
  const now = Date.now();
  const planUntil = plan === 'free' ? null : now + months * PERIOD_MS;
  // planMonths - срок подключения (сумма автопродления, auto-renew.js).
  store.updateUser(user, { plan, planSince: now, planUntil, periodStart: now, used: 0, planMonths: plan === 'free' ? null : months, refundNote: null });
  if (syncUser(user, now)) store.updateUser(user); // пробная - автопродление выключается
  store.listUserSessions(user.id).slice(planOf(user).devices).forEach(s => store.deleteSessionById(user.id, s.id));
  res.json({ ok: true, quota: quotaInfo(user, now) });
});

const MAX_GRANT = 100000;   // за один раз
const MAX_EXTRA = 1000000;  // всего у аккаунта
router.post('/calcs', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const user = store.findUserByEmail(email);
  if (!user) return res.status(404).json({ error: 'Аккаунт не найден.' });
  const count = Number(req.body.count);
  if (!Number.isInteger(count) || count < 1 || count > MAX_GRANT) return res.status(400).json({ error: `Укажите число расчётов от 1 до ${MAX_GRANT.toLocaleString('ru-RU')}.` });
  const now = Date.now();
  if (syncUser(user, now)) store.updateUser(user);
  if (req.body.take === true) {
    // Забрать - не больше, чем осталось выданных; «выдано» уменьшается на столько же.
    if (user.extraLeft <= 0) return res.status(400).json({ error: 'Выданных расчётов у аккаунта нет.' });
    const taken = Math.min(count, user.extraLeft);
    store.updateUser(user, { extraLeft: user.extraLeft - taken, extraTotal: Math.max(user.extraLeft - taken, (user.extraTotal || 0) - taken) });
    return res.json({ ok: true, taken, quota: quotaInfo(user, now) });
  }
  const left = user.extraLeft + count;
  if (left > MAX_EXTRA) return res.status(400).json({ error: `Выданных расчётов у аккаунта может быть не больше ${MAX_EXTRA.toLocaleString('ru-RU')}.` });
  store.updateUser(user, { extraLeft: left, extraTotal: left });
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

// Ручное подтверждение почты и вход без кода (по указанию пользователя: если
// письма с кодами на адрес не доходят, администратор пропускает человека
// сам, убедившись, что это он - например, по переписке в поддержке).
router.post('/verify', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const user = store.findUserByEmail(email);
  if (!user) return res.status(404).json({ error: 'Аккаунт не найден.' });
  if (user.verified) return res.status(400).json({ error: 'Почта уже подтверждена.' });
  const patch = { verified: true };
  // Бонус за регистрацию - как при подтверждении кодом, но без лимита по IP
  // (решение администратора).
  if (!Number.isInteger(user.welcomeTotal)) Object.assign(patch, { welcomeTotal: WELCOME_CALCS, welcomeLeft: WELCOME_CALCS });
  store.updateUser(user, patch);
  stats.recordRegistration(Date.now());
  console.log(`[админ] ${req.user.email} подтвердил почту ${email} вручную`);
  res.json({ ok: true });
});

router.post('/login-code', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const user = store.findUserByEmail(email);
  if (!user) return res.status(404).json({ error: 'Аккаунт не найден.' });
  const skip = req.body.skip === true;
  store.updateUser(user, { skipLoginCode: skip });
  console.log(`[админ] ${req.user.email}: вход ${skip ? 'без кода' : 'с кодом'} для ${email}`);
  res.json({ ok: true });
});

router.use('/mail', require('./support-mail').router);

router.get('/requests', (req, res) => {
  res.json({ requests: withPriority(store.listRequests()) });
});

router.get('/reports', (req, res) => {
  res.json({ reports: withPriority(store.listReports()) });
});

router.post('/reports/delete', (req, res) => {
  if (!store.deleteReport(Number(req.body.id))) return res.status(404).json({ error: 'Сообщение не найдено (возможно, уже удалено).' });
  res.json({ ok: true });
});

router.get('/stats', (req, res) => {
  res.json(stats.summary(Date.now(), 30));
});

module.exports = router;
