// Подписки и лимиты расчётов (по указанию пользователя). Пока без оплаты:
// платные подписки выдаёт администратор вручную (admin.html).
//
//   Пробная (id free) - 5 расчётов в месяц + 20 за регистрацию (один раз, не
//          сгорают, тратятся, когда кончились месячные), 1 устройство, бесплатно;
//   Base - 20 расчётов в месяц, 1 устройство, 5 000 ₽ в месяц;
//   Pro  - 150 расчётов в месяц, 1 устройство, 10 000 ₽ в месяц;
//   Team - 2500 расчётов в месяц на аккаунт, 4 устройства, 30 000 ₽ в месяц.
// Расчёт - каждое успешное нажатие «Рассчитать». Месяц считается от даты
// подключения подписки (у пробной - от регистрации); неиспользованные расчёты
// месяца не переносятся. customStandards - можно прислать заявку на
// внутренний стандарт своего завода (standards.js; по указанию пользователя -
// во всех подписках, кроме пробной). id пробной - прежний «free» (так он записан у
// существующих аккаунтов). Порядок ключей - порядок подписок на сайте.
const PLANS = {
  free: { name: 'Пробная', monthly: 5, devices: 1, price: null, customStandards: false },
  base: { name: 'Base', monthly: 20, devices: 1, price: 5000, customStandards: true },
  pro:  { name: 'Pro',  monthly: 150, devices: 1, price: 10000, customStandards: true },
  team: { name: 'Team', monthly: 2500, devices: 4, price: 30000, customStandards: true },
};
const WELCOME_CALCS = 20;
// Следующая подписка (для предложения «Больше в ...»): по порядку PLANS.
function nextPlan(id) {
  const ids = Object.keys(PLANS);
  const i = ids.indexOf(id);
  return i >= 0 && i < ids.length - 1 ? ids[i + 1] : null;
}

function planOf(user) {
  return PLANS[user.plan] || PLANS.free;
}

// Дата anchor + n месяцев (число дня - то же, а если в месяце его нет -
// последний день месяца: 31 января + 1 месяц = 28/29 февраля).
function addMonths(ts, n) {
  const d = new Date(ts);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  const dim = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, dim));
  return d.getTime();
}

// Текущий месяц подписки: [start, end).
function periodBounds(anchor, now) {
  const a = new Date(anchor), t = new Date(now);
  let k = (t.getUTCFullYear() - a.getUTCFullYear()) * 12 + (t.getUTCMonth() - a.getUTCMonth());
  if (k < 0) k = 0;
  while (k > 0 && addMonths(anchor, k) > now) k--;
  while (addMonths(anchor, k + 1) <= now) k++;
  return { start: addMonths(anchor, k), end: addMonths(anchor, k + 1) };
}

// Поля подписки у пользователя (у старых записей - значения по умолчанию)
// и сброс счётчика, если начался новый месяц. Возвращает true, если что-то
// поменялось (нужно сохранить).
function syncUser(user, now) {
  let changed = false;
  if (!PLANS[user.plan]) { user.plan = 'free'; changed = true; }
  if (!Number.isFinite(user.planSince)) { user.planSince = Date.parse(user.createdAt) || now; changed = true; }
  if (!Number.isInteger(user.welcomeLeft)) { user.welcomeLeft = WELCOME_CALCS; changed = true; }
  if (!Number.isInteger(user.used)) { user.used = 0; changed = true; }
  const { start } = periodBounds(user.planSince, now);
  if (user.periodStart !== start) { user.periodStart = start; user.used = 0; changed = true; }
  return changed;
}

function quotaInfo(user, now) {
  const p = planOf(user);
  const { start, end } = periodBounds(user.planSince, now);
  const monthlyLeft = Math.max(0, p.monthly - user.used);
  return {
    plan: user.plan, planName: p.name, devices: p.devices,
    monthly: p.monthly, used: user.used, monthlyLeft,
    welcomeLeft: user.welcomeLeft, welcomeTotal: WELCOME_CALCS, left: monthlyLeft + user.welcomeLeft,
    periodStart: new Date(start).toISOString(), periodEnd: new Date(end).toISOString(),
  };
}

// Списать один расчёт: сначала месячные, потом бонус за регистрацию.
// false - расчётов не осталось.
function consume(user) {
  if (user.used < planOf(user).monthly) { user.used += 1; return true; }
  if (user.welcomeLeft > 0) { user.welcomeLeft -= 1; return true; }
  return false;
}

function publicPlans() {
  return Object.keys(PLANS).map(id => ({ id, ...PLANS[id], welcome: id === 'free' ? WELCOME_CALCS : 0 }));
}

module.exports = { PLANS, WELCOME_CALCS, planOf, periodBounds, syncUser, quotaInfo, consume, publicPlans, nextPlan };
