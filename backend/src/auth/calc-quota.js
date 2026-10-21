// Лимит расчётов (по указанию пользователя): считать можно только после
// входа; каждое успешное «Рассчитать» списывает один расчёт (сначала
// месячные, потом бонус за регистрацию). Ответ с ошибкой расчёта (не
// заполнены поля и т.п.) не списывается. В ответ расчёта добавляется
// quota - сколько осталось.
const store = require('./store');
const { PLANS, WELCOME_CALCS, WELCOME_HOURS, syncUser, quotaInfo, consume, nextPlan } = require('./plans');
const stats = require('./stats');
const { needsReconsent, LEGAL_VERSION } = require('./legal');

function fmtDate(iso) {
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')}.${d.getUTCFullYear()}`;
}

function calcQuota(req, res, next) {
  const user = req.user;
  if (!user) {
    // limit - для окна на странице (common-account.js, showLimitDialog).
    return res.status(401).json({ error: 'Войдите в аккаунт, чтобы выполнить расчёт.', errorLink: { href: 'login.html', text: 'Войти' },
      limit: { kind: 'guest', welcome: WELCOME_CALCS, welcomeHours: WELCOME_HOURS } });
  }
  // Документы обновлены и ещё не приняты - сначала принять (окно на сайте).
  if (needsReconsent(user)) {
    return res.status(409).json({ error: 'Мы обновили документы. Примите их, чтобы продолжить.', limit: { kind: 'legal', version: LEGAL_VERSION } });
  }
  const now = Date.now();
  if (syncUser(user, now)) store.updateUser(user);
  const q = quotaInfo(user, now);
  if (q.left <= 0) {
    // Есть подписка больше - предложить её (по указанию пользователя).
    const next = PLANS[nextPlan(q.plan)];
    return res.status(402).json({
      error: q.monthly ? `Расчёты на этот месяц закончились, новые будут ${fmtDate(q.periodEnd)}.` : (!q.welcomeTotal ? 'Пробные расчёты не начислены.' : q.welcomeExpired ? `Пробный доступ закончился: он действует ${WELCOME_HOURS} часов с первого расчёта.` : 'Пробные расчёты закончились.'),
      errorLink: next ? { href: 'plans.html', text: `Больше в ${next.name}` } : undefined,
      limit: {
        kind: q.monthly ? 'month' : 'trial', plan: q.plan, planName: q.planName, monthly: q.monthly,
        periodEnd: q.periodEnd, welcome: q.welcomeTotal, welcomeHours: WELCOME_HOURS, welcomeExpired: q.welcomeExpired,
        next: next ? { name: next.name, monthly: next.monthly, price: next.price } : null,
      },
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
