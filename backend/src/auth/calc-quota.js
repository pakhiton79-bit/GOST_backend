// Лимит расчётов (по указанию пользователя): считать можно только после
// входа; каждое успешное «Рассчитать» списывает один расчёт (сначала
// месячные, потом бонус за регистрацию). Ответ с ошибкой расчёта (не
// заполнены поля и т.п.) не списывается. В ответ расчёта добавляется
// quota - сколько осталось.
const store = require('./store');
const { syncUser, quotaInfo, consume } = require('./plans');
const stats = require('./stats');

function fmtDate(iso) {
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()}`;
}

function calcQuota(req, res, next) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ error: 'Войдите в аккаунт, чтобы выполнить расчёт.', errorLink: { href: 'login.html', text: 'Войти' } });
  }
  const now = Date.now();
  if (syncUser(user, now)) store.updateUser(user);
  const q = quotaInfo(user, now);
  if (q.left <= 0) {
    return res.status(402).json({
      error: `Расчёты по подписке ${q.planName} на этот месяц закончились. Новые будут ${fmtDate(q.periodEnd)}.`,
      errorLink: { href: 'plans.html', text: 'Подписки' },
    });
  }
  const type = req.params.type; // у обработчика расчёта req.params уже свои
  const json = res.json.bind(res);
  res.json = body => {
    if (body && typeof body === 'object' && !body.error && consume(user)) {
      const t = Date.now();
      store.updateUser(user, { totalCalcs: (user.totalCalcs || 0) + 1, lastCalcAt: t });
      stats.recordCalc(type, user.id, t);
      body.quota = quotaInfo(user, t);
    }
    return json(body);
  };
  next();
}

module.exports = { calcQuota };
